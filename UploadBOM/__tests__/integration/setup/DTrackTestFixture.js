const axios = require('axios');

class DTrackTestFixture {
  constructor(baseUrl, apiKey, caFile = null) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.caFile = caFile;

    // Create axios instance with common configuration
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-API-Key': this.apiKey
      },
      ...(this.caFile ? { httpsAgent: new (require('https').Agent)({ ca: this.caFile }) } : {}),
    });
  }

  async createProject(name, version) {
    try {
      const projectData = {
        name,
        version
      };

      const response = await this.axiosInstance.put('/api/v1/project', projectData);
      
      if (response.status === 201 || response.status === 200) {
        return response.data.uuid;
      } else {
        throw {
          error: new Error(`Unexpected status code: ${response.status}`),
          status: response.status,
          body: response.data,
          message: 'Failed to create parent project'
        };
      }
    } catch (error) {
      throw {
        error: error.response ? error : error.error,
        status: error.response?.status,
        body: error.response?.data,
        message: error.message || 'Failed to create parent project'
      };
    }
  }

  async getProjectChildren(projId) {
    try {
      const response = await this.axiosInstance.get(`/api/v1/project/${projId}/children`);
      
      if (response.status === 200) {
        return response.data;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      throw { error, response: error.response };
    }
  }
}

module.exports = DTrackTestFixture;
