const fs = require('fs');
const path = require('path');

const API_KEY_FOLDER = path.join(__dirname, 'setup/api-keys');
const TEST_BOM_FILE = path.join(__dirname, 'setup/test-bom.json');

function getTestApiKey(keyName = 'admin') {
  const apiKeyFile = path.join(API_KEY_FOLDER, `${keyName}.key`);
  try {
    if (!fs.existsSync(apiKeyFile)) {
      throw new Error('API key file not found at ' + apiKeyFile);
    }
    
    const apiKey = fs.readFileSync(apiKeyFile, 'utf8').trim();
    
    if (!apiKey) {
      throw new Error('API key is empty.');
    }
    
    return apiKey;
  } catch (error) {
    console.error('Failed to retrieve API key:', error.message);
    throw error;
  }
}

function generateUniqueName(baseName) {
  const timestamp = new Date().getTime();
  return `${baseName}-${timestamp}`;
}

function getTestBom() {
  try {
    if (!fs.existsSync(TEST_BOM_FILE)) {
      throw new Error('Test BOM file not found at ' + TEST_BOM_FILE);
    }
    
    return fs.readFileSync(TEST_BOM_FILE);
  } catch (error) {
    console.error('Failed to retrieve test BOM:', error.message);
    throw error;
  }
}

module.exports = {
  getTestApiKey,
  generateUniqueName,
  getTestBom
};