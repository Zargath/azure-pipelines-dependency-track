/**
 * Mock implementation of azure-pipelines-task-lib for testing
 */

// Store inputs, paths, stats and files for mocking
const state = {
    inputs: {},
    pathInputs: {},
    boolInputs: {},
    files: {},
    stats: {},
    resourcePath: null,
    results: []
};

// Task Results enum
const TaskResult = {
    Succeeded: 'Succeeded',
    SucceededWithIssues: 'SucceededWithIssues',
    Failed: 'Failed',
    Cancelled: 'Cancelled',
    Skipped: 'Skipped'
};

// Reset the state for tests
function reset() {
    Object.keys(state.inputs).forEach(key => delete state.inputs[key]);
    Object.keys(state.pathInputs).forEach(key => delete state.pathInputs[key]);
    Object.keys(state.boolInputs).forEach(key => delete state.boolInputs[key]);
    Object.keys(state.files).forEach(key => delete state.files[key]);
    Object.keys(state.stats).forEach(key => delete state.stats[key]);
    state.resourcePath = null;
    state.results = [];
}

// Mock input setter
function setInput(name, value) {
    state.inputs[name] = value;
}

// Mock path input setter
function setPathInput(name, value, required, check) {
    state.pathInputs[name] = value;
}

// Mock boolean input setter
function setBoolInput(name, value) {
    state.boolInputs[name] = value === true || value === 'true';
}

// Mock file stats setter
function setStats(filePath, stats) {
    state.stats[filePath] = stats;
}

// Mock files setter
function setMockFiles(files) {
    Object.keys(files).forEach(key => {
        state.files[key] = files[key];
    });
}

// Public API mocks
const mockTaskLib = {
    // State management
    reset,
    setInput,
    setPathInput,
    setBoolInput,
    setStats,
    setMockFiles,
    
    // Mock API implementations
    getInput: (name, required) => {
        if (required && !state.inputs[name]) {
            throw new Error(`Input required: ${name}`);
        }
        return state.inputs[name] || '';
    },
    
    getBoolInput: (name, required) => {
        if (required && state.boolInputs[name] === undefined) {
            throw new Error(`Input required: ${name}`);
        }
        return state.boolInputs[name] || false;
    },
    
    getPathInput: (name, required, check) => {
        if (required && !state.pathInputs[name]) {
            throw new Error(`Path input required: ${name}`);
        }
        return state.pathInputs[name] || '';
    },
    
    getEndpointUrl: (id, optional) => {
        if (!optional && !state.inputs[`endpointUrl_${id}`]) {
            throw new Error(`Endpoint URL required: ${id}`);
        }
        return state.inputs[`endpointUrl_${id}`] || '';
    },
    
    getEndpointAuthorizationParameter: (id, key, optional) => {
        const paramName = `endpointAuth_${id}_${key}`;
        if (!optional && !state.inputs[paramName]) {
            throw new Error(`Endpoint auth param required: ${id} ${key}`);
        }
        return state.inputs[paramName] || '';
    },
    
    setResourcePath: (path) => {
        state.resourcePath = path;
    },
    
    setResult: (result, message) => {
        state.results.push({ result, message });
    },
    
    stats: (filePath) => {
        if (state.stats[filePath]) {
            return state.stats[filePath];
        }
        
        if (state.files[filePath]) {
            return {
                isFile: () => state.files[filePath].isFile || true,
                isDirectory: () => state.files[filePath].isDirectory || false
            };
        }
        
        return {
            isFile: () => false,
            isDirectory: () => false
        };
    },
    
    TaskResult,
    
    // Mock localization function
    loc: (key, ...params) => {
        // Simple mock that returns the key if no params, or interpolates params into the key
        if (params && params.length > 0) {
            let result = key;
            params.forEach((param, index) => {
                result = result.replace(`{${index}}`, param);
            });
            return result;
        }
        return key;
    }
};

module.exports = mockTaskLib;
