import DtrackManager from '../../src/dtrackManager';
import { localize } from '../../src/localization';

// Mock dependencies
jest.mock('../../src/localization', () => ({
  localize: jest.fn((key, ...params) => `${key}: ${params.join(' ')}`)
}));

jest.mock('../../src/utils', () => ({
  __esModule: true,
  default: {
    getErrorMessage: jest.fn(err => err.message || String(err)),
    sleepAsync: jest.fn(() => Promise.resolve())
  }
}));

describe('DtrackManager', () => {
  let dtrackManager;
  let mockDtrackClient;

  beforeEach(() => {
    // Create a mock DTrackClient
    mockDtrackClient = {
      getProjectUUID: jest.fn(),
      getProjectInfo: jest.fn(),
      updateProject: jest.fn(),
      uploadBomAsync: jest.fn(),
      uploadBomAndCreateProjectAsync: jest.fn(),
      uploadBomAndCreateChildProjectAsync: jest.fn(),
      pullProcessingStatusAsync: jest.fn(),
      getLastMetricCalculationDate: jest.fn(),
      getProjectMetricsAsync: jest.fn(),
      getProjectByNameAndVersion: jest.fn(),
      getLatestProjectVersion: jest.fn(),
      getVersion: jest.fn(),
      cloneProjectV1Async: jest.fn(),
      cloneProjectV2Async: jest.fn()
    };

    dtrackManager = new DtrackManager(mockDtrackClient);
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getProjetUUID', () => {
    it('should return project UUID when successful', async () => {
      // Arrange
      const projectName = 'test-project';
      const projectVersion = '1.0.0';
      const expectedUUID = '123e4567-e89b-12d3-a456-426614174000';
      mockDtrackClient.getProjectUUID.mockResolvedValue(expectedUUID);

      // Act
      const result = await dtrackManager.getProjetUUID(projectName, projectVersion);

      // Assert
      expect(result).toBe(expectedUUID);
      expect(mockDtrackClient.getProjectUUID).toHaveBeenCalledWith(projectName, projectVersion);
    });

    it('should throw error when project not found', async () => {
      // Arrange
      const projectName = 'test-project';
      const projectVersion = '1.0.0';
      const errorMessage = 'Project not found';
      mockDtrackClient.getProjectUUID.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(dtrackManager.getProjetUUID(projectName, projectVersion))
        .rejects
        .toThrow('ProjectNotFound: test-project 1.0.0');
    });
  });

  describe('updateProject', () => {
    it('should update project when properties are different', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const description = 'New description';
      const classifier = 'APPLICATION';
      const swidTagId = 'swid:example.com:product:1.0.0';
      const group = 'com.example';
      const tags = ['tag1', 'tag2'];
      const isLatest = true;

      const existingProject = {
        name: 'test-project',
        version: '1.0.0',
        description: 'Old description',
        classifier: 'LIBRARY',
        swidTagId: '',
        group: '',
        tags: [],
        isLatest: false,
        active: true
      };

      const updatedProject = {
        ...existingProject,
        description,
        classifier,
        swidTagId,
        group,
        tags: tags.map(tag => ({ name: tag })),
        isLatest
      };

      mockDtrackClient.getProjectInfo.mockResolvedValue(existingProject);
      mockDtrackClient.updateProject.mockResolvedValue(updatedProject);

      // Act
      await dtrackManager.updateProject(projectId, description, classifier, swidTagId, group, tags, isLatest);

      // Assert
      expect(mockDtrackClient.getProjectInfo).toHaveBeenCalledWith(projectId);
      expect(mockDtrackClient.updateProject).toHaveBeenCalledWith(
        projectId,
        description,
        classifier,
        swidTagId,
        group,
        tags.map(tag => ({ name: tag })),
        isLatest
      );
    });

    it('should not update project when properties are the same', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const description = 'Existing description';
      const classifier = 'APPLICATION';
      const swidTagId = 'swid:example.com:product:1.0.0';
      const group = 'com.example';
      const tags = ['tag1', 'tag2'];

      const existingProject = {
        name: 'test-project',
        version: '1.0.0',
        description,
        classifier,
        swidTagId,
        group,
        tags: tags.map(tag => ({ name: tag })),
        isLatest: false
      };

      mockDtrackClient.getProjectInfo.mockResolvedValue(existingProject);

      // Act
      await dtrackManager.updateProject(projectId, description, classifier, swidTagId, group, tags, false);

      // Assert
      expect(mockDtrackClient.getProjectInfo).toHaveBeenCalledWith(projectId);
      expect(mockDtrackClient.updateProject).not.toHaveBeenCalled();
    });

    it('should handle error during project update', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const errorMessage = 'Update failed';
      
      mockDtrackClient.getProjectInfo.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(dtrackManager.updateProject(projectId, "New description", null, null, null, [], null))
        .rejects
        .toThrow('ProjectUpdateFailed: Update failed');
    });
  });

  describe('tryGetProjectUUID', () => {
    it('should return the project uuid when found', async () => {
      const expectedUUID = '123e4567-e89b-12d3-a456-426614174000';
      mockDtrackClient.getProjectByNameAndVersion.mockResolvedValue({ uuid: expectedUUID });

      const result = await dtrackManager.tryGetProjectUUID('test-project', '1.0.0');

      expect(result).toBe(expectedUUID);
      expect(mockDtrackClient.getProjectByNameAndVersion).toHaveBeenCalledWith('test-project', '1.0.0');
    });

    it('should return null when the project is not found', async () => {
      mockDtrackClient.getProjectByNameAndVersion.mockResolvedValue(null);

      const result = await dtrackManager.tryGetProjectUUID('test-project', '1.0.0');

      expect(result).toBeNull();
    });
  });

  describe('getDtrackMajorVersion', () => {
    it('should return the major version as a number', async () => {
      mockDtrackClient.getVersion.mockResolvedValue('4.12.3');

      const result = await dtrackManager.getDtrackMajorVersion();

      expect(result).toBe(4);
    });

    it('should throw an error when the version cannot be retrieved', async () => {
      mockDtrackClient.getVersion.mockRejectedValue(new Error('Request failed'));

      await expect(dtrackManager.getDtrackMajorVersion())
        .rejects
        .toThrow('GetVersionFailed: Request failed');
    });
  });

  describe('cloneLatestProjectVersion', () => {
    const cloneOptions = {
      tags: true,
      properties: true,
      services: true,
      acl: true,
      components: true,
      findings: true,
      auditHistory: true,
      policyViolations: true,
      policyViolationsAuditHistory: true
    };

    it('should return null when there is no previous version to clone', async () => {
      mockDtrackClient.getLatestProjectVersion.mockResolvedValue(null);

      const result = await dtrackManager.cloneLatestProjectVersion('test-project', '2.0.0', false, cloneOptions);

      expect(result).toBeNull();
      expect(mockDtrackClient.getVersion).not.toHaveBeenCalled();
    });

    it('should return null when the latest version already matches the requested version', async () => {
      mockDtrackClient.getLatestProjectVersion.mockResolvedValue({ uuid: 'existing-uuid', name: 'test-project', version: '2.0.0' });

      const result = await dtrackManager.cloneLatestProjectVersion('test-project', '2.0.0', false, cloneOptions);

      expect(result).toBeNull();
      expect(mockDtrackClient.getVersion).not.toHaveBeenCalled();
    });

    it('should clone using the v2 API when Dependency Track is v5 or newer', async () => {
      const latestUuid = '123e4567-e89b-12d3-a456-426614174000';
      const newUuid = '223e4567-e89b-12d3-a456-426614174001';
      mockDtrackClient.getLatestProjectVersion.mockResolvedValue({ uuid: latestUuid, name: 'test-project', version: '1.0.0' });
      mockDtrackClient.getVersion.mockResolvedValue('5.1.0');
      mockDtrackClient.cloneProjectV2Async.mockResolvedValue(newUuid);

      const result = await dtrackManager.cloneLatestProjectVersion('test-project', '2.0.0', true, cloneOptions);

      expect(result).toBe(newUuid);
      expect(mockDtrackClient.cloneProjectV2Async).toHaveBeenCalledWith(latestUuid, '2.0.0', true, cloneOptions);
      expect(mockDtrackClient.cloneProjectV1Async).not.toHaveBeenCalled();
    });

    it('should clone using the v1 API and poll for completion when Dependency Track is v4', async () => {
      const latestUuid = '123e4567-e89b-12d3-a456-426614174000';
      const newUuid = '223e4567-e89b-12d3-a456-426614174001';
      const token = 'token-123';
      mockDtrackClient.getLatestProjectVersion.mockResolvedValue({ uuid: latestUuid, name: 'test-project', version: '1.0.0' });
      mockDtrackClient.getVersion.mockResolvedValue('4.12.3');
      mockDtrackClient.cloneProjectV1Async.mockResolvedValue(token);
      mockDtrackClient.pullProcessingStatusAsync.mockResolvedValue(false);
      mockDtrackClient.getProjectByNameAndVersion.mockResolvedValue({ uuid: newUuid, name: 'test-project', version: '2.0.0' });

      const result = await dtrackManager.cloneLatestProjectVersion('test-project', '2.0.0', true, cloneOptions);

      expect(result).toBe(newUuid);
      expect(mockDtrackClient.cloneProjectV1Async).toHaveBeenCalledWith(latestUuid, '2.0.0', true, cloneOptions);
      expect(mockDtrackClient.pullProcessingStatusAsync).toHaveBeenCalledWith(token);
      expect(mockDtrackClient.cloneProjectV2Async).not.toHaveBeenCalled();
    });

    it('should throw an error when cloning fails', async () => {
      mockDtrackClient.getLatestProjectVersion.mockRejectedValue(new Error('Request failed'));

      await expect(dtrackManager.cloneLatestProjectVersion('test-project', '2.0.0', true, cloneOptions))
        .rejects
        .toThrow('CloneFailed: Request failed');
    });
  });

  describe('uploadBomAsync', () => {
    it('should upload BOM successfully', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const bom = 'BOM content';
      const expectedToken = 'token123';
      
      mockDtrackClient.uploadBomAsync.mockResolvedValue(expectedToken);

      // Act
      const result = await dtrackManager.uploadBomAsync(projectId, bom);

      // Assert
      expect(result).toBe(expectedToken);
      expect(mockDtrackClient.uploadBomAsync).toHaveBeenCalledWith(projectId, bom);
    });

    it('should handle upload error', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const bom = 'BOM content';
      const errorMessage = 'Upload failed';
      
      mockDtrackClient.uploadBomAsync.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(dtrackManager.uploadBomAsync(projectId, bom))
        .rejects
        .toThrow('BOMUploadFailed: Upload failed');
    });
  });
});