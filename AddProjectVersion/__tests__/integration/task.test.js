const path = require('path');
const fs = require('fs');
const { getTestApiKey, generateUniqueName } = require('./test-utils');
const mockTaskLib = require('./mocks/mockTaskLib');
const DTrackTestFixture = require('./fixtures/DTrackTestFixture');

// Import the run function from task.js
const { run } = require('../../src/task.js');

// Mock Azure DevOps Task Library
jest.mock('azure-pipelines-task-lib/task', () => mockTaskLib);

// Set environment to test to prevent auto-run
process.env.NODE_ENV = 'test';

describe('Task Integration Tests', () => {
    const BASE_URL = 'https://localhost:8080';
    let apiKey;
    let dTrackTestFixture;
    let caFilePath;
    let caFile;

    beforeAll(() => {
        try {
            // Get API key
            apiKey = getTestApiKey('Portfolio-Manager');
            caFilePath = path.join(__dirname, '../../../test-environment/certs', 'apiserver.crt');
            caFile = fs.existsSync(caFilePath) ? fs.readFileSync(caFilePath) : undefined;

            dTrackTestFixture = new DTrackTestFixture(BASE_URL, apiKey, caFile);

            // Setup mockTaskLib with proper inputs
            mockTaskLib.reset();
        } catch (error) {
            console.error('Failed to setup test.');
            throw error;
        }
    });

    beforeEach(() => {
        // Reset the mock task lib before each test
        mockTaskLib.reset();
    });

    it('should clone the latest project version into a new version', async () => {
        // Arrange
        const projectName = generateUniqueName('task-test-add-version');
        const previousVersion = '1.0.0';
        const newVersion = '1.0.1';

        // Create the previous version of the project, marked as the latest version
        const previousProjectId = await dTrackTestFixture.createProject(projectName, previousVersion, true);
        expect(previousProjectId).toBeTruthy();

        // Setup the task input parameters
        mockTaskLib.setInput('dtrackURI', BASE_URL);
        mockTaskLib.setInput('dtrackAPIKey', apiKey);
        mockTaskLib.setInput('dtrackProjName', projectName);
        mockTaskLib.setInput('dtrackProjVersion', newVersion);
        mockTaskLib.setBoolInput('dtrackIsLatest', true);
        mockTaskLib.setBoolInput('dtrackAddVersionTags', true);
        mockTaskLib.setBoolInput('dtrackAddVersionProperties', true);
        mockTaskLib.setBoolInput('dtrackAddVersionServices', true);
        mockTaskLib.setBoolInput('dtrackAddVersionACL', true);
        mockTaskLib.setBoolInput('dtrackAddVersionComponents', true);
        mockTaskLib.setBoolInput('dtrackAddVersionFindings', true);
        mockTaskLib.setBoolInput('dtrackAddVersionAuditHistory', true);
        mockTaskLib.setBoolInput('dtrackAddVersionPolicyViolations', true);
        mockTaskLib.setBoolInput('dtrackAddVersionPolicyViolationsAuditHistory', true);
        mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
        mockTaskLib.setStats(caFilePath, { isFile: () => true });

        // Act
        const taskResult = await run();

        // Assert
        expect(taskResult.projectId).toBeTruthy();
        expect(taskResult.projectId).not.toBe(previousProjectId);

        const newProjectInfo = await dTrackTestFixture.getProjectInfo(taskResult.projectId);
        expect(newProjectInfo.name).toBe(projectName);
        expect(newProjectInfo.version).toBe(newVersion);
        expect(newProjectInfo.isLatest).toBe(true);
    });
});
