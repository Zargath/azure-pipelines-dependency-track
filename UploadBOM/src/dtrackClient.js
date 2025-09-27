import axios from 'axios'

class DTrackClient {
  constructor(url, apiKey, caFile) {
    this.baseUrl = url;
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

  uploadBomAsync(projId, bom) {
    const data = {
      "project": projId,
      "bom": bom.toString()
    };
    return this.#postBomAsync(data);
  }
  
  uploadBomAndCreateProjectAsync(name, version, isLatest, bom) {
    const data = {
      "autoCreate": 'true',
      "projectName": name,
      "projectVersion": version,
      "isLatest": String(isLatest),
      "bom": bom.toString(),
    };
    return this.#postBomAsync(data);
  }
  
  uploadBomAndCreateChildProjectAsync(name, version, parentUuid, isLatest, bom) {
    const data = {
      "autoCreate": 'true',
      "projectName": name,
      "projectVersion": version,
      "parentUUID": parentUuid,
      "isLatest": String(isLatest),
      "bom": bom.toString()
    };
    return this.#postBomAsync(data);
  }

  async createProjectAsync(projectName, projectVersion) {
    try {
      const response = await this.axiosInstance.post('/api/v1/project', {
        "name": projectName,
        "version": projectVersion
      });
      
      if (response.status === 201) {
        return response.data.uuid;
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      throw { error, response: error.response };
    }
  }
  
  async getProjectUUID(projectName, projectVersion) {
    if (!projectVersion) {
      return this.getProjectUUIDByName(projectName);
    }

    try {
      const response = await this.axiosInstance.get(`/api/v1/project/lookup?name=${projectName}&version=${projectVersion}`);
      
      if (response.status === 200) {
        let projectUUID = '';
        if(response.data){
          projectUUID = response.data.uuid;
        }
        return projectUUID;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      throw { error, response: error.response };
    }
  }

  async getProjectUUIDByName(projectName) {
    try {
      const response = await this.axiosInstance.get(`/api/v1/project?name=${projectName}`);
      
      if (response.status === 200) {
        const totalCount = response.headers['x-total-count'];
        if(totalCount > 1){
          throw { error: new Error('Multiple projects found with the same name. Please specify a version.') }; 
        }
        
        let projectUUID = '';
        if(response.data){
          projectUUID = response.data[0].uuid;
        }
        return projectUUID;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      throw { error, response: error.response };
    }
  }

  async pullProcessingStatusAsync(token) {
    try {
      const response = await this.axiosInstance.get(`/api/v1/event/token/${token}`);
      
      if (response.status === 200) {
        return response.data.processing;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      throw { error, response: error.response };
    }
  }

  async getProjectMetricsAsync(projId) {
    try {
      const response = await this.axiosInstance.get(`/api/v1/metrics/project/${projId}/current`);
      
      if (response.status === 200) {
        return response.data;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      throw { error, response: error.response };
    }
  }

  async getLastMetricCalculationDate(projId) {
    try {
      const response = await this.axiosInstance.get(`/api/v1/metrics/project/${projId}/current`);
      
      if (response.status === 200) {
        let lastOccurrence = new Date(0);

        // Dependency Track might return an empty response body if metrics have never been calculated before.
        if(response.data) {
          lastOccurrence = new Date(response.data.lastOccurrence);
        } 

        return lastOccurrence;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      throw { error, response: error.response };
    }
  }

  async getProjectInfo(projId) {
    try {
      const response = await this.axiosInstance.get(`/api/v1/project/${projId}`);
      
      if (response.status === 200) {
        return response.data;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      throw { error, response: error.response };
    }
  }

  async updateProject(projId, description, classifier, swidTagId, group, tags) {
    const data = {
      "description": description,
      "classifier": classifier,
      "swidTagId": swidTagId,
      "group": group,
      "tags": tags,
    }

    // Remove properties with null values
    Object.keys(data).forEach(key => {
      if (data[key] == null) {
        delete data[key];
      }
    });

    try {
      const response = await this.axiosInstance.patch(`/api/v1/project/${projId}`, data);
      
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      throw { error, response: error.response };
    }
  }

  async #postBomAsync(data) {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      
      // Add each property to the form data
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });

      const response = await this.axiosInstance.post('/api/v1/bom', formData, {
        headers: {
          ...formData.getHeaders(),
        }
      });
      
      if (response.status === 200) {
        return response.data.token;
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      throw { error, response: error.response };
    }
  }
}
export default DTrackClient;