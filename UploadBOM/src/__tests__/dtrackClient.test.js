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
});