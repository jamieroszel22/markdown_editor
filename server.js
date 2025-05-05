const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const Store = require('electron-store');

// Initialize the settings store
const store = new Store();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Default settings if not configured
const getOllamaConfig = () => {
  return {
    endpoint: store.get('ollamaEndpoint', 'http://localhost:11434/api/generate'),
    model: store.get('ollamaModel', 'granite3.3:latest')
  };
};

// Endpoint to process copy editing requests
app.post('/api/copy-edit', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const config = getOllamaConfig();

    // Prepare the prompt for Ollama
    const prompt = `
You are a professional copy editor. Please review the following text written in markdown format.
Identify and correct any spelling mistakes, grammar errors, punctuation issues, and suggest improvements for clarity.
For each edit you make, explain the reason briefly.

Format your response as JSON with the following structure:
{
  "correctedText": "The corrected version of the entire text",
  "edits": [
    {
      "type": "spelling|grammar|punctuation|clarity",
      "original": "The original text",
      "correction": "The corrected text",
      "explanation": "Brief explanation of the edit"
    }
  ]
}

Here is the text to review:
${text}
`;

    console.log(`Sending request to Ollama at ${config.endpoint}`);
    
    // Call Ollama API
    const response = await axios.post(config.endpoint, {
      model: config.model,
      prompt: prompt,
      stream: false
    });

    // Process the response
    let ollamaResponse = response.data.response;
    
    // Extract the JSON content from the response
    // Sometimes Ollama might wrap the JSON in markdown code blocks or add extra text
    const jsonMatch = ollamaResponse.match(/```json\n([\s\S]*?)\n```/) || 
                      ollamaResponse.match(/```\n([\s\S]*?)\n```/) ||
                      ollamaResponse.match(/{[\s\S]*?}/);
    
    let jsonResponse;
    try {
      if (jsonMatch) {
        jsonResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        // Attempt to parse the whole response if no clear JSON pattern is found
        jsonResponse = JSON.parse(ollamaResponse);
      }
    } catch (error) {
      console.error('Error parsing JSON from Ollama response:', error);
      // Fallback: return text with basic edit
      return res.json({
        text: text,
        changes: [
          {
            type: 'error',
            original: 'Ollama response',
            correction: 'Could not parse Ollama response',
            explanation: 'The AI model did not return properly formatted JSON. Try again or check your model configuration.'
          }
        ]
      });
    }
    
    return res.json({
      text: jsonResponse.correctedText || text,
      changes: jsonResponse.edits || []
    });
    
  } catch (error) {
    console.error('Error communicating with Ollama:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with Ollama',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Endpoint to check Ollama connection
app.get('/api/check-ollama', async (req, res) => {
  try {
    const config = getOllamaConfig();
    
    console.log('Checking Ollama connection...');
    console.log(`Endpoint: ${config.endpoint}`);
    console.log(`Model: ${config.model}`);
    
    // Simple request to check if Ollama is responding
    const response = await axios.post(config.endpoint, {
      model: config.model,
      prompt: 'Hello, are you running?',
      stream: false
    }, { timeout: 5000 });
    
    console.log('Ollama response received:', response.status);
    
    if (response.data && response.status === 200) {
      console.log('Ollama connection successful');
      res.json({ status: 'connected', model: config.model });
    } else {
      console.log('Ollama responded but with unexpected format:', response.data);
      res.status(400).json({ status: 'error', message: 'Ollama responded but with an unexpected format' });
    }
  } catch (error) {
    console.error('Error checking Ollama connection:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
    res.status(500).json({ 
      status: 'disconnected', 
      message: 'Could not connect to Ollama. Make sure Ollama is running and the correct endpoint is configured.' 
    });
  }
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Make sure Ollama is running with the configured model loaded`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});