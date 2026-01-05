# 系统架构文档

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React)                          │
│                    http://localhost:3000                     │
│                                                              │
│  ┌──────────────┐        ┌─────────────────────────────┐   │
│  │ ArticlePage  │───────▶│ AudioPlayer (WebSocket)     │   │
│  └──────────────┘        └─────────────────────────────┘   │
└───────────────────────────────────│──────────────────────────┘
                                    │ WebSocket
                                    │ ws://localhost:8000/ws/tts
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Python TTS 服务 (FastAPI)                       │
│                  http://localhost:8000                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WebSocket Handler                                    │  │
│  │  - 接收文本                                           │  │
│  │  - 文本分块 (最大 500 字符)                          │  │
│  │  - 调用阿里云 TTS API                                │  │
│  │  - 流式返回 PCM 音频帧                               │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────│──────────────────────────┘
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   阿里云 TTS API                             │
│        dashscope.MultiModalConversation                      │
│                                                              │
│  - 模型: qwen3-tts-flash                                    │
│  - 流式输出: stream=True                                    │
│  - 返回: Base64 编码的 PCM 音频数据                         │
└─────────────────────────────────────────────────────────────┘
```

## 技术栈

### 前端
- **React**: UI 框架
- **WebSocket API**: 实时通信
- **Web Audio API**: 音频播放
  - PCM 数据解码
  - 音频帧无缝拼接
  - 实时播放

### 后端 (Python)
- **FastAPI**: Web 框架
- **WebSocket**: 实时双向通信
- **dashscope SDK**: 阿里云官方 SDK
- **asyncio**: 异步 I/O
- **queue**: 线程间通信

### Node.js 服务器
- **Express**: Web 框架
- **用途**: 
  - 静态文件服务
  - 其他 API 端点（单词、文章等）
  - **不再处理 TTS 请求**

## 数据流

### 1. 用户点击播放
```
用户点击 → AudioPlayer.handlePlay()
```

### 2. 建立 WebSocket 连接
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/tts');
ws.send(JSON.stringify({
  text: "文章内容",
  voice: "Cherry",
  language: "Chinese"
}));
```

### 3. Python 服务处理
```python
# 接收请求
data = await websocket.receive_json()

# 文本分块
chunks = split_text(data['text'], max_length=500)
text_to_process = chunks[0]  # 只处理第一块

# 调用 TTS API
response = dashscope.MultiModalConversation.call(
    model='qwen3-tts-flash',
    text=text_to_process,
    voice=voice,
    stream=True
)

# 流式发送音频数据
for chunk in response:
    audio_data = chunk.output.get('audio')['data']
    await websocket.send_json({
        "type": "audio",
        "data": audio_data,  # Base64 PCM
        "sample_rate": 24000
    })
```

### 4. 前端接收并播放
```javascript
ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    
    if (msg.type === 'audio') {
        // 解码 Base64 → PCM
        const pcmData = base64ToArrayBuffer(msg.data);
        
        // 转换 PCM → AudioBuffer
        const audioBuffer = convertPCMToAudioBuffer(pcmData);
        
        // 播放
        playAudioFrame(audioBuffer);
    }
};
```

## 音频格式

### 传输格式
- **编码**: Base64
- **原始格式**: PCM (16-bit signed integer)
- **采样率**: 24000 Hz
- **声道**: 单声道 (Mono)

### 播放流程
1. Base64 解码 → ArrayBuffer
2. Int16Array → Float32Array (归一化到 -1.0 ~ 1.0)
3. 创建 AudioBuffer
4. AudioBufferSourceNode 播放
5. 计算时间偏移，实现无缝拼接

## 性能优化

### 1. 文本分块
- 最大 500 字符（API 限制 600）
- 只处理第一块，快速开始播放
- 按句子智能分割

### 2. 流式传输
- 边生成边传输
- 边接收边播放
- 延迟 < 1 秒

### 3. 异步处理
- Python: asyncio + 线程池
- JavaScript: async/await
- 队列缓冲

## 错误处理

### 连接错误
```javascript
ws.onerror = (error) => {
    alert('连接失败，请确保 Python TTS 服务正在运行');
};
```

### API 错误
```python
try:
    response = dashscope.MultiModalConversation.call(...)
except Exception as e:
    await websocket.send_json({
        "type": "error",
        "message": str(e)
    })
```

### 播放错误
```javascript
source.onerror = (error) => {
    console.error('Audio playback error:', error);
};
```

## 部署

### 开发环境
```bash
# 终端 1: Python TTS 服务
cd python_tts_service
python main.py

# 终端 2: Node.js 服务 + React 前端
npm run dev
```

### 生产环境
1. Python 服务: uvicorn + systemd/supervisor
2. Node.js 服务: pm2
3. 前端: 构建静态文件，nginx 托管

## 优势

✅ **真正的流式播放**: 延迟 < 1 秒  
✅ **架构清晰**: 前后端分离，职责明确  
✅ **可扩展**: 易于添加新功能（多语言、多音色等）  
✅ **高性能**: 异步处理，支持并发  
✅ **易维护**: 代码结构清晰，注释完善  

## 未来改进

1. **完整文章播放**: 处理所有文本块，而不仅仅是第一块
2. **播放控制**: 暂停、继续、进度条
3. **缓存**: 缓存已生成的音频
4. **多语言支持**: 自动检测语言
5. **音色选择**: UI 选择不同音色
