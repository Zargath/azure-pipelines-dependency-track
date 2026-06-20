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

  async getProjectByNameAndVersion(projectName, projectVersion) {
    try {
      const response = await this.axiosInstance.get(`/api/v1/project/lookup?name=${projectName}&version=${projectVersion}`);

      if (response.status === 200) {
        return response.data;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw { error, response: error.response };
    }
  }

  async getLatestProjectVersion(projectName) {
    try {
      const response = await this.axiosInstance.get(`/api/v1/project/latest/${encodeURIComponent(projectName)}`);

      if (response.status === 200) {
        return response.data;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw { error, response: error.response };
    }
  }

  async getVersion() {
    try {
      const response = await this.axiosInstance.get('/api/version');

      if (response.status === 200) {
        return response.data.version;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      throw { error, response: error.response };
    }
  }

  async cloneProjectV1Async(projectUuid, version, isLatest, includes) {
    try {
      const response = await this.axiosInstance.put('/api/v1/project/clone', {
        "project": projectUuid,
        "version": version,
        "makeCloneLatest": !!isLatest,
        "includeACL": includes.acl,
        "includeAuditHistory": includes.auditHistory,
        "includeComponents": includes.components || includes.findings,
        "includeDependencies": includes.components || includes.findings,
        "includePolicyViolations": includes.policyViolations || includes.policyViolationsAuditHistory,
        "includeProperties": includes.properties,
        "includeServices": includes.services,
        "includeTags": includes.tags
      });

      if (response.status === 200) {
        return response.data.token;
      }
      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      throw { error, response: error.response };
    }
  }

  async cloneProjectV2Async(projectUuid, version, isLatest, includes) {
    try {
      const includesList = [];
      if (includes.acl) includesList.push('ACL');
      if (includes.components) includesList.push('COMPONENTS');
      if (includes.findings) includesList.push('FINDINGS');
      if (includes.auditHistory) includesList.push('FINDINGS_AUDIT_HISTORY');
      if (includes.policyViolations) includesList.push('POLICY_VIOLATIONS');
      if (includes.policyViolationsAuditHistory) includesList.push('POLICY_VIOLATIONS_AUDIT_HISTORY');
      if (includes.properties) includesList.push('PROPERTIES');
      if (includes.services) includesList.push('SERVICES');
      if (includes.tags) includesList.push('TAGS');

      const response = await this.axiosInstance.post(`/api/v2/projects/${projectUuid}/clone`, {
        "version": version,
        "version_is_latest": !!isLatest,
        "includes": includesList
      });

      if (response.status === 201) {
        return response.data.uuid;
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
}
export default DTrackClient;
