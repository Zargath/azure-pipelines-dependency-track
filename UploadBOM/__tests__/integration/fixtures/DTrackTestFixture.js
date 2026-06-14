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

  /**
   * Creates an internal vulnerability with PURL-based component matching.
   * The internal analyzer will detect this vulnerability when any component
   * whose PURL matches the given purlIdentity is processed.
   *
   * Requires VULNERABILITY_MANAGEMENT permission (admin key).
   */
  async createInternalVulnerability(vulnId, severity, purlIdentity) {
    try {
      const response = await this.axiosInstance.put('/api/v1/vulnerability', {
        vulnId,
        source: 'INTERNAL',
        severity,
        title: `Integration test vulnerability ${vulnId}`,
        description: 'Automatically created for integration testing',
        affectedComponents: [
          {
            identityType: 'PURL',
            identity: purlIdentity,
          }
        ]
      });

      if (response.status === 200 || response.status === 201) {
        return response.data.uuid;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      // 409 means the vulnerability already exists — look it up and return its UUID
      if (error.response?.status === 409) {
        const lookup = await this.axiosInstance.get(`/api/v1/vulnerability/source/INTERNAL/vuln/${vulnId}`);
        return lookup.data.uuid;
      }
      throw { error, response: error.response };
    }
  }
}

module.exports = DTrackTestFixture;
