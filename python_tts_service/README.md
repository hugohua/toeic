# TTS 流式播放服务

基于 FastAPI + WebSocket + 阿里云 DashScope 实现的实时语音合成服务。

## 功能特性

- ✅ 实时流式语音合成
- ✅ WebSocket 双向通信
- ✅ 智能文本分块
- ✅ 支持多种音色和语言
- ✅ 低延迟播放（< 1秒）

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置 API Key

在项目根目录的 `.env` 文件中添加：

```
DASHSCOPE_API_KEY=your_api_key_here
```

### 3. 启动服务

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
python main.py
```

服务将在 `http://localhost:8000` 启动。

## API 接口

### WebSocket 接口

**地址:** `ws://localhost:8000/ws/tts`

**请求格式:**
```json
{
  "text": "要合成的文本",
  "voice": "Cherry",
  "language": "Chinese"
}
```

**响应格式:**
```json
{
  "type": "audio",
  "data": "base64_pcm_data",
  "sample_rate": 24000
}
```

## 支持的音色

- Cherry (女声)
- Ryan (男声)
- Stella (女声)
- 更多音色请参考阿里云文档

## 技术架构

- **FastAPI**: Web 框架
- **WebSocket**: 实时通信
- **DashScope SDK**: 阿里云语音合成
- **Uvicorn**: ASGI 服务器

## 参考文档

- [阿里云 TTS 文档](https://help.aliyun.com/zh/model-studio/developer-reference/text-to-speech-qwen-audio)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
