import * as tl from "azure-pipelines-task-lib/task"
import * as fs from 'fs'
import * as path from 'path'

import DTrackClient from './dtrackClient.js'
import DTrackManager from './dtrackManager.js'
import { localize } from './localization.js'
import TaskParametersUtility from "./taskParametersUtility.js"

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
    console.log(localize('ReadingCA', params.caFilePath));
    caFile = loadFile(params.caFilePath, 'UnableToReadCA');
  }

  const client = new DTrackClient(params.dtrackURI, params.dtrackAPIKey, caFile);
  const dtrackManager = new DTrackManager(client);

  console.log(localize('GetProjectUuidStarting', params.projectName, params.projectVersion));
  const existingProjectId = await dtrackManager.tryGetProjectUUID(params.projectName, params.projectVersion);

  if (existingProjectId) {
    console.log(localize('ProjectAlreadyExists', params.projectName, params.projectVersion, existingProjectId));
    return { projectId: existingProjectId, created: false };
  }

  const cloneResult = await dtrackManager.cloneLatestProjectVersion(params.projectName, params.projectVersion, params.isLatest, params.addVersionOptions, params.sourceVersion);

  if (!cloneResult) {
    if (params.sourceVersion) {
      console.log(localize('SpecifiedSourceVersionNotFound', params.sourceVersion, params.projectName, params.projectVersion));
    } else {
      console.log(localize('NoPreviousVersionToAdd', params.projectName, params.projectVersion));
    }
    return { projectId: null, created: false };
  }

  if (!cloneResult.created) {
    console.log(localize('ProjectAlreadyExists', params.projectName, params.projectVersion, cloneResult.projectId));
    return { projectId: cloneResult.projectId, created: false };
  }

  return { projectId: cloneResult.projectId, created: true };
};

// Only auto-run in production environment, not during tests
if (process.env.NODE_ENV !== 'test') {
  run().then(
    (result) => {
      if (result.created) {
        console.log(localize('TaskSucceed'));
      } else {
        tl.setResult(tl.TaskResult.SucceededWithIssues, localize('TaskSucceededWithWarning'));
      }
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
