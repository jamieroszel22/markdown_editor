@echo off
echo Starting Markdown Editor with Ollama...

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Docker not found. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Create documents directory if it doesn't exist
if not exist documents mkdir documents

REM Check if VcXsrv/X server is installed and running
echo.
echo IMPORTANT: Before continuing, make sure you have an X server like VcXsrv running.
echo If you don't have it installed, please download it from:
echo https://sourceforge.net/projects/vcxsrv/
echo.
echo For VcXsrv, use these settings:
echo 1. Multiple windows
echo 2. Display number: 0
echo 3. Start no client
echo 4. IMPORTANT: Check "Disable access control"
echo.
set /p answer=Is your X server installed and running with "Disable access control" checked? (y/n): 
if /i "%answer%" neq "y" (
    echo Please install and start VcXsrv first, then run this script again.
    pause
    exit /b 1
)

REM Start the containers
echo Starting the containers...
docker-compose up -d

REM Wait for Ollama to start
echo Waiting for Ollama to start...
timeout /t 10 /nobreak > nul

REM Pull the Granite 3.3 model
echo Pulling the Granite 3.3 model (this may take some time)...
docker exec ollama ollama pull granite3.3:latest
if %ERRORLEVEL% NEQ 0 (
    echo Failed to pull Granite 3.3 model. Trying to pull llama3:8b as a fallback...
    docker exec ollama ollama pull llama3:8b
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to pull llama3:8b as well. Please check Ollama service status.
        pause
        exit /b 1
    )
    echo Successfully pulled llama3:8b model as a fallback.
)

echo.
echo Markdown Editor is ready! The application window should open automatically.
echo Your documents will be saved in the './documents' directory.
echo To stop the application, run: docker-compose down
echo.
pause 