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
                
                # 仅对短文本（不需要分块）进行后台缓存
                # 避免长文章占用过多空间且缓存命中率低
                if len(chunks) == 1:
                    print("[缓存策略] 短文本 (<=500字符),触发后台缓存任务")
                    # 关键修复：使用线程池执行缓存任务,避免同步API调用阻塞事件循环
                    loop.run_in_executor(None, lambda: cache_audio_sync(text, voice, language, chunks))
                else:
                    print(f"[缓存策略] 长文本 ({len(chunks)}块),仅流式播放,不缓存")
                
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


def cache_audio_sync(text: str, voice: str, language: str, chunks: list):
    """
    后台任务：获取完整音频 URL 并缓存（同步版本，在线程池中执行）
    """
    try:
        print(f"[后台缓存] 开始缓存任务")
        
        # 为每个文本块获取 URL 并缓存
        for idx, chunk_text in enumerate(chunks):
            print(f"[后台缓存] 处理分块 {idx + 1}/{len(chunks)}")
            
            # 生成哈希：确保与前端生成规则一致
            # 规则：text + voice + language + playbackRate(默认1.0)
            # 关键修复：如果只有一块，使用原始 cleaning text 生成哈希，以匹配前端逻辑
            # 前端并没有 split_text 逻辑，而是直接对 cleaned text 进行哈希
            if len(chunks) == 1:
                hash_text_input = text
            else:
                hash_text_input = chunk_text
                
            hash_input = f"{hash_text_input}_{voice}_{language}_1.0"
            audio_hash = hashlib.md5(hash_input.encode()).hexdigest()
            
            # 检查文件是否已存在 (直接检查文件系统，避免 HTTP 调用)
            base_dir = Path(__file__).parent.parent
            audio_dir = base_dir / 'public' / 'audio'
            file_name = f"{audio_hash}.wav"
            file_path = audio_dir / file_name

            if file_path.exists():
                print(f"[后台缓存] 文件已存在 (本地检查): {file_name}")
                continue
            
            # 调用非流式 API 获取 URL
            print(f"[后台缓存] 调用非流式 API 获取音频 URL...")
            try:
                response = dashscope.MultiModalConversation.call(
                    model='qwen3-tts-flash',
                    text=chunk_text,
                    voice=voice,
                    language_type=language,
                    stream=False  # 非流式，获取完整 URL
                )
                
                if response.status_code == 200 and response.output:
                    audio_info = response.output.get('audio')
                    if audio_info and audio_info.get('url'):
                        audio_url = audio_info['url']
                        print(f"[后台缓存] 获取到 URL: {audio_url[:50]}...")
                        
                        # 下载音频
                        audio_response = requests.get(audio_url, timeout=30)
                        if audio_response.status_code == 200:
                            audio_data = audio_response.content
                            print(f"[后台缓存] 下载成功，大小: {len(audio_data)} 字节")
                            
                            # 保存到文件 (使用统一的 public/audio 目录)
                            audio_dir.mkdir(parents=True, exist_ok=True)
                            
                            with open(file_path, 'wb') as f:
                                f.write(audio_data)
                            
                            print(f"[后台缓存] 保存到: {file_path}")
                            
                            # 保存元数据到数据库
                            port = os.getenv('PORT', '3001')
                            save_url = f"http://localhost:{port}/api/audio/save"
                            metadata = {
                                "hash": audio_hash,
                                "text": chunk_text,
                                "voice": voice,
                                "language": language,
                                "fileName": file_name,
                                "filePath": f"/audio/{file_name}",
                                "fileSize": len(audio_data),
                                "duration": 0
                            }
                            
                            try:
                                save_response = requests.post(save_url, json=metadata, timeout=5)
                                if save_response.status_code == 200:
                                    print(f"[后台缓存] 元数据已保存")
                                else:
                                    print(f"[后台缓存] 保存元数据失败: {save_response.status_code}")
                            except Exception as e:
                                print(f"[后台缓存] 保存元数据异常: {e}")
                        else:
                            print(f"[后台缓存] 下载失败: {audio_response.status_code}")
                    else:
                        print(f"[后台缓存] 响应中没有 URL")
                else:
                    print(f"[后台缓存] API 调用失败: {response.status_code}")
            except Exception as e:
                print(f"[后台缓存] API 调用异常: {e}")

        print(f"[后台缓存] 任务完成")
        
    except Exception as e:
        print(f"[后台缓存] 全局异常: {e}")
        import traceback
        traceback.print_exc()


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
