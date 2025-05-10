const fs = require('fs');
const path = require('path');

const API_KEY_FILE = path.join(__dirname, 'setup/.test-api-key');

function getTestApiKey() {
  try {
    if (!fs.existsSync(API_KEY_FILE)) {
      throw new Error('API key file not found at ' + API_KEY_FILE);
    }
    
    const apiKey = fs.readFileSync(API_KEY_FILE, 'utf8').trim();
    
    if (!apiKey) {
      throw new Error('API key is empty.');
    }
    
    return apiKey;
  } catch (error) {
    console.error('Failed to retrieve API key:', error.message);
    throw error;
  }
}

module.exports = {
  getTestApiKey
};