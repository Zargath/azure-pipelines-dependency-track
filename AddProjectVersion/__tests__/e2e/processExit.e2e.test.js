const fs = require('fs');
const path = require('path');
const { spawnTask, DIST_TASK_PATH } = require('./spawnTaskHelper');
const { getTestApiKey, generateUniqueName } = require('../integration/test-utils');

const VSO_COMPLETE_FAILED_RE = /##vso\[task\.complete result=Failed;\][^\r\n]*/;

describe('AddProjectVersion top-level auto-run exit behavior (e2e, real child process)', () => {
  const BASE_URL = 'https://localhost:8080';
  let apiKey;
  let caFilePath;

  beforeAll(() => {
    if (!fs.existsSync(DIST_TASK_PATH)) {
      throw new Error(
        `${DIST_TASK_PATH} not found. Run "npm run build" before "npm run test:e2e" ` +
        `(this suite must exercise exactly what ships to the agent).`
      );
    }
    apiKey = getTestApiKey();
    caFilePath = path.join(__dirname, '../../../test-environment/certs/apiserver.crt');
  });

  it('exits 0 and reports SucceededWithIssues when no previous version exists to clone', async () => {
    // A brand-new, never-before-seen project name has no previous version,
    // so cloneLatestProjectVersion() returns falsy and the task hits the
    // `result.created === false` branch -> tl.setResult(SucceededWithIssues, ...).
    const projectName = generateUniqueName('e2e-exit-no-previous-version');

    const { exitCode, stdout } = await spawnTask({
      dtrackURI: BASE_URL,
      dtrackAPIKey: apiKey,
      caFilePath,
      dtrackProjName: projectName,
      dtrackProjVersion: '2.0.0',
      dtrackIsLatest: 'true',
    });

    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/##vso\[task\.complete result=SucceededWithIssues;\]/);
  });

  it('exits 1 and writes a Failed ##vso command when the request fails', async () => {
    const projectName = generateUniqueName('e2e-exit-failure');

    const { exitCode, stdout } = await spawnTask({
      dtrackURI: 'http://127.0.0.1:59999', // nothing listens here -> immediate ECONNREFUSED
      dtrackAPIKey: 'irrelevant',
      caFilePath,
      dtrackProjName: projectName,
      dtrackProjVersion: '1.0.0',
      dtrackIsLatest: 'true',
    });

    expect(exitCode).toBe(1);
    expect(stdout).toMatch(VSO_COMPLETE_FAILED_RE);
  });
});
