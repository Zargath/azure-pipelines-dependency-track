import request from 'request'
import { json } from 'stream/consumers';

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
      "isLatest": isLatest,
      "bom": bom.toString()
    };
    return this.#postBomAsync(data);
  }
  
  getProjectUUID(projectName, projectVersion) {
    return new Promise((resolve, reject) => {
        request.get({
        ...this.baseOptions,
        url: `/api/v1/project/lookup?name=${projectName}&version=${projectVersion}`,
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
      request.get({
        ...this.baseOptions,
        url: `/api/v1/bom/token/${token}`,
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
      request.get({
        ...this.baseOptions,
        url: `/api/v1/metrics/project/${projId}/current`,
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
      request.get({
        ...this.baseOptions,
        url: `/api/v1/metrics/project/${projId}/current`,
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
      request.get({
        ...this.baseOptions,
        url: `/api/v1/project/${projId}`,
      },
      (error, response) => {
        if (!error && response.statusCode == 200) {
          resolve(response.body);
        }
        
        reject({ error, response });
      });
    });
  }

  #postBomAsync(data) {
    return new Promise((resolve, reject) => {
      request.post({
        ...this.baseOptions,
        url: '/api/v1/bom',
        body: data
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