import * as tl from "azure-pipelines-task-lib/task"
import * as fs from 'fs'
import * as path from 'path'

import DTrackClient from './dtrackClient.js'
import DTrackManager from './dtrackManager.js'
import { localize } from './localization.js'
import TaskParametersUtility from "./taskParametersUtility.js"
import Logger from './logger.js'

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

const run = async () => {
  tl.setResourcePath(path.join(__dirname, 'task.json'));

  const params = TaskParametersUtility.GetParameters();
  TaskParametersUtility.ValidateParameters(params);

  let caFile;
  if (tl.stats(params.caFilePath).isFile()) {
    Logger.log(localize('ReadingCA', params.caFilePath));
    caFile = loadFile(params.caFilePath, 'UnableToReadCA');
  }

  const client = new DTrackClient(params.dtrackURI, params.dtrackAPIKey, caFile);
  const dtrackManager = new DTrackManager(client);

  Logger.log(localize('GetProjectUuidStarting', params.projectName, params.projectVersion));
  const existingProjectId = await dtrackManager.tryGetProjectUUID(params.projectName, params.projectVersion);

  if (existingProjectId) {
    Logger.warning(localize('ProjectAlreadyExists', params.projectName, params.projectVersion, existingProjectId));
    return { projectId: existingProjectId, created: false };
  }

  const cloneResult = await dtrackManager.cloneLatestProjectVersion(params.projectName, params.projectVersion, params.isLatest, params.addVersionOptions, params.sourceVersion);

  if (!cloneResult) {
    if (params.sourceVersion) {
      Logger.warning(localize('SpecifiedSourceVersionNotFound', params.sourceVersion, params.projectName, params.projectVersion));
    } else {
      Logger.warning(localize('NoPreviousVersionToAdd', params.projectName, params.projectVersion));
    }
    return { projectId: null, created: false };
  }

  if (!cloneResult.created) {
    Logger.warning(localize('ProjectAlreadyExists', params.projectName, params.projectVersion, cloneResult.projectId));
    return { projectId: cloneResult.projectId, created: false };
  }

  return { projectId: cloneResult.projectId, created: true };
};

// Only auto-run in production environment, not during tests
if (process.env.NODE_ENV !== 'test') {
  run().then(
    (result) => {
      if (result.created) {
        Logger.log(localize('TaskSucceed'));
      } else {
        tl.setResult(tl.TaskResult.SucceededWithIssues, localize('TaskSucceededWithWarning'));
      }
      // See UploadBOM/src/task.js for why exitCode (not exit()) is used here.
      process.exitCode = 0;
    },
    err => {
      Logger.error(localize('TaskFailed', err));
      tl.setResult(tl.TaskResult.Failed, err.message);
      process.exitCode = 1;
    }
  );
}

// Export run function for testing
export { run };
