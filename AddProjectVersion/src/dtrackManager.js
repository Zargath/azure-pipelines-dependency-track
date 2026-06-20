import { localize } from './localization.js'
import Utils from './utils.js'

class DtrackManager {
  constructor(dtrackClient) {
    this.dtrackClient = dtrackClient;
  }

  async tryGetProjectUUID(name, version) {
    const project = await this.dtrackClient.getProjectByNameAndVersion(name, version);
    return project ? project.uuid : null;
  }

  async getDtrackMajorVersion() {
    try {
      const version = await this.dtrackClient.getVersion();
      return Number.parseInt(version.split('.')[0], 10);
    }
    catch (err) {
      throw new Error(localize('GetVersionFailed', Utils.getErrorMessage(err)));
    }
  }

  async cloneLatestProjectVersion(projectName, newVersion, isLatest, cloneOptions, sourceVersion = null) {
    try {
      const sourceProject = sourceVersion
        ? await this.dtrackClient.getProjectByNameAndVersion(projectName, sourceVersion)
        : await this.dtrackClient.getLatestProjectVersion(projectName);

      if (!sourceProject) {
        return null;
      }

      if (sourceProject.version === newVersion) {
        return { projectId: sourceProject.uuid, created: false };
      }

      console.log(localize('AddingVersion', sourceProject.name, sourceProject.version, newVersion));

      const majorVersion = await this.getDtrackMajorVersion();
      let newProjectId;
      if (majorVersion >= 5) {
        newProjectId = await this.dtrackClient.cloneProjectV2Async(sourceProject.uuid, newVersion, isLatest, cloneOptions);
      } else {
        const token = await this.dtrackClient.cloneProjectV1Async(sourceProject.uuid, newVersion, isLatest, cloneOptions);
        await this.waitEventProcessing(token);
        newProjectId = await this.tryGetProjectUUID(projectName, newVersion);
      }

      console.log(localize('AddVersionSucceed', newProjectId));
      return { projectId: newProjectId, created: true };
    }
    catch (err) {
      throw new Error(localize('AddVersionFailed', Utils.getErrorMessage(err)));
    }
  }

  async waitEventProcessing(token) {
    let processing = true;
    while (processing) {
      await Utils.sleepAsync(2000);
      console.log(localize('Polling'));
      try {
        processing = await this.dtrackClient.pullProcessingStatusAsync(token);
      }
      catch (err) {
        throw new Error(localize('PollingFailed', Utils.getErrorMessage(err)));
      }
    }
  }
}
export default DtrackManager;
