"""
阿里云 DashScope TTS 流式播放服务
基于 FastAPI + WebSocket 实现实时语音合成
"""
import os
import sys
import queue
import asyncio
import hashlib
import requests
import wave
import base64
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import dashscope
from dotenv import load_dotenv
import re

# 解决 Windows 控制台中文乱码问题
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')


# 加载环境变量
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# 配置阿里云 API
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    print("错误: 未找到 OPENAI_API_KEY 环境变量")
    print(f"请在 {env_path} 文件中配置 OPENAI_API_KEY")
    sys.exit(1)

dashscope.api_key = OPENAI_API_KEY
dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'

# 创建 FastAPI 应用
app = FastAPI(title="TTS Streaming Service")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def split_text(text: str, max_length: int = 500) -> list:
    """
    智能文本分块，按句子分割，保持语义完整
    
    Args:
        text: 要分割的文本
        max_length: 每块最大字符数
        
    Returns:
        文本块列表
    """
    chunks = []
    current_chunk = ""
    
    # 按句子分割
    sentences = text.replace('。', '。\n').replace('！', '！\n').replace('？', '？\n').split('\n')
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        if len(current_chunk) + len(sentence) <= max_length:
            current_chunk += sentence
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = sentence
    
    if current_chunk:
        chunks.append(current_chunk)
    
    # 如果没有分块成功，直接截断
    return chunks if chunks else [text[:max_length]]


@app.get("/")
async def root():
    """健康检查接口"""
    return {
        "status": "ok",
        "service": "TTS Streaming Service",
        "api_configured": bool(OPENAI_API_KEY)
    }


async def save_audio_file(pcm_data: bytearray, text: str, voice: str, language: str):
    """
    将 PCM 数据保存为 WAV 文件 (Stream-and-Save 策略)
    
    参数:
        pcm_data: 原始 PCM 音频数据
        text: 原始文本
        voice: 音色
        language: 语言
    """
    try:
        # 生成哈希 (与前端保持一致)
        hash_input = f"{text}_{voice}_{language}_1.0"
        audio_hash = hashlib.md5(hash_input.encode()).hexdigest()
        
        # 文件路径
        base_dir = Path(__file__).parent.parent
        audio_dir = base_dir / 'public' / 'audio'
        audio_dir.mkdir(parents=True, exist_ok=True)
        
        file_name = f"{audio_hash}.wav"
        file_path = audio_dir / file_name
        
        # 检查文件是否已存在
        if file_path.exists():
            print(f"[Stream-Save] 文件已存在,跳过: {file_name}")
            return
        
        # 写入 WAV 文件
        with wave.open(str(file_path), 'wb') as wav_file:
            wav_file.setnchannels(1)  # 单声道
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(24000)  # 阿里云 TTS 采样率
            wav_file.writeframes(bytes(pcm_data))
        
        print(f"[Stream-Save] 保存成功: {file_path}, 大小: {len(pcm_data)} 字节")
        
        # 保存元数据到数据库
        port = os.getenv('PORT', '3001')
        save_url = f"http://localhost:{port}/api/audio/save"
        metadata = {
            "hash": audio_hash,
            "text": text,
            "voice": voice,
            "language": language,
            "fileName": file_name,
            "filePath": f"/audio/{file_name}",
            "fileSize": len(pcm_data),
            "duration": len(pcm_data) / (24000 * 2)  # 计算时长 (秒)
        }
        
        try:
            save_response = requests.post(save_url, json=metadata, timeout=5)
            if save_response.status_code == 200:
                print(f"[Stream-Save] 元数据已保存")
            else:
                print(f"[Stream-Save] 保存元数据失败: {save_response.status_code}")
        except Exception as e:
            print(f"[Stream-Save] 保存元数据异常: {e}")
            
    except Exception as e:
        print(f"[Stream-Save] 保存文件失败: {e}")


