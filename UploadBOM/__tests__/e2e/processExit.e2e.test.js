const fs = require('fs');
const path = require('path');
const { spawnTask, DIST_TASK_PATH } = require('./spawnTaskHelper');
const { getTestApiKey, generateUniqueName } = require('../integration/test-utils');

const VSO_COMPLETE_FAILED_RE = /##vso\[task\.complete result=Failed;\][^\r\n]*/;

describe('UploadBOM top-level auto-run exit behavior (e2e, real child process)', () => {
  const BASE_URL = 'https://localhost:8080';
  let apiKey;
  let caFilePath;
  let bomFilePath;

  beforeAll(() => {
    if (!fs.existsSync(DIST_TASK_PATH)) {
      throw new Error(
        `${DIST_TASK_PATH} not found. Run "npm run build" before "npm run test:e2e" ` +
        `(this suite must exercise exactly what ships to the agent).`
      );
    }
    apiKey = getTestApiKey();
    caFilePath = path.join(__dirname, '../../../test-environment/certs/apiserver.crt');
    bomFilePath = path.join(__dirname, '../integration/fixtures/test-bom.json');
  });

  it('exits 0 with no explicit ##vso result on a successful upload', async () => {
    const projectName = generateUniqueName('e2e-exit-success');

    const { exitCode, stdout, elapsedMs } = await spawnTask({
      dtrackURI: BASE_URL,
      dtrackAPIKey: apiKey,
      caFilePath,
      bomFilePath,
      dtrackProjAutoCreate: 'true',
      dtrackProjName: projectName,
      dtrackProjVersion: '1.0.0',
      dtrackIsLatest: 'true',
    });

    expect(exitCode).toBe(0);
    expect(elapsedMs).toBeLessThan(15000); // sanity bound against a true hang only
    expect(stdout).toContain('Finished task execution successfully!');
    expect(stdout).not.toMatch(/##vso\[task\.complete/);
  });

  it('exits 1 and writes a complete, non-truncated Failed ##vso command when the upload fails', async () => {
    const projectName = generateUniqueName('e2e-exit-failure');

    const { exitCode, stdout } = await spawnTask({
      dtrackURI: 'http://127.0.0.1:59999', // nothing listens here -> immediate ECONNREFUSED
      dtrackAPIKey: 'irrelevant',
      caFilePath,
      bomFilePath,
      dtrackProjAutoCreate: 'true',
      dtrackProjName: projectName,
      dtrackProjVersion: '1.0.0',
      dtrackIsLatest: 'true',
    });

    expect(exitCode).toBe(1);
    expect(stdout).toMatch(VSO_COMPLETE_FAILED_RE);
  });
});
