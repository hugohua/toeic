from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import dashscope
import base64
import json
import asyncio
from config import API_KEY, TTS_MODEL, DEFAULT_VOICE, DEFAULT_LANGUAGE

# 设置 API Key 和 base URL
dashscope.api_key = API_KEY
dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'

app = FastAPI(title="TTS Streaming Service")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/tts")
async def websocket_tts(websocket: WebSocket):
    """WebSocket TTS 端点"""
    await websocket.accept()
    print("WebSocket connection accepted")
    
    try:
        # 接收客户端请求
        data = await websocket.receive_json()
        text = data.get('text', '')
        voice = data.get('voice', DEFAULT_VOICE)
        language = data.get('language', DEFAULT_LANGUAGE)
        
        print(f"Received TTS request: text_length={len(text)}, voice={voice}")
        
        if not text:
            await websocket.send_json({
                "type": "error",
                "message": "Text is required"
            })
            await websocket.close()
            return
        
        # 文本分块（最大 500 字符，留一些余量）
        def split_text(text, max_length=500):
            """将文本分成多个块"""
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
            
            return chunks if chunks else [text[:max_length]]
        
        text_chunks = split_text(text)
        print(f"Split text into {len(text_chunks)} chunks")
        
        # 只处理第一个块（快速开始播放）
        text_to_process = text_chunks[0]
        print(f"Processing first chunk: {len(text_to_process)} characters")
        
        chunk_count = 0
        
        # 使用队列在线程间传递数据
        import queue
        audio_queue = queue.Queue()
        
        # 调用 TTS API（在线程池中运行）
        def call_tts():
            nonlocal chunk_count
            try:
                response = dashscope.MultiModalConversation.call(
                    model=TTS_MODEL,
                    api_key=API_KEY,
                    text=text_to_process,  # 使用分块后的文本
                    voice=voice,
                    language_type=language,
                    stream=True
                )
                
                for chunk in response:
                    chunk_count += 1
                    print(f"Received chunk {chunk_count}")
                    
                    # 提取音频数据
                    if hasattr(chunk, 'output') and chunk.output:
                        audio_data = chunk.output.get('audio')
                        if audio_data:
                            # 检查是否有 base64 数据
                            if isinstance(audio_data, dict) and 'data' in audio_data:
                                audio_b64 = audio_data['data']
                                if audio_b64:
                                    # 放入队列
                                    audio_queue.put({
                                        "type": "audio",
                                        "data": audio_b64,
                                        "sample_rate": 24000,
                                        "channels": 1,
                                        "chunk_index": chunk_count
                                    })
                                    print(f"Queued audio chunk {chunk_count}")
                            elif isinstance(audio_data, str):
                                # 直接是 base64 字符串
                                audio_queue.put({
                                    "type": "audio",
                                    "data": audio_data,
                                    "sample_rate": 24000,
                                    "channels": 1,
                                    "chunk_index": chunk_count
                                })
                                print(f"Queued audio chunk {chunk_count}")
                
                # 标记完成
                audio_queue.put(None)
                return True
            except Exception as e:
                print(f"TTS Error: {e}")
                import traceback
                traceback.print_exc()
                audio_queue.put({"type": "error", "message": str(e)})
                return False
        
        # 在线程池中执行 TTS 调用
        loop = asyncio.get_event_loop()
        tts_task = loop.run_in_executor(None, call_tts)
        
        # 从队列中读取并发送数据
        try:
            while True:
                # 非阻塞检查队列
                try:
                    msg = audio_queue.get(timeout=0.1)
                    
                    if msg is None:
                        # 完成信号
                        break
                    elif msg.get("type") == "error":
                        await websocket.send_json(msg)
                        break
                    else:
                        # 发送音频数据
                        await websocket.send_json(msg)
                        
                except queue.Empty:
                    # 队列为空，继续等待
                    await asyncio.sleep(0.05)
                    continue
        except Exception as e:
            print(f"Error sending data: {e}")
        
        # 等待 TTS 任务完成
        await tts_task
        
        # 发送完成信号
        await websocket.send_json({
            "type": "done",
            "total_chunks": chunk_count
        })
        print(f"TTS completed, sent {chunk_count} chunks")
        
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass

@app.get("/")
async def root():
    """健康检查端点"""
    return {
        "service": "TTS Streaming Service",
        "status": "running",
        "model": TTS_MODEL,
        "api_key": API_KEY[:10] + "..." if API_KEY else "Not configured"
    }

if __name__ == "__main__":
    import uvicorn
    print(f"Starting TTS Streaming Service...")
    print(f"API Key: {API_KEY[:10]}..." if API_KEY else "API Key not found!")
    print(f"Model: {TTS_MODEL}")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
