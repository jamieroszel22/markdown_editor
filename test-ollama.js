const axios = require('axios');

async function testOllama() {
  try {
    console.log('Testing Ollama connection...');
    
    const endpoint = 'http://localhost:11434/api/generate';
    const model = 'granite3.3:latest';
    
    console.log(`Using endpoint: ${endpoint}`);
    console.log(`Using model: ${model}`);
    
    const response = await axios.post(endpoint, {
      model: model,
      prompt: 'Hello, are you running?',
      stream: false
    }, { 
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data) {
      console.log('Ollama responded successfully!');
      console.log('Response:', response.data);
      return true;
    } else {
      console.log('Ollama responded with unexpected format');
      console.log(response);
      return false;
    }
  } catch (error) {
    console.error('Error connecting to Ollama:');
    console.error(error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

testOllama()
  .then(success => {
    console.log('Test completed.');
    process.exit(success ? 0 : 1);
  }); 