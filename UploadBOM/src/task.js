import * as tl from "azure-pipelines-task-lib/task"
import * as fs from 'fs'
import * as path from 'path'

import DTrackClient from './dtrackClient.js'
import DTrackManager from './dtrackManager.js'
import { localize } from './localization.js'
import TaskParametersUtility from "./taskParametersUtility.js"
import ThresholdExpert from "./thresholdExpert.js"

function loadFile(path, errorKey) {
  if (!tl.stats(path).isFile()) {
    throw new Error(localize('FileNotFound', path));
  }

  try {
    return fs.readFileSync(path);
  }
  catch (err) {
    throw new Error(localize(errorKey, err));
  }
}

function shouldUpdateProject(params) {
  return params.projectDescription || 
         params.projectClassifier || 
         params.projectSwidTagId || 
         params.projectGroup || 
         params.projectTags;
}

const run = async () => {
  tl.setResourcePath(path.join(__dirname, 'task.json'));

  const params = TaskParametersUtility.GetParameters();
  TaskParametersUtility.ValidateParameters(params);

  let caFile;
  if (tl.stats(params.caFilePath).isFile()) {
    console.log(localize('ReadingCA', params.caFilePath));
    caFile = loadFile(params.caFilePath, 'UnableToReadCA');
  }

  console.log(localize('ReadingBom', params.bomFilePath));
  const bom = loadFile(params.bomFilePath, 'UnableToReadBom');
  
  const client = new DTrackClient(params.dtrackURI, params.dtrackAPIKey, caFile);
  const dtrackManager = new DTrackManager(client);
  
  let projectId = params.projectId;
  let token = undefined;
  
  if (params.isProjectAutoCreated) {
    if (params.parentProjectName) {
      console.log(localize('BOMUploadAndCreateChildStarting', params.dtrackURI, params.projectName, params.projectVersion, params.parentProjectName, params.parentProjectVersion));
      token = await dtrackManager.uploadBomAndCreateChildProjectAsync(params.projectName, params.projectVersion, params.parentProjectName, params.parentProjectVersion, params.isLatest, bom);
    } 
    else {
      console.log(localize('BOMUploadAndCreateStarting', params.dtrackURI, params.projectName, params.projectVersion));
      token = await dtrackManager.uploadBomAndCreateProjectAsync(params.projectName, params.projectVersion, bom);
    }

    console.log(localize('GetProjectUuidStarting', params.projectName, params.projectVersion));
    projectId = await dtrackManager.getProjetUUID(params.projectName, params.projectVersion);
  }
  else {
    if (!projectId) {
      console.log(localize('GetProjectUuidStarting', params.projectName, params.projectVersion));
      projectId = await dtrackManager.getProjetUUID(params.projectName, params.projectVersion);
    }

    console.log(localize('BOMUploadWithIdStarting', projectId, params.dtrackURI));
    token = await dtrackManager.uploadBomAsync(projectId, bom);
  }

  console.log(localize('BOMUploadSucceed', token));

  if (shouldUpdateProject(params)) {
    await dtrackManager.updateProject(projectId, params.projectDescription, params.projectClassifier, params.projectSwidTagId, params.projectGroup, params.projectTags);
  }

  const thresholdExpert = new ThresholdExpert(
    Number.parseInt(params.thresholdCritical),
    Number.parseInt(params.thresholdHigh),
    Number.parseInt(params.thresholdMedium),
    Number.parseInt(params.thresholdLow),
    Number.parseInt(params.thresholdUnassigned),
    Number.parseInt(params.thresholdpolicyViolationsFail),
    Number.parseInt(params.thresholdpolicyViolationsWarn),
    Number.parseInt(params.thresholdpolicyViolationsInfo),
    Number.parseInt(params.thresholdpolicyViolationsTotal));

  if ((params.thresholdAction === 'warn' || params.thresholdAction === 'error') && thresholdExpert.areThresholdsValidated()) {

    console.log(localize('ProcessingBOM'));
    await dtrackManager.waitBomProcessing(token);

    console.log(localize('RetrievingMetrics'));
    await dtrackManager.waitMetricsRefresh(projectId);
    const metrics = await dtrackManager.getProjectMetricsAsync(projectId);

    console.log(localize('VulnCount', metrics.critical, metrics.high, metrics.medium, metrics.low, metrics.unassigned, metrics.suppressed));
    console.log(localize('PolicyViolationCount', metrics.policyViolationsFail, metrics.policyViolationsWarn, metrics.policyViolationsInfo, metrics.policyViolationsTotal));

    try {
      thresholdExpert.validateThresholds(metrics)
    } catch (err) {
      if (params.thresholdAction === 'error') {
        throw (err)
      }

      tl.setResult(tl.TaskResult.SucceededWithIssues, err)
    }
  }
};

// Only auto-run in production environment, not during tests
if (process.env.NODE_ENV !== 'test') {
  run().then(
    () => {
      console.log(localize('TaskSucceed'));
      process.exit(0);
    },
    err => {
      console.error(localize('TaskFailed', err));
      tl.setResult(tl.TaskResult.Failed, err.message);
      process.exit(1);
    }
  );
}

// Export run function for testing
export { run };