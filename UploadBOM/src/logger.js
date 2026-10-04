import * as tl from "azure-pipelines-task-lib/task"

const Logger = {
  log: (message) => console.log(message),
  debug: (message) => tl.debug(message),
  warning: (message) => tl.warning(message),
  error: (message) => tl.error(message),
};

export default Logger;
