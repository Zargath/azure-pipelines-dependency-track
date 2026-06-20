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
            console.error('Failed to setup test:', error);
            throw error;
        }
    });

    beforeEach(() => {
        // Reset the mock task lib before each test
        mockTaskLib.reset();
    });

    function setupCommonInputs(projectName, version) {
        mockTaskLib.setInput('dtrackURI', BASE_URL);
        mockTaskLib.setInput('dtrackAPIKey', apiKey);
        mockTaskLib.setInput('dtrackProjName', projectName);
        mockTaskLib.setInput('dtrackProjVersion', version);
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
    }

    it('should clone the latest project version into a new version', async () => {
        // Arrange
        const projectName = generateUniqueName('task-test-add-version');
        const previousVersion = '1.0.0';
        const newVersion = '1.0.1';

        const previousProjectId = await dTrackTestFixture.createProject(projectName, previousVersion, true);
        expect(previousProjectId).toBeTruthy();

        setupCommonInputs(projectName, newVersion);

        // Act
        const taskResult = await run();

        // Assert
        expect(taskResult.created).toBe(true);
        expect(taskResult.projectId).toBeTruthy();
        expect(taskResult.projectId).not.toBe(previousProjectId);

        const newProjectInfo = await dTrackTestFixture.getProjectInfo(taskResult.projectId);
        expect(newProjectInfo.name).toBe(projectName);
        expect(newProjectInfo.version).toBe(newVersion);
        expect(newProjectInfo.isLatest).toBe(true);
    });

    it('should return created=false when the requested version already exists', async () => {
        // Arrange
        const projectName = generateUniqueName('task-test-already-exists');
        const version = '1.0.0';

        const existingProjectId = await dTrackTestFixture.createProject(projectName, version, true);
        expect(existingProjectId).toBeTruthy();

        setupCommonInputs(projectName, version);

        // Act
        const taskResult = await run();

        // Assert — version already existed, nothing was created
        expect(taskResult.created).toBe(false);
        expect(taskResult.projectId).toBe(existingProjectId);
    });

    it('should return created=false with the existing project id when the target version is already the isLatest version', async () => {
        // This covers a re-run scenario: the target version was created by a previous pipeline run
        // and is now the isLatest version. Even if the lookup-by-name-and-version check misses it,
        // cloneLatestProjectVersion must detect this via the /latest endpoint and not say "Nothing to do".
        const projectName = generateUniqueName('task-test-target-is-latest');
        const version = '1.2.0';

        // Create the project with the target version already marked as isLatest
        const existingProjectId = await dTrackTestFixture.createProject(projectName, version, true);
        expect(existingProjectId).toBeTruthy();

        // Set up inputs targeting the same version that is already the latest
        setupCommonInputs(projectName, version);

        // Act
        const taskResult = await run();

        // Assert — target version already exists as the latest, nothing was created
        expect(taskResult.created).toBe(false);
        expect(taskResult.projectId).toBe(existingProjectId);
    });

    it('should return created=false when no previous version exists to clone from', async () => {
        // Arrange — use a project name that does not exist in DTrack
        const projectName = generateUniqueName('task-test-no-previous-version');
        const version = '1.0.0';

        setupCommonInputs(projectName, version);

        // Act
        const taskResult = await run();

        // Assert — no previous version to clone from, nothing was created
        expect(taskResult.created).toBe(false);
        expect(taskResult.projectId).toBeNull();
    });
});
