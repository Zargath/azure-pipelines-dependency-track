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
    return { projectId: existingProjectId };
  }

  const newProjectId = await dtrackManager.cloneLatestProjectVersion(params.projectName, params.projectVersion, params.isLatest, params.addVersionOptions);

  if (!newProjectId) {
    console.log(localize('NoPreviousVersionToAdd', params.projectName, params.projectVersion));
    return { projectId: null };
  }

  return { projectId: newProjectId };
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
