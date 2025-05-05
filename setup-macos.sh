#!/bin/bash
# Setup script for Markdown Editor with Ollama on macOS

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting setup for Markdown Editor with Ollama on macOS...${NC}"

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}Homebrew is not installed. Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo -e "${GREEN}Homebrew is already installed.${NC}"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js is not installed. Installing Node.js...${NC}"
    brew install node
else
    echo -e "${GREEN}Node.js is already installed.${NC}"
fi

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Ollama is not installed. Installing Ollama...${NC}"
    brew install ollama
else
    echo -e "${GREEN}Ollama is already installed.${NC}"
fi

# Start Ollama
echo -e "${YELLOW}Starting Ollama service...${NC}"
ollama serve &

# Pull the Granite 3.3 model
echo -e "${YELLOW}Pulling the Granite 3.3 model (this may take some time)...${NC}"
ollama pull granite3.3:latest

# If Granite 3.3 is not available, pull Llama3
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Granite 3.3 model not found. Pulling Llama3 as an alternative...${NC}"
    ollama pull llama3:8b
    
    # Update the model name in settings
    echo -e "${YELLOW}Updating the model name in settings...${NC}"
    sed -i '' 's/granite:3.3/llama3:8b/g' server.js
fi

# Install npm dependencies
echo -e "${YELLOW}Installing npm dependencies...${NC}"
npm install

echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo -e "You can now start the application with: ${YELLOW}npm run dev${NC}"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "1. Make sure Ollama is running (ollama serve)"
echo "2. If you're using a model other than Granite 3.3, update it in the application settings"
echo "3. You can build the application for distribution with: npm run build:mac"
echo ""
echo -e "${GREEN}Happy writing!${NC}"
