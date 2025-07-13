import DTrackClient from '../../src/dtrackClient';
import axios from 'axios';

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
  }))
}));

describe('DTrackClient', () => {
  let client;
  let mockAxiosInstance;
  const apiKey = '';

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      put: jest.fn(),
    };
    
    axios.create.mockReturnValue(mockAxiosInstance);
    client = new DTrackClient('http://localhost:8080', apiKey);

    jest.clearAllMocks();
  });

  it('should get project info successfully', async () => {
    // Arrange
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    mockAxiosInstance.get.mockResolvedValue({
      status: 200,
      data: { uuid: projectId }
    });

    // Act
    const result = await client.getProjectInfo(projectId);

    // Assert
    expect(result).toEqual({ uuid: projectId });
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/v1/project/${projectId}`);
  });

  it('should handle errors when getting project info', async () => {
    // Arrange
    const error = new Error('Not Found');
    error.response = { status: 404 };
    mockAxiosInstance.get.mockRejectedValue(error);

    // Act
    const promise = client.getProjectInfo('123e4567-e89b-12d3-a456-426614174000');

    // Assert
    await expect(promise).rejects.toEqual({ error, response: error.response });
  });

  it('should get project uuid successfully', async () => {
    // Arrange
    const projectName = 'ProjectName';
    const projectVersion = '1.0.0';
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    mockAxiosInstance.get.mockResolvedValue({
      status: 200,
      data: { uuid: projectId }
    });

    // Act
    const result = await client.getProjectUUID(projectName, projectVersion);

    // Assert
    expect(result).toEqual(projectId);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/v1/project/lookup?name=${projectName}&version=${projectVersion}`);
  });

  it('should pull processing status successfully', async () => {
    // Arrange
    const isProcessing = true;
    const token = '1b0afc40-a8a1-4ed1-8a23-c464b24f1ddd';
    mockAxiosInstance.get.mockResolvedValue({
      status: 200,
      data: { processing: isProcessing }
    });

    // Act
    const result = await client.pullProcessingStatusAsync(token);

    // Assert
    expect(result).toEqual(isProcessing);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/v1/event/token/${token}`);
  });

  it('should get project metrics successfully', async () => {
    // Arrange
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const expectedResults = { example: 'data' };
    mockAxiosInstance.get.mockResolvedValue({
      status: 200,
      data: expectedResults
    });

    // Act
    const result = await client.getProjectMetricsAsync(projectId);

    // Assert
    expect(result).toEqual(expectedResults);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/v1/metrics/project/${projectId}/current`);
  });

  it('should get last metric calculation date successfully', async () => {
    // Arrange
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const lastOccurrence = '2023-10-01T00:00:00Z';
    const expectedResults = new Date(lastOccurrence);
    mockAxiosInstance.get.mockResolvedValue({
      status: 200,
      data: { lastOccurrence: lastOccurrence }
    });

    // Act
    const result = await client.getLastMetricCalculationDate(projectId);

    // Assert
    expect(result).toEqual(expectedResults);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/v1/metrics/project/${projectId}/current`);
  });

  it('should get default date successfully when last Occurrence is not set', async () => {
    // Arrange
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const expectedResults = new Date(0);
    mockAxiosInstance.get.mockResolvedValue({
      status: 200,
      data: null
    });

    // Act
    const result = await client.getLastMetricCalculationDate(projectId);

    // Assert
    expect(result).toEqual(expectedResults);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/v1/metrics/project/${projectId}/current`);
  });

  it('should update the project successfully', async () => {
    // Arrange
    const projId = '123e4567-e89b-12d3-a456-426614174000';
    const description = 'Updated description';
    const classifier = 'APPLICATION';
    const swidTagId = 'swid:example.com:product:1.0.0';
    const group = 'example-group';
    const tags = [{ name: 'tag1' }, { name: 'tag2' }];

    const responseBody = { success: true };
    mockAxiosInstance.patch.mockResolvedValue({
      status: 200,
      data: responseBody
    });

    // Act
    const result = await client.updateProject(projId, description, classifier, swidTagId, group, tags);

    // Assert
    expect(result).toEqual(responseBody);
    expect(mockAxiosInstance.patch).toHaveBeenCalledWith(`/api/v1/project/${projId}`, {
      description,
      classifier,
      swidTagId,
      group,
      tags
    });
  });

  it('should remove null values from the request body', async () => {
    // Arrange
    const projId = '123e4567-e89b-12d3-a456-426614174000';
    const description = null;
    const classifier = 'APPLICATION';
    const swidTagId = null;
    const group = 'example-group';
    const tags = null;

    const responseBody = { success: true };
    mockAxiosInstance.patch.mockResolvedValue({
      status: 200,
      data: responseBody
    });

    // Act
    const result = await client.updateProject(projId, description, classifier, swidTagId, group, tags);

    // Assert
    expect(result).toEqual(responseBody);
    expect(mockAxiosInstance.patch).toHaveBeenCalledWith(`/api/v1/project/${projId}`, {
      classifier,
      group
    });
  });

  it('should reject with an error if the request fails', async () => {
    // Arrange
    const projId = '123e4567-e89b-12d3-a456-426614174000';
    const description = 'Updated description';
    const classifier = 'APPLICATION';
    const swidTagId = 'swid:example.com:product:1.0.0';
    const group = 'example-group';
    const tags = [{ name: 'tag1' }, { name: 'tag2' }];

    const error = new Error('Request failed');
    error.response = null;
    mockAxiosInstance.patch.mockRejectedValue(error);

    // Act & Assert
    await expect(client.updateProject(projId, description, classifier, swidTagId, group, tags))
      .rejects.toEqual({ error, response: error.response });
  });

  it('should reject with an error if the response status code is not 200', async () => {
    // Arrange
    const projId = '123e4567-e89b-12d3-a456-426614174000';
    const description = 'Updated description';
    const classifier = 'APPLICATION';
    const swidTagId = 'swid:example.com:product:1.0.0';
    const group = 'example-group';
    const tags = [{ name: 'tag1' }, { name: 'tag2' }];

    const error = new Error('Request failed');
    error.response = { status: 400, data: { error: 'Bad Request' } };
    mockAxiosInstance.patch.mockRejectedValue(error);

    // Act & Assert
    await expect(client.updateProject(projId, description, classifier, swidTagId, group, tags))
      .rejects.toEqual({ error, response: error.response });
  });
});
