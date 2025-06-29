import DTrackClient from '../../src/dtrackClient';
import request from 'request';

jest.mock('request', () => jest.fn());

describe('DTrackClient', () => {
  let client;
  const apiKey = '';

  beforeEach(() => {
    client = new DTrackClient('http://localhost:8080', apiKey);

    jest.clearAllMocks();
  });

  it('should get project info successfully', async () => {
    // Arrange
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
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
    const projectName = 'ProjectName';
    const projectVersion = '1.0.0';
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
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
    const isProcessing = true;
    const token = '1b0afc40-a8a1-4ed1-8a23-c464b24f1ddd';
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: { processing: isProcessing } });
    });

    // Act
    const result = await client.pullProcessingStatusAsync(token);

    // Assert
    expect(result).toEqual(isProcessing);
    expect(request).toHaveBeenCalledWith(
      `/api/v1/event/token/${token}`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'X-API-Key': apiKey }
      }),
      expect.any(Function)
    );
  });

  it('should get project metrics successfully', async () => {
    // Arrange
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
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
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const lastOccurrence = '2023-10-01T00:00:00Z';
    const expectedResults = new Date(lastOccurrence);
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: { lastOccurrence: lastOccurrence } });
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
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const expectedResults = new Date(0);
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: null });
    });

    // Act
    const result = await client.getLastMetricCalculationDate(projectId);

    // Assert
    expect(result).toEqual(expectedResults);
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
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: responseBody });
    });

    // Act
    const result = await client.updateProject(projId, description, classifier, swidTagId, group, tags);

    // Assert
    expect(result).toEqual(responseBody);
    expect(request).toHaveBeenCalledWith(
      `/api/v1/project/${projId}`,
      expect.objectContaining({
        method: 'PATCH',
        json: {
          description,
          classifier,
          swidTagId,
          group,
          tags
        },
        headers: { 'X-API-Key': apiKey }
      }),
      expect.any(Function)
    );
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
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: responseBody });
    });

    // Act
    const result = await client.updateProject(projId, description, classifier, swidTagId, group, tags);

    // Assert
    expect(result).toEqual(responseBody);
    expect(request).toHaveBeenCalledWith(
      `/api/v1/project/${projId}`,
      expect.objectContaining({
        method: 'PATCH',
        json: {
          classifier,
          group
        },
        headers: { 'X-API-Key': apiKey }
      }),
      expect.any(Function)
    );
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
    request.mockImplementation((url, options, callback) => {
      callback(error, null);
    });

    // Act & Assert
    await expect(client.updateProject(projId, description, classifier, swidTagId, group, tags))
      .rejects.toEqual({ error, response: null });
  });

  it('should reject with an error if the response status code is not 200', async () => {
    // Arrange
    const projId = '123e4567-e89b-12d3-a456-426614174000';
    const description = 'Updated description';
    const classifier = 'APPLICATION';
    const swidTagId = 'swid:example.com:product:1.0.0';
    const group = 'example-group';
    const tags = [{ name: 'tag1' }, { name: 'tag2' }];

    const response = { statusCode: 400, body: { error: 'Bad Request' } };
    request.mockImplementation((url, options, callback) => {
      callback(null, response);
    });

    // Act & Assert
    await expect(client.updateProject(projId, description, classifier, swidTagId, group, tags))
      .rejects.toEqual({ error: null, response });
  });
});