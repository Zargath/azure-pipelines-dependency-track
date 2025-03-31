import DTrackClient from '../dtrackClient';
import request from 'request';

// Mock the `request` function
jest.mock('request', () => jest.fn());

describe('DTrackClient', () => {
  let client;

  beforeEach(() => {
    // Create a new instance of DTrackClient before each test
    client = new DTrackClient('http://localhost:8080', 'test-api-key', null);

    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  it('should get project info successfully', async () => {
    // Arrange: Mock the request function to simulate a successful response
    request.mockImplementation((url, options, callback) => {
      callback(null, { statusCode: 200, body: { uuid: '123e4567-e89b-12d3-a456-426614174000' }});
    });

    // Act: Call the method
    const result = await client.getProjectInfo('123e4567-e89b-12d3-a456-426614174000');

    // Assert: Verify the result and that the request was called correctly
    expect(result).toEqual({ uuid: '123e4567-e89b-12d3-a456-426614174000' });
    expect(request).toHaveBeenCalledWith(
      '/api/v1/project/123e4567-e89b-12d3-a456-426614174000',
      expect.objectContaining({
        method: 'GET',
        headers: { 'X-API-Key': 'test-api-key' }
      }),
      expect.any(Function)
    );
  });

  it('should handle errors when getting project info', async () => {
    // Arrange: Mock the request function to simulate an error
    request.mockImplementation((url, options, callback) => {
      callback('Not Found', { statusCode: 404 });
    });

    // Act & Assert: Verify that the method throws an error
    await expect(client.getProjectInfo('123e4567-e89b-12d3-a456-426614174000')).rejects.toEqual({error: 'Not Found', response: { statusCode: 404 }});
  });
});