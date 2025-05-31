const request = require('request');

class DTrackTestFixture {
  constructor(baseUrl, apiKey, caFile = null) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.caFile = caFile;

    this.baseOptions = {
      baseUrl: this.baseUrl,
      json: true,
      headers: { 
        'X-API-Key': this.apiKey
      },
      ...(this.caFile ? { ca: this.caFile } : {}),
    };
  }

  createProject(name, version) {
    return new Promise((resolve, reject) => {
      const projectData = {
        name,
        version
      };

      request('/api/v1/project', {
        ...this.baseOptions,
        method: 'PUT',
        json: projectData
      }, (error, response) => {
        if (!error && (response.statusCode === 201 || response.statusCode === 200)) {
          resolve(response.body.uuid);
        } else {
          reject({ 
            error, 
            status: response?.statusCode,
            body: response?.body,
            message: 'Failed to create parent project'
          });
        }
      });
    });
  }
}

module.exports = DTrackTestFixture;
