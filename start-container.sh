#!/bin/bash

# Make sure Docker and Docker Compose are installed
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
    echo "Docker and/or Docker Compose not found. Please install them first."
    exit 1
fi

# Create documents directory if it doesn't exist
mkdir -p documents

# Allow X11 connections from Docker
xhost +local:docker || {
    echo "Failed to set X11 permissions. Make sure X11 is running."
    echo "If you're on WSL2, make sure you have an X server like VcXsrv running on Windows."
    exit 1
}

# Start the containers
echo "Starting the Markdown Editor application..."
docker-compose -f docker-compose.linux.yml up -d

# Give Ollama some time to start up
echo "Waiting for Ollama to start..."
sleep 10

# Pull the Granite 3.3 model
echo "Pulling the Granite 3.3 model (this may take some time)..."
docker exec ollama ollama pull granite3.3:latest || {
    echo "Failed to pull Granite 3.3 model. Trying to pull llama3:8b as a fallback..."
    docker exec ollama ollama pull llama3:8b || {
        echo "Failed to pull llama3:8b as well. Please check Ollama service status."
        exit 1
    }
    echo "Successfully pulled llama3:8b model as a fallback."
}

echo "Markdown Editor is ready! The application window should open automatically."
echo "Your documents will be saved in the './documents' directory."
echo "To stop the application, run: docker-compose -f docker-compose.linux.yml down" 