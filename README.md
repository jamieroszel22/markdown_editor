# Markdown Editor with Ollama Integration

A desktop application for writing and editing markdown documents with AI-powered copy editing through Ollama using the IBM Granite 3.3 model.

## Features

- Modern, responsive interface for writing markdown
- Live preview of rendered markdown
- Integration with local Ollama for AI copy editing
- Edit review system with accept/reject/ignore/ignore all/undo functionality
- Cross-platform (Windows and macOS)
- Light and dark themes
- File management (new, open, save, save as)

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Ollama](https://ollama.ai/) - To run AI models locally

## Setup Instructions

### 1. Install Ollama

#### Windows

1. Download Ollama from the [official website](https://ollama.ai/download)
2. Run the installer and follow the on-screen instructions
3. After installation, Ollama should be running in the background

#### macOS

1. Download Ollama from the [official website](https://ollama.ai/download)
2. Open the downloaded DMG file and drag the Ollama application to your Applications folder
3. Launch Ollama from your Applications folder

### 2. Pull the Granite 3.3 Model

Once Ollama is installed and running, pull the Granite 3.3 model using the command line:

```bash
ollama pull granite3.3:latest
```

If Granite 3.3 is not available in the Ollama library, you can use an alternative model like:

```bash
ollama pull llama3:8b
```

Just remember to update the model name in the application settings if you use a different model.

### 3. Install Application Dependencies

From the application directory, run:

```bash
npm install
```

This will install all the necessary dependencies for both the frontend and backend.

### 4. Start the Application

You can start the application in development mode with:

```bash
npm run dev
```

This will start both the Express server (for Ollama communication) and the Electron app.

## Building for Production

### Windows

```bash
npm run build:win
```

The built application will be available in the `dist` folder.

### macOS

```bash
npm run build:mac
```

The built application will be available in the `dist` folder.

## Usage

1. Launch the application
2. Write or paste your markdown content in the editor
3. Use the tabs to switch between editor, preview, or split view modes
4. To check your text with AI, click the "Copy Edit" button in the top right
5. For each suggested edit:
   - Click "Accept" to apply the change
   - Click "Reject" to skip this suggestion
   - Click "Ignore" to skip this specific suggestion
   - Click "Ignore All" to skip all suggestions of the same type
   - Click "Undo" to go back to the previous suggestion
6. Use the File menu to create new documents, open existing ones, or save your work

## Settings

You can access settings from the File menu:

- Ollama Endpoint: The URL where Ollama API is accessible (default: http://localhost:11434/api/generate)
- Ollama Model: The name of the model to use for copy editing (default: granite:3.3)
- Theme: Choose between light and dark themes

## BeeAI Integration

This application is designed to work with the IBM BeeAI Agent Framework. To integrate with BeeAI:

1. Install and configure the BeeAI Agent Framework following the [official documentation](https://github.com/i-am-bee/bee-stack)
2. In the BeeAI Agent UI (http://localhost:3000), create a new agent
3. Add the following tools to your agent:
   - A tool to process markdown text (similar to the copy editing functionality)
   - A tool to retrieve and save documents

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Electron, Express, and Node.js
- Uses Marked.js for markdown rendering
- Integrates with Ollama for AI capabilities
- Inspired by IBM BeeAI Agent Framework
