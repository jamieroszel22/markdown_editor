@echo off
echo Starting setup for Markdown Editor with Ollama on Windows...

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please download and install Node.js from https://nodejs.org/
    echo After installing Node.js, run this setup script again.
    pause
    exit /b 1
) else (
    echo Node.js is already installed.
)

:: Check if Ollama is installed
where ollama >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Ollama is not installed. Please download and install Ollama from https://ollama.ai/download
    echo After installing Ollama, run this setup script again.
    pause
    exit /b 1
) else (
    echo Ollama is already installed.
)

:: Start Ollama service
echo Starting Ollama service...
start /B ollama serve

:: Wait for Ollama to start
echo Waiting for Ollama to start...
timeout /t 5 /nobreak >nul

:: Pull the Granite 3.3 model
echo Pulling the Granite 3.3 model (this may take some time)...
ollama pull granite3.3:latest

:: If Granite 3.3 is not available, pull Llama3
if %ERRORLEVEL% NEQ 0 (
    echo Granite 3.3 model not found. Pulling Llama3 as an alternative...
    ollama pull llama3:8b
    
    :: Update the model name in settings
    echo Updating the model name in settings...
    powershell -Command "(Get-Content server.js) -replace 'granite:3.3', 'llama3:8b' | Set-Content server.js"
)

:: Install npm dependencies
echo Installing npm dependencies...
call npm install

echo Setup complete!
echo.
echo You can now start the application with: npm run dev
echo.
echo Important:
echo 1. Make sure Ollama is running (ollama serve)
echo 2. If you're using a model other than Granite 3.3, update it in the application settings
echo 3. You can build the application for distribution with: npm run build:win
echo.
echo Happy writing!

pause
