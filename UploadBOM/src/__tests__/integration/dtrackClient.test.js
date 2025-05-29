const DTrackClient = require('../../dtrackClient').default;
const { getTestApiKey } = require('./test-utils');

describe('DTrackClient Integration Tests', () => {
  const BASE_URL = 'http://localhost:8080';
  let client;
  let apiKey;

  beforeAll(() => {
    try {
      apiKey = getTestApiKey();
      client = new DTrackClient(BASE_URL, apiKey);
    } catch (error) {
      console.error('Failed to setup test client:', error);
      throw error;
    }
  });

  it('should connect to the Dependency Track API server', async () => {
    const projectName = 'non-existent-project';
    const projectVersion = '1.0.0';

    try {
      const uuid = await client.getProjectUUID(projectName, projectVersion);

      fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.response.statusCode).toEqual(404);
    }
  });
});