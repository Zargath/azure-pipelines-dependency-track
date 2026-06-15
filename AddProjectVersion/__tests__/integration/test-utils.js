const fs = require('fs');
const path = require('path');

const API_KEY_FOLDER = path.join(__dirname, '../../../test-environment/api-keys');

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

module.exports = {
  getTestApiKey,
  generateUniqueName
};
