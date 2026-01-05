# Python TTS 流式服务

这是一个基于 FastAPI 和 dashscope SDK 的流式语音合成服务，提供真正的实时音频流传输。

## 功能特点

- ✅ 真正的流式播放
- ✅ 低延迟（< 1 秒开始播放）
- ✅ WebSocket 实时传输
- ✅ 支持多种音色
- ✅ 自动从 config.js 读取 API Key

## 安装依赖

```bash
cd python_tts_service
pip install -r requirements.txt
```

## 启动服务

### Windows
```bash
start.bat
```

### 手动启动
```bash
python main.py
```

服务将在 `http://localhost:8000` 启动

## API 端点

### WebSocket TTS
```
ws://localhost:8000/ws/tts
```

**请求格式**:
```json
{
  "text": "要转换的文本",
  "voice": "Cherry",
  "language": "Chinese"
}
```

**响应格式**:

音频数据:
```json
{
  "type": "audio",
  "data": "base64_encoded_pcm_data",
  "sample_rate": 24000,
  "channels": 1,
  "chunk_index": 1
}
```

完成信号:
```json
{
  "type": "done",
  "total_chunks": 50
}
```

错误信息:
```json
{
  "type": "error",
  "message": "错误描述"
}
```

### 健康检查
```
GET http://localhost:8000/
```

## 前端集成

前端 `AudioPlayer.js` 已经配置为使用 WebSocket 连接此服务。

确保：
1. Python TTS 服务正在运行（端口 8000）
2. Node.js 开发服务器正在运行（端口 3000）
3. 两个服务可以正常通信

## 技术栈

- **FastAPI**: 现代 Python Web 框架
- **dashscope**: 阿里云官方 SDK
- **uvicorn**: ASGI 服务器
- **WebSocket**: 实时双向通信

## 音频格式

- **格式**: PCM (16-bit signed integer)
- **采样率**: 24000 Hz
- **声道**: 单声道 (Mono)
- **编码**: Base64

## 故障排除

### 连接失败
- 确保 Python 服务正在运行
- 检查端口 8000 是否被占用
- 检查防火墙设置

### API Key 错误
- 确保 `config.js` 中有正确的 API Key
- 检查 API Key 是否有效

### 音频播放问题
- 检查浏览器控制台是否有错误
- 确保浏览器支持 Web Audio API
- 尝试刷新页面
