import os
import re

# 从 config.js 读取 API Key
def load_api_key():
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config.js')
    with open(config_path, 'r', encoding='utf-8') as f:
        content = f.read()
        match = re.search(r"apiKey:\s*['\"]([^'\"]+)['\"]", content)
        if match:
            return match.group(1)
    return None

API_KEY = load_api_key()
TTS_MODEL = 'qwen3-tts-flash'
DEFAULT_VOICE = 'Ryan'
DEFAULT_LANGUAGE = 'English'
