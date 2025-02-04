import request from 'request'

class DTrackClient {
  constructor(url, apiKey, caFile) {
    this.baseUrl = url;
    this.apiKey = apiKey;
    this.caFile = caFile;

    this.baseOptions = {
      baseUrl: this.baseUrl,
      json: true,
      headers: { 
        'X-API-Key': this.apiKey
      },
      ...(this.caFile ? { ca: this.caFile } : {}),
    }
  }

  uploadBomAsync(projId, bom) {
    const data = {
      "project": projId,
      "bom": bom.toString()
    };
    return this.#postBomAsync(data);
  }
  
  uploadBomAndCreateProjectAsync(name, version, bom) {
    const data = {
      "autoCreate": 'true',
      "projectName": name,
      "projectVersion": version,
      "bom": bom.toString()
    };
    return this.#postBomAsync(data);
  }
  
  uploadBomAndCreateChildProjectAsync(name, version, parentName, parentVersion, isLatest, bom) {
    const data = {
      "autoCreate": 'true',
      "projectName": name,
      "projectVersion": version,
      "parentName": parentName,
      "parentVersion": parentVersion,
      "isLatest": String(isLatest),
      "bom": bom.toString()
    };
    return this.#postBomAsync(data);
  }
  
  getProjectUUID(projectName, projectVersion) {
    return new Promise((resolve, reject) => {
        request(`/api/v1/project/lookup?name=${projectName}&version=${projectVersion}`, {
        ...this.baseOptions,
        method: 'GET',
      },
      (error, response) => {
        if (!error && response.statusCode == 200) {

          let projectUUID = ''

          if(response.body){
            projectUUID = response.body.uuid;
          }

          resolve(projectUUID)
        }
        reject({ error, response });
      });
    });
  }

  pullProcessingStatusAsync(token) {
    return new Promise((resolve, reject) => {
      request(`/api/v1/bom/token/${token}`, {
        ...this.baseOptions,
        method: 'GET',
      },
        (error, response) => {
          if (!error && response.statusCode == 200) {
            resolve(response.body.processing);
          }

          reject({ error, response });
        });
    });
  }

  getProjectMetricsAsync(projId) {
    return new Promise((resolve, reject) => {
      request(`/api/v1/metrics/project/${projId}/current`, {
        ...this.baseOptions,
        method: 'GET',
      },
      (error, response) => {
        if (!error && response.statusCode == 200) {
          resolve(response.body);
        }
        
        reject({ error, response });
      });
    });
  }

  getLastMetricCalculationDate(projId) {
    return new Promise((resolve, reject) => {
      request(`/api/v1/metrics/project/${projId}/current`, {
        ...this.baseOptions,
        method: 'GET',
      },
      (error, response) => {
        if (!error && response.statusCode == 200) {
          
          let lastOccurrence = new Date(0);

          // Dependency Track might return an empty response body if metrics have never been calculated before.
          if(response.body) {
            lastOccurrence = new Date(response.body.lastOccurrence);
          } 

          resolve(lastOccurrence);
        }
        
        reject({ error, response });
      });
    });
  }

  getProjectInfo(projId) {
    return new Promise((resolve, reject) => {
      request(`/api/v1/project/${projId}`, {
        ...this.baseOptions,
        method: 'GET',
      },
      (error, response) => {
        if (!error && response.statusCode == 200) {
          resolve(response.body);
        }
        
        reject({ error, response });
      });
    });
  }

  updateProject(projId, description, classifier, swidTagId, group, tags) {
    return new Promise((resolve, reject) => {
      const data = {
        "description": description,
        "classifier": classifier,
        "swidTagId": swidTagId,
        "group": group,
        "tags": tags ? tags.map(tag => ({ name: tag })) : null,
      }

      // Remove properties with null values
      Object.keys(data).forEach(key => {
        if (data[key] == null) {
          delete data[key];
        }
      });

      console.log('Updating project:', data);

      request(`/api/v1/project/${projId}`, {
        ...this.baseOptions,
        method: 'PATCH',
        json: data
      }, (error, response) => {
        if (!error && response.statusCode === 200) {
          resolve(response.body);
        } else {
          console.log('Error:', response);
          reject({ error, response });
        }
      });
    });
  }

  #postBomAsync(data) {
    return new Promise((resolve, reject) => {
      request('/api/v1/bom', {
        ...this.baseOptions,
        method: 'POST',
        formData: data
      }, (error, response) => {
        if (!error && response.statusCode === 200) {
          resolve(response.body.token);
        } else {
          reject({ error, response });
        }
      });
    });
  }
}
export default DTrackClient;