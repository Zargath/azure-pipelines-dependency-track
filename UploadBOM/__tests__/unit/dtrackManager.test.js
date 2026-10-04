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

jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    debug: jest.fn(),
    warning: jest.fn(),
    error: jest.fn()
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
      getProjectMetricsAsync: jest.fn()
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

  describe('waitEventProcessing', () => {
    it('should resolve once processing completes before the timeout', async () => {
      mockDtrackClient.pullProcessingStatusAsync
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await dtrackManager.waitEventProcessing('token123');

      expect(mockDtrackClient.pullProcessingStatusAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw PollingTimeoutExceeded when processing never completes in time', async () => {
      const shortTimeoutManager = new DtrackManager(mockDtrackClient, 0);
      mockDtrackClient.pullProcessingStatusAsync.mockResolvedValue(true);

      await expect(shortTimeoutManager.waitEventProcessing('token123'))
        .rejects
        .toThrow('PollingTimeoutExceeded: 0');
    });

    it('should propagate PollingFailed when the client throws', async () => {
      mockDtrackClient.pullProcessingStatusAsync.mockRejectedValue(new Error('network error'));

      await expect(dtrackManager.waitEventProcessing('token123'))
        .rejects
        .toThrow('PollingFailed: network error');
    });
  });

  describe('waitMetricsRefresh', () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';

    it('should resolve once lastOccurrence catches up to lastBomImport', async () => {
      mockDtrackClient.getProjectInfo.mockResolvedValue({ lastBomImport: '2024-01-01T00:00:00Z' });
      mockDtrackClient.getLastMetricCalculationDate
        .mockResolvedValueOnce(new Date('2023-12-31T00:00:00Z'))
        .mockResolvedValueOnce(new Date('2024-01-02T00:00:00Z'));

      await dtrackManager.waitMetricsRefresh(projectId);

      expect(mockDtrackClient.getLastMetricCalculationDate).toHaveBeenCalledTimes(2);
    });

    it('should throw PollingTimeoutExceeded when metrics never catch up in time', async () => {
      mockDtrackClient.getProjectInfo.mockResolvedValue({ lastBomImport: '2024-01-01T00:00:00Z' });
      mockDtrackClient.getLastMetricCalculationDate.mockResolvedValue(new Date('2023-12-31T00:00:00Z'));

      const shortTimeoutManager = new DtrackManager(mockDtrackClient, 0);

      await expect(shortTimeoutManager.waitMetricsRefresh(projectId))
        .rejects
        .toThrow('PollingTimeoutExceeded: 0');
    });

    it('should propagate PollingFailed when the client throws', async () => {
      mockDtrackClient.getProjectInfo.mockResolvedValue({ lastBomImport: '2024-01-01T00:00:00Z' });
      mockDtrackClient.getLastMetricCalculationDate.mockRejectedValue(new Error('network error'));

      await expect(dtrackManager.waitMetricsRefresh(projectId))
        .rejects
        .toThrow('PollingFailed: network error');
    });
  });
});