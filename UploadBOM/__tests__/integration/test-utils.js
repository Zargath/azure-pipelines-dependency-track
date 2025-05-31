const fs = require('fs');
const path = require('path');

const API_KEY_FILE = path.join(__dirname, 'setup/.test-api-key');
const TEST_BOM_FILE = path.join(__dirname, 'setup/test-bom.json');

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