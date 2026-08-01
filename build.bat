@echo off
REM Rhythm Flashcard Trainer - build + verify (Windows)
cd /d "%~dp0"
echo ==^> building index.html from src\
copy /b src\shell_top.html + src\engine.js + src\shell_bottom.html index.html >nul
echo ==^> rhythm generation suite
node test\generation.test.js || exit /b 1
echo ==^> DSP suite
node test\dsp.test.js || exit /b 1
echo ==^> BUILD OK
