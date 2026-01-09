## Python 环境配置

### 首次配置

1. **创建虚拟环境**:
```bash
cd python_tts_service
python3 -m venv venv
```

2. **激活虚拟环境**:
```bash
# macOS/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

3. **安装依赖**:
```bash
pip install -r requirements.txt
```

4. **配置环境变量**:
在项目根目录创建 `.env` 文件:
```env
DASHSCOPE_API_KEY=your_dashscope_api_key_here
```

### 后续使用

如果已经配置过虚拟环境,直接使用 `npm run dev:tts` 即可,脚本会自动使用虚拟环境。