@app.websocket("/ws/tts")
async def websocket_tts(websocket: WebSocket):
    """
    WebSocket TTS 流式播放接口 (支持连接复用)
    
    接收 JSON 格式:
    {
        "requestId": "唯一请求ID",
        "text": "要合成的文本",
        "voice": "Cherry",  // 可选,默认 Cherry
        "language": "Chinese"  // 可选,默认 Chinese
    }
    
    或心跳消息:
    {
        "type": "ping"
    }
    
    发送 JSON 格式:
    {
        "type": "audio",
        "data": "base64_pcm_data",
        "sample_rate": 24000,
        "requestId": "对应的请求ID"
    }
    或
    {
        "type": "done",
        "requestId": "对应的请求ID"
    }
    或
    {
        "type": "error",
        "message": "错误信息",
        "requestId": "对应的请求ID"
    }
    或
    {
        "type": "pong"  // 心跳响应
    }
    """
    import time
    
    t_ws_accept = time.time()
    await websocket.accept()
    print(f"[连接池] WebSocket 连接已建立,等待请求...")
    
    try:
        # 循环处理多个请求,保持连接活跃
        while True:
            try:
                # 接收客户端请求
                data = await websocket.receive_json()
                t_request_received = time.time()
                
                # 处理心跳消息
                if data.get('type') == 'ping':
                    await websocket.send_json({"type": "pong"})
                    continue
                
                text = data.get('text', '')
                voice = data.get('voice', 'Cherry')
                language = data.get('language', 'Chinese')
                request_id = data.get('requestId', '')  # 提取 requestId
                
                if not text:
                    await websocket.send_json({
                        "type": "error",
                        "message": "文本不能为空",
                        "requestId": request_id
                    })
                    continue  # 继续处理下一个请求,不关闭连接
                
                # 清理文本（移除 Markdown 标记等）
                text = text.replace('*', '').replace('#', '').strip()
                
                # 移除 Title: 或 标题： 前缀（支持多行模式）
                text = re.sub(r'(?m)^\s*(?:Title|标题)[:：]\s*', '', text)
                
                # 移除分隔线
                text = re.sub(r'(?m)^\s*[-]{3,}\s*$', '', text)
                
                text = text.strip()
                
                # 文本分块（最大 500 字符,避免超过 API 限制）
                chunks = split_text(text, max_length=500)
                text_to_process = chunks[0]  # 只处理第一块,快速开始播放
                
                print(f"\n{'='*60}")
                print(f"[性能打点] 收到 TTS 请求: 文本=\"{text_to_process[:30]}...\" 长度={len(text_to_process)}, 音色={voice}")
                print(f"[性能打点] WebSocket 接受耗时: {(t_request_received - t_ws_accept)*1000:.1f}ms")
                
                # 获取事件循环（后续多处需要使用）
                loop = asyncio.get_event_loop()
                
                # Stream-and-Save 策略: 判断是否需要缓存
                # 仅对短文本（不需要分块）进行缓存
                should_cache = len(chunks) == 1
                pcm_buffer = bytearray() if should_cache else None
                
                if should_cache:
                    print("[Stream-Save] 缓存策略: 启用 (短文本)")
                else:
                    print(f"[Stream-Save] 缓存策略: 禁用 (长文本 {len(chunks)}块)")
                
                # 使用队列在线程间传递数据
                audio_queue = queue.Queue()
                
                # 性能计时变量（线程间共享）
                perf_data = {
                    "t_api_start": 0,
                    "t_first_chunk": 0,
                    "t_api_done": 0,
                    "chunk_count": 0
                }
                
                def call_tts():
                    """在线程池中调用 TTS API"""
                    try:
                        perf_data["t_api_start"] = time.time()
                        
                        response = dashscope.MultiModalConversation.call(
                            model='qwen3-tts-flash',
                            text=text_to_process,
                            voice=voice,
                            language_type=language,
                            stream=True  # 关键：启用流式输出
                        )
                        
                        # 遍历流式响应
                        for chunk in response:
                            if hasattr(chunk, 'output') and chunk.output:
                                audio_data = chunk.output.get('audio')
                                if audio_data and 'data' in audio_data:
                                    # 记录首包时间
                                    if perf_data["t_first_chunk"] == 0:
                                        perf_data["t_first_chunk"] = time.time()
                                    
                                    perf_data["chunk_count"] += 1
                                    
                                    # 将音频数据放入队列
                                    audio_queue.put({
                                        "type": "audio",
                                        "data": audio_data['data'],  # Base64 编码的 PCM 数据
                                        "sample_rate": 24000  # 阿里云 TTS 采样率
                                    })
                        
                        perf_data["t_api_done"] = time.time()
                        
                        # 完成信号
                        audio_queue.put(None)
                        
                    except Exception as e:
                        print(f"TTS API 调用失败: {e}")
                        audio_queue.put({
                            "type": "error",
                            "message": f"TTS 服务错误: {str(e)}"
                        })
                        audio_queue.put(None)
                
                # 在线程池中执行 TTS 调用
                t_before_executor = time.time()
                loop.run_in_executor(None, call_tts)
                
                # 从队列读取并发送给客户端
                t_first_send = 0
                send_count = 0
                
                while True:
                    try:
                        # 非阻塞获取,避免死锁
                        msg = await asyncio.get_event_loop().run_in_executor(
                            None, 
                            lambda: audio_queue.get(timeout=0.1)
                        )
                        
                        if msg is None:
                            # 完成信号
                            break
                        
                        if t_first_send == 0:
                            t_first_send = time.time()
                        
                        send_count += 1
                        
                        # Stream-and-Save: 积累 PCM 数据用于保存
                        if should_cache and msg.get('type') == 'audio' and 'data' in msg:
                            try:
                                pcm_bytes = base64.b64decode(msg['data'])
                                pcm_buffer.extend(pcm_bytes)
                            except Exception as e:
                                print(f"[Stream-Save] 解码 PCM 数据失败: {e}")
                        
                        # 在消息中添加 requestId
                        if isinstance(msg, dict) and request_id:
                            msg['requestId'] = request_id
                        await websocket.send_json(msg)
                        
                    except queue.Empty:
                        # 队列为空,继续等待
                        await asyncio.sleep(0.01)
                        continue
                
                # 发送完成信号
                t_done = time.time()
                await websocket.send_json({
                    "type": "done",
                    "requestId": request_id  # 添加 requestId
                })
                
                # Stream-and-Save: 触发后台保存任务
                if should_cache and pcm_buffer and len(pcm_buffer) > 0:
                    print(f"[Stream-Save] 触发后台保存,数据大小: {len(pcm_buffer)} 字节")
                    asyncio.create_task(save_audio_file(pcm_buffer, text, voice, language))
                elif should_cache:
                    print(f"[Stream-Save] PCM 缓冲区为空,跳过保存")
                
                # 打印性能统计
                print(f"[性能打点] === 耗时统计 ===")
                print(f"[性能打点] 1. 请求预处理: {(t_before_executor - t_request_received)*1000:.1f}ms")
                if perf_data["t_first_chunk"] > 0:
                    print(f"[性能打点] 2. API首包延迟: {(perf_data['t_first_chunk'] - perf_data['t_api_start'])*1000:.1f}ms ⭐")
                    print(f"[性能打点] 3. API传输耗时: {(perf_data['t_api_done'] - perf_data['t_first_chunk'])*1000:.1f}ms ({perf_data['chunk_count']}个包)")
                if t_first_send > 0:
                    print(f"[性能打点] 4. 首次发送耗时: {(t_first_send - t_request_received)*1000:.1f}ms (用户感知延迟)")
                print(f"[性能打点] 5. 总耗时: {(t_done - t_request_received)*1000:.1f}ms")
                print(f"{'='*60}")
                
                # 继续循环,处理下一个请求
                
            except WebSocketDisconnect:
                print("[连接池] 客户端主动断开连接")
                break
            except Exception as e:
                print(f"[连接池] 处理请求时出错: {e}")
                # 发送错误消息但不关闭连接
                try:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e),
                        "requestId": data.get('requestId', '') if 'data' in locals() else ''
                    })
                except:
                    pass
                # 继续处理下一个请求
                
    except WebSocketDisconnect:
        print("[连接池] WebSocket 连接断开")
    except Exception as e:
        print(f"[连接池] WebSocket 错误: {e}")
    finally:
        print("[连接池] 清理连接资源")



if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("TTS 流式播放服务启动中...")
    print(f"API Key 配置: {'[已配置]' if OPENAI_API_KEY else '[未配置]'}")
    print("服务地址: http://localhost:8000")
    print("WebSocket: ws://localhost:8000/ws/tts")
    print("=" * 60)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
