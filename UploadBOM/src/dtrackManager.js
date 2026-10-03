import { localize } from './localization.js'
import Utils from './utils.js'

class DtrackManager {
  constructor(dtrackClient, pollingTimeoutSeconds = 300) {
    this.dtrackClient = dtrackClient;
    this.pollingTimeoutSeconds = pollingTimeoutSeconds;
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

  // Silent counterpart to getProjetUUID: returns null instead of throwing when the
  // project doesn't exist yet (the common, expected case for a not-yet-created project),
  // so it's safe to use as a speculative "does this already exist" check.
  async tryGetProjetUUID(name, version) {
    try {
      return (await this.dtrackClient.getProjectUUID(name, version)) || null;
    }
    catch {
      return null;
    }
  }

  async getFindingsViolationsKey(projectId) {
    const [findings, violations] = await Promise.all([
      this.dtrackClient.getFindingsAsync(projectId),
      this.dtrackClient.getViolationsAsync(projectId)
    ]);
    return Utils.computeFindingsViolationsKey(findings, violations);
  }

  // Best-effort counterpart to getFindingsViolationsKey: this check is purely an
  // optional improvement over the existing timeout, so any failure (e.g. the configured
  // API key lacks VIEW_VULNERABILITY/VIEW_POLICY_VIOLATION) must fall back to that
  // existing behavior silently rather than surface a new, unrelated error.
  async tryGetFindingsViolationsKey(projectId) {
    try {
      return await this.getFindingsViolationsKey(projectId);
    }
    catch {
      return undefined;
    }
  }

  async getProjectInfo(projectId) {
    const info = await this.dtrackClient.getProjectInfo(projectId);
    return info;
  }

  async updateProject(projectId, description, classifier, swidTagId, group, tags, isLatest) {
    try {
      // Check if any update parameters are actually set
      const hasUpdateParams = description ||
                              classifier ||
                              swidTagId ||
                              group ||
                              (tags && tags.length > 0) ||
                              typeof isLatest === 'boolean';

      if (!hasUpdateParams) {
        console.log(localize('NoProjectChanges'));
        return;
      }

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

        if (tags.length > 0) {
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

        if (typeof isLatest === 'boolean' && projectInfo.isLatest !== isLatest) {
          updatedInfo.isLatest = isLatest;
        }
      }

      console.log(localize('CurrentProjectSettings'));
      console.log(localize('projectSettings', projectId, projectInfo.name, projectInfo.version, projectInfo.description, projectInfo.classifier, projectInfo.swidTagId, projectInfo.group, JSON.stringify(projectInfo.tags), projectInfo.isLatest));

      if (Object.keys(updatedInfo).length === 0) {
        console.log(localize('NoProjectChanges'));
        return;
      } else if (typeof isLatest === 'boolean') {
        // Force update of isLatest flag
        // See issue: https://github.com/DependencyTrack/dependency-track/issues/5279
        updatedInfo.isLatest = isLatest;
      } else {
        // Force retain existing isLatest flag if not explicitly set
        // See issue: https://github.com/DependencyTrack/dependency-track/issues/5279
        updatedInfo.isLatest = projectInfo.isLatest;
      }

      console.log(localize('UpdatingProject'));
      const newSettings = await this.dtrackClient.updateProject(projectId, updatedInfo.description, updatedInfo.classifier, updatedInfo.swidTagId, updatedInfo.group, updatedInfo.tags, updatedInfo.isLatest);

      console.log(localize('NewProjectSettings'));
      console.log(localize('projectSettings', projectId, newSettings.name, newSettings.version, newSettings.description, newSettings.classifier, newSettings.swidTagId, newSettings.group, JSON.stringify(newSettings.tags), newSettings.isLatest, newSettings.active));

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

  async waitEventProcessing(token) {
    const startTime = Date.now();
    const timeoutMs = this.pollingTimeoutSeconds * 1000;
    let processing = true;

    while (processing && (Date.now() - startTime) < timeoutMs) {
      await Utils.sleepAsync(2000);
      console.log(localize('Polling'));
      try {
        processing = await this.dtrackClient.pullProcessingStatusAsync(token);
      }
      catch (err) {
        throw new Error(localize('PollingFailed', Utils.getErrorMessage(err)));
      }
    }

    if (processing) {
      throw new Error(localize('PollingTimeoutExceeded', this.pollingTimeoutSeconds));
    }
  }

  // beforeFindingsViolationsKey is optional: when provided (the caller already knew the
  // project existed before this upload), a timeout is given one last chance to recognize
  // a legitimate case Dependency Track's own metrics dedup optimization produces - the
  // upload genuinely introduced no new/removed findings or policy violations, so DT never
  // writes a new PROJECTMETRICS row and lastOccurrence can never advance. See
  // https://github.com/DependencyTrack/dependency-track - UPDATE_PROJECT_METRICS for why.
  async waitMetricsRefresh(projectId, beforeFindingsViolationsKey) {
    const startTime = Date.now();
    const timeoutMs = this.pollingTimeoutSeconds * 1000;
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

      if ((Date.now() - startTime) >= timeoutMs) {
        if (beforeFindingsViolationsKey !== undefined) {
          const afterKey = await this.tryGetFindingsViolationsKey(projectId);
          if (afterKey !== undefined && afterKey === beforeFindingsViolationsKey) {
            console.log(localize('MetricsUnchangedSinceUpload'));
            return;
          }
        }
        throw new Error(localize('PollingTimeoutExceeded', this.pollingTimeoutSeconds));
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
