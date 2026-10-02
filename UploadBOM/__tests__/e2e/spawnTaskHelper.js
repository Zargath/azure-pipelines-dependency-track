const { spawn } = require('child_process');
const path = require('path');

const DIST_TASK_PATH = path.join(__dirname, '../../dist/task.js');

/**
 * Spawns the built task as a real child process (not importing run() directly),
 * so the top-level `if (process.env.NODE_ENV !== 'test') { ... }` auto-run
 * block actually executes - this is the one code path no other test touches,
 * since every other test sets NODE_ENV=test to skip it.
 *
 * @param {Object} inputs map of task input name -> value, translated to
 *   INPUT_<NAME> env vars using azure-pipelines-task-lib's own normalization.
 * @param {number} hangTimeoutMs safety bound: if the child hasn't exited on
 *   its own by this long, it is killed and the promise rejects. This only
 *   guards against a genuine hang - it does not judge correctness of a
 *   prompt exit.
 */
function spawnTask(inputs, { hangTimeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.NODE_ENV;

    for (const [name, value] of Object.entries(inputs)) {
      const key = 'INPUT_' + name.replace(/\./g, '_').replace(/ /g, '_').toUpperCase();
      env[key] = String(value);
    }

    const startedAt = Date.now();
    const child = spawn(process.execPath, [DIST_TASK_PATH], { env, stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    const watchdog = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(
        `Task process did not exit on its own within ${hangTimeoutMs}ms - ` +
        `something is keeping the event loop alive. stdout so far:\n${stdout}`
      ));
    }, hangTimeoutMs);

    child.on('exit', (exitCode) => {
      clearTimeout(watchdog);
      resolve({ exitCode, stdout, stderr, elapsedMs: Date.now() - startedAt });
    });

    child.on('error', (err) => {
      clearTimeout(watchdog);
      reject(err);
    });
  });
}

module.exports = { spawnTask, DIST_TASK_PATH };
