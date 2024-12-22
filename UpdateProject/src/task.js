import * as tl from "azure-pipelines-task-lib/task"
import { localize } from './localization.js'

const run = async () => {
  tl.setResourcePath(path.join(__dirname, 'task.json'));
};

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