FROM node:18-slim

# Install required system dependencies for Electron
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libasound2 \
    xvfb \
    libxtst6 \
    libatspi2.0-0 \
    libdrm2 \
    libgbm1 \
    libxcb-dri3-0 \
    libx11-xcb1 \
    && rm -rf /var/lib/apt/lists/*

# Set up a user to run the application
RUN groupadd -r appuser && useradd -r -g appuser -G audio,video appuser \
    && mkdir -p /home/appuser/app \
    && chown -R appuser:appuser /home/appuser

# Set the working directory
WORKDIR /home/appuser/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Set up the environment for running the application
ENV DISPLAY=:0
ENV NODE_ENV=production
ENV OLLAMA_ENDPOINT=http://ollama:11434/api/generate

# Set the user to run the application
USER appuser

# Command to start both the server and the Electron app
CMD ["npm", "run", "dev"]

# Expose the server port
EXPOSE 3001 