# Containerized Markdown Editor with Ollama

This README provides instructions for running the Markdown Editor application in a Docker container.

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed (usually comes with Docker Desktop)
- For Linux/macOS: An X server running
- For Windows: Either:
  - Docker Desktop with WSL2 backend and an X server like [VcXsrv](https://sourceforge.net/projects/vcxsrv/) or [X410](https://x410.dev/)
  - Docker Desktop with Windows containers (limited GUI support)

## Running the Application

### On Linux/macOS

1. Make the startup script executable:
   ```bash
   chmod +x start-container.sh
   ```

2. Run the startup script:
   ```bash
   ./start-container.sh
   ```

3. The script will:
   - Start the Docker containers for the Markdown Editor and Ollama using Linux-specific configuration
   - Pull the required Ollama model (Granite 3.3 or a fallback model)
   - Launch the application

### On Windows

1. Run the startup batch file:
   ```
   start-container.bat
   ```

2. The script will:
   - Guide you through setting up an X server
   - Start the Docker containers for the Markdown Editor and Ollama using Windows-specific configuration
   - Pull the required Ollama model (Granite 3.3 or a fallback model)
   - Launch the application

## Setting up X11 for Windows (WSL2)

If you're using Windows with WSL2, you'll need to set up an X server:

1. Download and install [VcXsrv](https://sourceforge.net/projects/vcxsrv/)
2. Launch XLaunch
3. Select "Multiple windows" and set display number to 0
4. Select "Start no client"
5. Check "Disable access control"
6. Save configuration and finish

Then, in your WSL2 terminal, before running the Docker container:

```bash
export DISPLAY=$(grep -m 1 nameserver /etc/resolv.conf | awk '{print $2}'):0.0
```

## Stopping the Application

To stop the application:

### On Linux/macOS
```bash
docker-compose -f docker-compose.linux.yml down
```

### On Windows
```bash
docker-compose down
```

## Volumes and Persistence

- Your markdown documents will be saved in the `./documents` directory
- The Ollama models are stored in a persistent Docker volume named `ollama_data`

## Troubleshooting

### X11 Display Issues

If you experience display issues:

1. Make sure your X server is running and accessible
2. Check that the DISPLAY environment variable is set correctly
3. Ensure X11 authentication is properly configured

### Ollama Model Issues

If the application can't connect to Ollama:

1. Check if the Ollama container is running:
   ```bash
   docker ps | grep ollama
   ```

2. Check the Ollama logs:
   ```bash
   docker logs ollama
   ```

3. Verify that the model was successfully pulled:
   ```bash
   docker exec ollama ollama list
   ```

### Application Crashes

If the application crashes on startup:

1. Check the container logs:
   ```bash
   docker logs markdown-editor
   ```

2. Verify that the X11 socket is properly mounted and permissions are correct 