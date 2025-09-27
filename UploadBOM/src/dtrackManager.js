import { localize } from './localization.js'
import Utils from './utils.js'

class DtrackManager {
  constructor(dtrackClient) {
    this.dtrackClient = dtrackClient;
  }

  async getProjetUUID(name, version) {
    try {
      const projectId = await this.dtrackClient.getProjectUUID(name, version);
      return projectId;
    }
    catch (err) {
      console.log(Utils.getErrorMessage(err));
      throw new Error(localize('ProjectNotFound', name, version));
    }
  }

  async getProjectInfo(projectId) {
    const info = await this.dtrackClient.getProjectInfo(projectId);
    return info;
  }

  async updateProject(projectId, description, classifier, swidTagId, group, tags) {
    try {
      let updatedInfo = {};

      let projectInfo = await this.getProjectInfo(projectId);
      if (projectInfo) {
        if (description && projectInfo.description !== description) {
          updatedInfo.description = description;
        }

        if (classifier && projectInfo.classifier !== classifier) {
          updatedInfo.classifier = classifier;
        }

        if (swidTagId && projectInfo.swidTagId !== swidTagId) {
          updatedInfo.swidTagId = swidTagId;
        }

        if (group && projectInfo.group !== group) {
          updatedInfo.group = group;
        }

        if (tags) {
          // Get existing and new tags normalized for comparison
          const existingTagNames = projectInfo.tags?.map(tag => tag.name.toLowerCase()).sort() || [];
          const newTagNames = [...tags].map(tag => tag.toLowerCase()).sort();

          // Check if arrays are different either in length or content
          const tagsAreDifferent = existingTagNames.length !== newTagNames.length ||
            existingTagNames.some((tag, i) => tag !== newTagNames[i]);

          if (tagsAreDifferent) {
            updatedInfo.tags = tags.map(tag => ({ name: tag }));
          }
        }
      }

      console.log(localize('CurrentProjectSettings'));
      console.log(localize('projectSettings', projectId, projectInfo.name, projectInfo.version, projectInfo.description, projectInfo.classifier, projectInfo.swidTagId, projectInfo.group, projectInfo.tags.map(tag => tag.name).join(', '), projectInfo.isLatest));

      if (Object.keys(updatedInfo).length === 0) {
        console.log(localize('NoProjectChanges'));
        return;
      }

      console.log(localize('UpdatingProject'));
      const newSettings = await this.dtrackClient.updateProject(projectId, updatedInfo.description, updatedInfo.classifier, updatedInfo.swidTagId, updatedInfo.group, updatedInfo.tags);

      console.log(localize('NewProjectSettings'));
      console.log(localize('projectSettings', projectId, newSettings.name, newSettings.version, newSettings.description, newSettings.classifier, newSettings.swidTagId, newSettings.group, newSettings.tags.map(tag => tag.name).join(', '), newSettings.isLatest));

    }
    catch (err) {
      throw new Error(localize('ProjectUpdateFailed', Utils.getErrorMessage(err)));
    }
  }

  async uploadBomAsync(projectId, bom) {
    try {
      const token = await this.dtrackClient.uploadBomAsync(projectId, bom);
      return token;
    }
    catch (err) {
      throw new Error(localize('BOMUploadFailed', Utils.getErrorMessage(err)));
    }
  }

  async uploadBomAndCreateProjectAsync(name, version, isLatest, bom) {
    try {
      const token = await this.dtrackClient.uploadBomAndCreateProjectAsync(name, version, isLatest, bom);
      return token;
    }
    catch (err) {
      throw new Error(localize('BOMUploadFailed', Utils.getErrorMessage(err)));
    }
  }

  async uploadBomAndCreateChildProjectAsync(name, version, parentName, parentVersion, isLatest, bom) {
    try {
      const parentUuid = await this.getProjetUUID(parentName, parentVersion);
      const token = await this.dtrackClient.uploadBomAndCreateChildProjectAsync(name, version, parentUuid, isLatest, bom);
      return token;
    }
    catch (err) {
      throw new Error(localize('BOMUploadFailed', Utils.getErrorMessage(err)));
    }
  }

  async waitBomProcessing(token) {
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

  async waitMetricsRefresh(projectId) {
    const lastBomImport = new Date((await this.getProjectInfo(projectId)).lastBomImport);
    let lastOccurrence = undefined;

    do {
      await Utils.sleepAsync(2000);
      console.log(localize('Polling'));
      try {
        lastOccurrence = await this.dtrackClient.getLastMetricCalculationDate(projectId);
      }
      catch (err) {
        throw new Error(localize('PollingFailed', Utils.getErrorMessage(err)));
      }
    } while (lastOccurrence < lastBomImport)

    console.log(localize('LastBOMImport', lastBomImport));
    console.log(localize('LastMetricUpdate', lastOccurrence));
  }

  async getProjectMetricsAsync(projectId) {
    try {
      const metrics = await this.dtrackClient.getProjectMetricsAsync(projectId);
      return metrics;
    }
    catch (err) {
      throw new Error(localize('PollingFailed', Utils.getErrorMessage(err)));
    }
  }
}
export default DtrackManager;