const path = require('path');
const fs = require('fs');
const { getTestApiKey, generateUniqueName } = require('./test-utils');
const DTrackClient = require('../../src/dtrackClient').default;
const mockTaskLib = require('./mocks/mockTaskLib');
const DTrackTestFixture = require('./setup/DTrackTestFixture');

// Import the run function from task.js
const { run } = require('../../src/task.js');

// Mock Azure DevOps Task Library
jest.mock('azure-pipelines-task-lib/task', () => mockTaskLib);

// Set environment to test to prevent auto-run
process.env.NODE_ENV = 'test';

describe('Task Integration Tests', () => {
    const BASE_URL = 'https://localhost:8080';
    let apiKey;
    let testBom;
    let dTrackTestFixture;
    let testBomFilePath;
    let caFilePath;
    let caFile;
    
    beforeAll(() => {
        try {
            // Get API key
            apiKey = getTestApiKey();
            caFilePath = path.join(__dirname, 'setup/certs', 'apiserver.crt');
            caFile = fs.existsSync(caFilePath) ? fs.readFileSync(caFilePath) : undefined;

            dTrackTestFixture = new DTrackTestFixture(BASE_URL, apiKey, caFile);

            // Load test BOM file
            testBomFilePath = path.join(__dirname, 'setup/test-bom.json');
            testBom = fs.readFileSync(testBomFilePath);
            
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
    
    it('should upload BOM and create a project', async () => {
        // Arrange
        const projectName = generateUniqueName('task-test-project');
        const projectVersion = '1.0.0';
        
        // Setup the task input parameters
        mockTaskLib.setInput('dtrackURI', BASE_URL);
        mockTaskLib.setInput('dtrackAPIKey', getTestApiKey('Project-Creator'));
        mockTaskLib.setInput('dtrackProjName', projectName);
        mockTaskLib.setInput('dtrackProjVersion', projectVersion);
        mockTaskLib.setPathInput('bomFilePath', testBomFilePath, true, true);
        mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
        mockTaskLib.setBoolInput('dtrackProjAutoCreate', true);
        mockTaskLib.setStats(testBomFilePath, { isFile: () => true });
        mockTaskLib.setStats(caFilePath, { isFile: () => true });

        // Run the task module
        await run();
        
        // Verify the project was created
        const client = new DTrackClient(BASE_URL, apiKey, caFile);
        
        // Check that project exists
        const projectId = await client.getProjectUUID(projectName, projectVersion);
        expect(projectId).toBeTruthy();
        
        // Check project info
        const projectInfo = await client.getProjectInfo(projectId);
        expect(projectInfo.name).toBe(projectName);
        expect(projectInfo.version).toBe(projectVersion);

        // Check default values
        expect(projectInfo.isLatest).toBe(false);
        expect(projectInfo.active).toBe(true);
    });
    
    it('should upload BOM to an existing project', async () => {
        // Arrange
        const projectName = generateUniqueName('task-test-existing-project');
        const projectVersion = '1.0.0';
        
        // First create the project
        const projectId = await dTrackTestFixture.createProject(projectName, projectVersion);
        expect(projectId).toBeTruthy();
        
        // Setup the task input parameters to upload to existing project
        mockTaskLib.setInput('dtrackURI', BASE_URL);
        mockTaskLib.setInput('dtrackAPIKey', getTestApiKey('BOM-Upload-Viewer'));
        mockTaskLib.setInput('dtrackProjId', projectId);
        mockTaskLib.setPathInput('bomFilePath', testBomFilePath, true, true);
        mockTaskLib.setStats(testBomFilePath, { isFile: () => true });
        mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
        mockTaskLib.setStats(caFilePath, { isFile: () => true });
        
        // Run the task module
        await run();
        
        // Verify the BOM was uploaded
        const client = new DTrackClient(BASE_URL, apiKey, caFile);
        
        // Get project info and check if lastBomImport has a value
        const projectInfo = await client.getProjectInfo(projectId);
        expect(projectInfo.lastBomImport).toBeTruthy();
    });
    
    it('should upload BOM and create a child project', async () => {
        // Arrange
        const parentProjectName = generateUniqueName('task-test-parent');
        const parentProjectVersion = '1.0.0';
        const childProjectName = generateUniqueName('task-test-child');
        const childProjectVersion = '1.0.0';
        
        // First create the parent project
        const parentProjectId = await dTrackTestFixture.createProject(parentProjectName, parentProjectVersion);
        expect(parentProjectId).toBeTruthy();
        
        // Setup the task input parameters to create child project
        mockTaskLib.setInput('dtrackURI', BASE_URL);
        mockTaskLib.setInput('dtrackAPIKey', getTestApiKey('Project-Creator'));
        mockTaskLib.setInput('dtrackProjName', childProjectName);
        mockTaskLib.setInput('dtrackProjVersion', childProjectVersion);
        mockTaskLib.setInput('dtrackParentProjName', parentProjectName);
        mockTaskLib.setInput('dtrackParentProjVersion', parentProjectVersion);
        mockTaskLib.setPathInput('bomFilePath', testBomFilePath, true, true);
        mockTaskLib.setBoolInput('dtrackProjAutoCreate', true);
        mockTaskLib.setBoolInput('dtrackIsLatest', true);
        mockTaskLib.setStats(testBomFilePath, { isFile: () => true });
        mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
        mockTaskLib.setStats(caFilePath, { isFile: () => true });
        
        // Run the task module
        await run();
        
        // Verify the child project was created
        const client = new DTrackClient(BASE_URL, apiKey, caFile);
        
        // Check that child project exists
        const childProjectId = await client.getProjectUUID(childProjectName, childProjectVersion);
        expect(childProjectId).toBeTruthy();
        
        // Check child project info
        const childProjectInfo = await client.getProjectInfo(childProjectId);
        expect(childProjectInfo.name).toBe(childProjectName);
        expect(childProjectInfo.version).toBe(childProjectVersion);
        
        // Verify child-parent relationship
        const childrenResponse = await dTrackTestFixture.getProjectChildren(parentProjectId);
        
        const childrenIds = childrenResponse.map(project => project.uuid);
        expect(childrenIds).toContain(childProjectId);
    });
    
    // Test for GitHub issue #78: dtrackIsLatest not being set correctly
    it('should correctly set isLatest flag for child project when uploading BOM with dtrackIsLatest=true', async () => {
        // Arrange
        const parentProjectName = generateUniqueName('parent-project-issue-78');
        const parentProjectVersion = '1.0.0';
        const childProjectName = generateUniqueName('child-project-issue-78');
        const childProjectVersion = '1.0.1';
        
        // First create the parent project
        const parentProjectId = await dTrackTestFixture.createProject(parentProjectName, parentProjectVersion);
        expect(parentProjectId).toBeTruthy();
        
        // Setup the task input parameters with dtrackIsLatest=true
        mockTaskLib.setInput('dtrackURI', BASE_URL);
        mockTaskLib.setInput('dtrackAPIKey', getTestApiKey('Project-Creator'));
        mockTaskLib.setInput('dtrackProjName', childProjectName);
        mockTaskLib.setInput('dtrackProjVersion', childProjectVersion);
        mockTaskLib.setInput('dtrackParentProjName', parentProjectName);
        mockTaskLib.setInput('dtrackParentProjVersion', parentProjectVersion);
        mockTaskLib.setInput('dtrackProjClassifier', 'APPLICATION');
        mockTaskLib.setPathInput('bomFilePath', testBomFilePath, true, true);
        mockTaskLib.setBoolInput('dtrackProjAutoCreate', true);
        mockTaskLib.setBoolInput('dtrackIsLatest', true);
        mockTaskLib.setStats(testBomFilePath, { isFile: () => true });
        mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
        mockTaskLib.setStats(caFilePath, { isFile: () => true });
        
        // Run the task module
        await run();
        
        // Verify the child project was created
        const client = new DTrackClient(BASE_URL, apiKey, caFile);
        
        // Check that child project exists
        const childProjectId = await client.getProjectUUID(childProjectName, childProjectVersion);
        expect(childProjectId).toBeTruthy();
        
        // Check child project info
        const childProjectInfo = await client.getProjectInfo(childProjectId);
        expect(childProjectInfo.name).toBe(childProjectName);
        expect(childProjectInfo.version).toBe(childProjectVersion);
        
        // Specifically verify that isLatest is set to true
        expect(childProjectInfo.isLatest).toBe(true);
        
        // Verify child-parent relationship
        const childrenResponse = await dTrackTestFixture.getProjectChildren(parentProjectId);
        const childrenIds = childrenResponse.map(project => project.uuid);
        expect(childrenIds).toContain(childProjectId);
    });

    it('should correctly set isLatest flag for parentless project when uploading BOM with dtrackIsLatest=true', async () => {
        // Arrange
        const projectName = generateUniqueName('parentless-project-issue-78');
        const projectVersion = '1.0.0';
        
        // Setup the task input parameters with dtrackIsLatest=true
        mockTaskLib.setInput('dtrackURI', BASE_URL);
        mockTaskLib.setInput('dtrackAPIKey', getTestApiKey('Project-Creator'));
        mockTaskLib.setInput('dtrackProjName', projectName);
        mockTaskLib.setInput('dtrackProjVersion', projectVersion);
        mockTaskLib.setInput('dtrackProjClassifier', 'APPLICATION');
        mockTaskLib.setPathInput('bomFilePath', testBomFilePath, true, true);
        mockTaskLib.setBoolInput('dtrackProjAutoCreate', true);
        mockTaskLib.setBoolInput('dtrackIsLatest', true);
        mockTaskLib.setStats(testBomFilePath, { isFile: () => true });
        mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
        mockTaskLib.setStats(caFilePath, { isFile: () => true });
        
        // Run the task module
        await run();
        
        // Verify the project was created
        const client = new DTrackClient(BASE_URL, apiKey, caFile);
        
        // Check that child project exists
        const projectId = await client.getProjectUUID(projectName, projectVersion);
        expect(projectId).toBeTruthy();
        
        // Check child project info
        const projectInfo = await client.getProjectInfo(projectId);
        expect(projectInfo.name).toBe(projectName);
        expect(projectInfo.version).toBe(projectVersion);
        
        // Specifically verify that isLatest is set to true
        expect(projectInfo.isLatest).toBe(true);
    });

    it('should upload BOM and create a child project when parent project version is undefined', async () => {
        // Arrange
        const parentProjectName = generateUniqueName('task-test-parent-empty-version');
        const parentProjectVersion = undefined;
        const childProjectName = generateUniqueName('task-test-child-parent-empty-version');
        const childProjectVersion = '1.0.0';
        
        // First create the parent project
        const parentProjectId = await dTrackTestFixture.createProject(parentProjectName, parentProjectVersion);
        expect(parentProjectId).toBeTruthy();
        
        // Setup the task input parameters to create child project
        mockTaskLib.setInput('dtrackURI', BASE_URL);
        mockTaskLib.setInput('dtrackAPIKey', getTestApiKey('Project-Creator'));
        mockTaskLib.setInput('dtrackProjName', childProjectName);
        mockTaskLib.setInput('dtrackProjVersion', childProjectVersion);
        mockTaskLib.setInput('dtrackParentProjName', parentProjectName);
        mockTaskLib.setPathInput('bomFilePath', testBomFilePath, true, true);
        mockTaskLib.setBoolInput('dtrackProjAutoCreate', true);
        mockTaskLib.setBoolInput('dtrackIsLatest', true);
        mockTaskLib.setStats(testBomFilePath, { isFile: () => true });
        mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
        mockTaskLib.setStats(caFilePath, { isFile: () => true });
        
        // Run the task module
        await run();
        
        // Verify the child project was created
        const client = new DTrackClient(BASE_URL, apiKey, caFile);
        
        // Check that child project exists
        const childProjectId = await client.getProjectUUID(childProjectName, childProjectVersion);
        expect(childProjectId).toBeTruthy();
        
        // Check child project info
        const childProjectInfo = await client.getProjectInfo(childProjectId);
        expect(childProjectInfo.name).toBe(childProjectName);
        expect(childProjectInfo.version).toBe(childProjectVersion);
        
        // Verify child-parent relationship
        const childrenResponse = await dTrackTestFixture.getProjectChildren(parentProjectId);
        
        const childrenIds = childrenResponse.map(project => project.uuid);
        expect(childrenIds).toContain(childProjectId);
    });

    it('should upload BOM and create a child project when parent project version is empty', async () => {
        // Arrange
        const parentProjectName = generateUniqueName('task-test-parent-empty-version');
        const parentProjectVersion = '';
        const childProjectName = generateUniqueName('task-test-child-parent-empty-version');
        const childProjectVersion = '1.0.0';
        
        // First create the parent project
        const parentProjectId = await dTrackTestFixture.createProject(parentProjectName, parentProjectVersion);
        expect(parentProjectId).toBeTruthy();
        
        // Setup the task input parameters to create child project
        mockTaskLib.setInput('dtrackURI', BASE_URL);
        mockTaskLib.setInput('dtrackAPIKey', getTestApiKey('Project-Creator'));
        mockTaskLib.setInput('dtrackProjName', childProjectName);
        mockTaskLib.setInput('dtrackProjVersion', childProjectVersion);
        mockTaskLib.setInput('dtrackParentProjName', parentProjectName);
        mockTaskLib.setPathInput('bomFilePath', testBomFilePath, true, true);
        mockTaskLib.setBoolInput('dtrackProjAutoCreate', true);
        mockTaskLib.setBoolInput('dtrackIsLatest', true);
        mockTaskLib.setStats(testBomFilePath, { isFile: () => true });
        mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
        mockTaskLib.setStats(caFilePath, { isFile: () => true });
        
        // Run the task module
        await run();
        
        // Verify the child project was created
        const client = new DTrackClient(BASE_URL, apiKey, caFile);
        
        // Check that child project exists
        const childProjectId = await client.getProjectUUID(childProjectName, childProjectVersion);
        expect(childProjectId).toBeTruthy();
        
        // Check child project info
        const childProjectInfo = await client.getProjectInfo(childProjectId);
        expect(childProjectInfo.name).toBe(childProjectName);
        expect(childProjectInfo.version).toBe(childProjectVersion);
        
        // Verify child-parent relationship
        const childrenResponse = await dTrackTestFixture.getProjectChildren(parentProjectId);
        
        const childrenIds = childrenResponse.map(project => project.uuid);
        expect(childrenIds).toContain(childProjectId);
    });

    it('should upload BOM to an existing project and wait for processing to complete', async () => {
        // Arrange
        const projectName = generateUniqueName('task-test-existing-project');
        const projectVersion = '1.0.0';
        
        // First create the project
        const projectId = await dTrackTestFixture.createProject(projectName, projectVersion);
        expect(projectId).toBeTruthy();

        const client = new DTrackClient(BASE_URL, apiKey, caFile);
        const initialLastOccurrence = await client.getLastMetricCalculationDate(projectId);
        
        // Setup the task input parameters to upload to existing project
        mockTaskLib.setInput('dtrackURI', BASE_URL);
        mockTaskLib.setInput('dtrackAPIKey', getTestApiKey('BOM-Upload-Viewer'));
        mockTaskLib.setInput('dtrackProjId', projectId);
        mockTaskLib.setInput('thresholdAction', 'warn');
        mockTaskLib.setInput('thresholdCritical', '1');
        mockTaskLib.setPathInput('bomFilePath', testBomFilePath, true, true);
        mockTaskLib.setStats(testBomFilePath, { isFile: () => true });
        mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
        mockTaskLib.setStats(caFilePath, { isFile: () => true });
        
        // Run the task module
        await run();
        
        // Get project info and metrics
        const projectInfo = await client.getProjectInfo(projectId);
        const newLastOccurrence = await client.getLastMetricCalculationDate(projectId);
        
        expect(projectInfo.lastBomImport).toBeTruthy();
        expect(newLastOccurrence).toBeTruthy();
        
        // Check that the initial last occurrence was the default value before upload
        expect(new Date(initialLastOccurrence).getTime()).toBe(new Date(0).getTime());

        // Check that the lastBomImport is after the initial last occurrence
        expect(new Date(projectInfo.lastBomImport).getTime()).toBeGreaterThan(new Date(initialLastOccurrence).getTime());

        // Check that the new last occurrence is after the lastBomImport and the initial last occurrence
        expect(new Date(newLastOccurrence).getTime()).toBeGreaterThanOrEqual(new Date(projectInfo.lastBomImport).getTime());
        expect(new Date(newLastOccurrence).getTime()).toBeGreaterThan(new Date(initialLastOccurrence).getTime());
    });

    it('should update all project properties correctly', async () => {
        // Arrange
        const projectName = generateUniqueName('task-test-update-project');
        const projectVersion = '1.0.0';
        
        // First create the project
        const projectId = await dTrackTestFixture.createProject(projectName, projectVersion);
        expect(projectId).toBeTruthy();
        
        // Get initial project info
        const client = new DTrackClient(BASE_URL, apiKey, caFile);
        const initialProjectInfo = await client.getProjectInfo(projectId);
        
        // Set up the update parameters
        const description = 'Updated test project description';
        const classifier = 'FRAMEWORK'; // Use a different classifier than the default 'APPLICATION'
        const swidTagId = 'swidTag123';
        const group = 'test-group';
        const tags = ['test-tag1', 'test-tag2'];
        const isLatest = true;
        
        // Setup the task input parameters for updating the project
        mockTaskLib.setInput('dtrackURI', BASE_URL);
        mockTaskLib.setInput('dtrackAPIKey', getTestApiKey('Portfolio-Manager'));
        mockTaskLib.setInput('dtrackProjId', projectId);
        mockTaskLib.setInput('dtrackProjDescription', description);
        mockTaskLib.setInput('dtrackProjClassifier', classifier);
        mockTaskLib.setInput('dtrackProjSwidTagId', swidTagId);
        mockTaskLib.setInput('dtrackProjGroup', group);
        mockTaskLib.setInput('dtrackProjTags', tags.join('\n'));
        mockTaskLib.setBoolInput('dtrackIsLatest', isLatest);
        mockTaskLib.setPathInput('bomFilePath', testBomFilePath, true, true);
        mockTaskLib.setStats(testBomFilePath, { isFile: () => true });
        mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
        mockTaskLib.setStats(caFilePath, { isFile: () => true });
        
        // Run the task module with only update parameters (no BOM upload)
        await run();
        
        // Get updated project info
        const updatedProjectInfo = await client.getProjectInfo(projectId);
        
        // Assert each property was updated correctly
        expect(updatedProjectInfo.description).toBe(description);
        expect(updatedProjectInfo.classifier).toBe(classifier);
        expect(updatedProjectInfo.swidTagId).toBe(swidTagId);
        expect(updatedProjectInfo.group).toBe(group);
        
        // Check tags (they come back as objects with name property)
        expect(updatedProjectInfo.tags).toHaveLength(tags.length);
        const updatedTags = updatedProjectInfo.tags.map(tag => tag.name);
        tags.forEach(tag => {
            expect(updatedTags).toContain(tag);
        });
        
        // Verify the values have actually changed from the initial state
        expect(updatedProjectInfo.description).not.toBe(initialProjectInfo.description);
        expect(updatedProjectInfo.classifier).not.toBe(initialProjectInfo.classifier);
        expect(updatedProjectInfo.swidTagId).not.toBe(initialProjectInfo.swidTagId || '');
        expect(updatedProjectInfo.group).not.toBe(initialProjectInfo.group || '');
        
        // Verify initial tags were different
        const initialTags = initialProjectInfo.tags ? initialProjectInfo.tags.map(tag => tag.name) : [];
        expect(updatedTags.sort().join(',')).not.toBe(initialTags.sort().join(','));
        
        // Check boolean flags
        expect(updatedProjectInfo.isLatest).toBe(isLatest);
        expect(updatedProjectInfo.isLatest).not.toBe(initialProjectInfo.isLatest);
        
        // Ensure name and version haven't changed
        expect(updatedProjectInfo.name).toBe(projectName);
        expect(updatedProjectInfo.version).toBe(projectVersion);
    });
});
