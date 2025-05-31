const path = require('path');
const fs = require('fs');
const DTrackClient = require('../../src/dtrackClient').default;
const DTrackManager = require('../../src/dtrackManager').default;
const DTrackTestFixture = require('./setup/DTrackTestFixture');
const { getTestApiKey, generateUniqueName } = require('./test-utils');

describe('DTrackManager Integration Tests - Parent and Child Projects', () => {
    const BASE_URL = 'http://localhost:8080';
    let client;
    let dtrackManager;
    let apiKey;
    let testBom;
    let dTrackTestFixture;

    beforeAll(() => {
        try {
            // Get API key and initialize client and manager
            apiKey = getTestApiKey();
            client = new DTrackClient(BASE_URL, apiKey);
            dtrackManager = new DTrackManager(client);
            dTrackTestFixture = new DTrackTestFixture(BASE_URL, apiKey);

            // Load test BOM file
            const bomPath = path.join(__dirname, 'setup/test-bom.json');
            testBom = fs.readFileSync(bomPath);
        } catch (error) {
            console.error('Failed to setup test:', error);
            throw error;
        }
    });

    it('should create a project upon BOM upload', async () => {
        const projectName = generateUniqueName('test-project');
        const projectVersion = '1.0.0';

        // Upload BOM and create project
        const token = await dtrackManager.uploadBomAndCreateProjectAsync(
            projectName,
            projectVersion,
            testBom
        );

        // Verify token was returned
        expect(token).toBeTruthy();

        // Wait for BOM processing to complete
        await dtrackManager.waitBomProcessing(token);

        // Get project UUID and verify it exists
        const projectId = await dtrackManager.getProjetUUID(
            projectName,
            projectVersion
        );

        expect(projectId).toBeTruthy();

        // Get project info and verify details
        const projectInfo = await dtrackManager.getProjectInfo(projectId);
        expect(projectInfo.name).toBe(projectName);
        expect(projectInfo.version).toBe(projectVersion);
    });

    it('should create a parent and child project relationship upon BOM upload when parent version is undefined', async () => {
        const parentProjectName = generateUniqueName('test-parent-project');
        const parentProjectVersion = undefined;
        const childProjectName = generateUniqueName('test-child-project');
        const childProjectVersion = '1.0.0';

        // Create parent project
        const parentProjectId =await dTrackTestFixture.createProject(parentProjectName, parentProjectVersion);

        // Upload BOM and create child project
        const token = await dtrackManager.uploadBomAndCreateChildProjectAsync(
            childProjectName,
            childProjectVersion,
            parentProjectName,
            parentProjectVersion,
            true, // isLatest
            testBom
        );

        // Verify token was returned
        expect(token).toBeTruthy();

        // Wait for BOM processing to complete
        await dtrackManager.waitBomProcessing(token);

        // Get child project UUID and verify it exists
        const childProjectId = await dtrackManager.getProjetUUID(
            childProjectName,
            childProjectVersion
        );

        expect(childProjectId).toBeTruthy();

        // Get child project info
        const childProjectInfo = await dtrackManager.getProjectInfo(childProjectId);
        expect(childProjectInfo.name).toBe(childProjectName);
        expect(childProjectInfo.version).toBe(childProjectVersion);

        // Verify child-parent relationship
        // Check if the child project is in the parent's children list
        const childrenResponse = await dTrackTestFixture.getProjectChildren(parentProjectId);
        const childrenIds = childrenResponse.map(project => project.uuid);

        expect(childrenIds).toContain(childProjectId);
    });

    it('should create a parent and child project relationship upon BOM upload when parent version is an empty string', async () => {
        const parentProjectName = generateUniqueName('test-parent-project');
        const parentProjectVersion = '';
        const childProjectName = generateUniqueName('test-child-project');
        const childProjectVersion = '1.0.0';

        // Create parent project
        const parentProjectId =await dTrackTestFixture.createProject(parentProjectName, parentProjectVersion);

        // Upload BOM and create child project
        const token = await dtrackManager.uploadBomAndCreateChildProjectAsync(
            childProjectName,
            childProjectVersion,
            parentProjectName,
            parentProjectVersion,
            true, // isLatest
            testBom
        );

        // Verify token was returned
        expect(token).toBeTruthy();

        // Wait for BOM processing to complete
        await dtrackManager.waitBomProcessing(token);

        // Get child project UUID and verify it exists
        const childProjectId = await dtrackManager.getProjetUUID(
            childProjectName,
            childProjectVersion
        );

        expect(childProjectId).toBeTruthy();

        // Get child project info
        const childProjectInfo = await dtrackManager.getProjectInfo(childProjectId);
        expect(childProjectInfo.name).toBe(childProjectName);
        expect(childProjectInfo.version).toBe(childProjectVersion);

        // Verify child-parent relationship
        // Check if the child project is in the parent's children list
        const childrenResponse = await dTrackTestFixture.getProjectChildren(parentProjectId);
        const childrenIds = childrenResponse.map(project => project.uuid);

        expect(childrenIds).toContain(childProjectId);
    });
});
