@echo off
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Starting TTS Streaming Service...
python main.py
