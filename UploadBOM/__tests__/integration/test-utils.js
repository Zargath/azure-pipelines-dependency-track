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

async function waitForBomProcessing(client, token, maxWaitTime = 4000, pollInterval = 500) {
  const startTime = Date.now();
  let processing = true;
  
  console.log(`Waiting for BOM processing to complete for token: ${token}`);
  
  while (processing && (Date.now() - startTime) < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    try {
      processing = await client.pullProcessingStatusAsync(token);
      console.log(`BOM processing status: ${processing ? 'still processing' : 'completed'}`);
    } catch (error) {
      console.warn('Error checking processing status:', error.message);
      // Continue waiting - the endpoint might not be immediately available
      // or might return an error while processing is still in progress
    }
  }
  
  if (processing) {
    throw new Error(`BOM processing did not complete within ${maxWaitTime}ms`);
  }
  
  console.log('BOM processing completed successfully');
}

async function waitForMetricsRefresh(client, projectId, lastBomImport, maxWaitTime = 4000, pollInterval = 500) {
  const startTime = Date.now();
  const targetDate = new Date(lastBomImport);
  let lastOccurrence;
  
  console.log(`Waiting for metrics refresh after BOM import: ${targetDate.toISOString()}`);
  
  do {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    try {
      lastOccurrence = await client.getLastMetricCalculationDate(projectId);
      console.log(`Last metrics calculation: ${new Date(lastOccurrence).toISOString()}`);
    } catch (error) {
      console.warn('Error checking metrics refresh:', error.message);
      lastOccurrence = new Date(0); // Set to epoch to continue waiting
    }
    
    if ((Date.now() - startTime) >= maxWaitTime) {
      throw new Error(`Metrics refresh did not complete within ${maxWaitTime}ms`);
    }
  } while (new Date(lastOccurrence) < targetDate);
  
  console.log('Metrics refresh completed successfully');
}

module.exports = {
  getTestApiKey,
  generateUniqueName,
  getTestBom,
  waitForBomProcessing,
  waitForMetricsRefresh
};