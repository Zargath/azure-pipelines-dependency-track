import DTrackClient from '../dtrackClient';
import request from 'request';

jest.mock('request', () => jest.fn());

describe('DTrackClient', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get project info successfully', async () => {
    // Arrange
    const apiKey = 'test-api-key';
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const client = new DTrackClient('http://localhost:8080', apiKey);
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: { uuid: projectId } });
    });

    // Act
    const result = await client.getProjectInfo(projectId);

    // Assert
    expect(result).toEqual({ uuid: projectId });
    expect(request).toHaveBeenCalledWith(
      `/api/v1/project/${projectId}`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'X-API-Key': apiKey }
      }),
      expect.any(Function)
    );
  });

  it('should handle errors when getting project info', async () => {
    // Arrange
    const client = new DTrackClient('http://localhost:8080', 'test-api-key');
    request.mockImplementation((url, options, callback) => {
      callback('Not Found', { statusCode: 404 });
    });

    // Act
    const promise = client.getProjectInfo('123e4567-e89b-12d3-a456-426614174000');

    // Assert
    await expect(promise).rejects.toEqual({ error: 'Not Found', response: { statusCode: 404 } });
  });

  it('should get project uuid successfully', async () => {
    // Arrange
    const apiKey = 'test-api-key';
    const projectName = 'ProjectName';
    const projectVersion = '1.0.0';
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const client = new DTrackClient('http://localhost:8080', apiKey);
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: { uuid: projectId } });
    });

    // Act
    const result = await client.getProjectUUID(projectName, projectVersion);

    // Assert
    expect(result).toEqual(projectId);
    expect(request).toHaveBeenCalledWith(
      `/api/v1/project/lookup?name=${projectName}&version=${projectVersion}`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'X-API-Key': apiKey }
      }),
      expect.any(Function)
    );
  });

  it('should pull processing status successfully', async () => {
    // Arrange
    const apiKey = 'test-api-key';
    const isProcessing = true;
    const token = '1b0afc40-a8a1-4ed1-8a23-c464b24f1ddd';
    const client = new DTrackClient('http://localhost:8080', apiKey);
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: { processing: isProcessing } });
    });

    // Act
    const result = await client.pullProcessingStatusAsync(token);

    // Assert
    expect(result).toEqual(isProcessing);
    expect(request).toHaveBeenCalledWith(
      `/api/v1/bom/token/${token}`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'X-API-Key': apiKey }
      }),
      expect.any(Function)
    );
  });

  it('should get project metrics successfully', async () => {
    // Arrange
    const apiKey = 'test-api-key';
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const client = new DTrackClient('http://localhost:8080', apiKey);
    const expectedResults = { example: 'data' };
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: expectedResults });
    });

    // Act
    const result = await client.getProjectMetricsAsync(projectId);

    // Assert
    expect(result).toEqual(expectedResults);
    expect(request).toHaveBeenCalledWith(
      `/api/v1/metrics/project/${projectId}/current`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'X-API-Key': apiKey }
      }),
      expect.any(Function)
    );
  });

  it('should get last metric calculation date successfully', async () => {
    // Arrange
    const apiKey = 'test-api-key';
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const client = new DTrackClient('http://localhost:8080', apiKey);
    const lastOccurrence = '2023-10-01T00:00:00Z';
    const expectedResults = new Date(lastOccurrence);
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: {lastOccurrence: lastOccurrence} });
    });

    // Act
    const result = await client.getLastMetricCalculationDate(projectId);

    // Assert
    expect(result).toEqual(expectedResults);
    expect(request).toHaveBeenCalledWith(
      `/api/v1/metrics/project/${projectId}/current`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'X-API-Key': apiKey }
      }),
      expect.any(Function)
    );
  });

  it('should get default date successfully when last Occurrence is not set', async () => {
    // Arrange
    const apiKey = 'test-api-key';
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const client = new DTrackClient('http://localhost:8080', apiKey);
    const expectedResults = new Date(0);
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: null });
    });

    // Act
    const result = await client.getLastMetricCalculationDate(projectId);

    // Assert
    expect(result).toEqual(expectedResults);
  });
});