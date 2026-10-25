const path = require('path');
const fs = require('fs');
const mockTaskLib = require('./mocks/mockTaskLib');
const DTrackClient = require('../../src/dtrackClient').default;
const DTrackTestFixture = require('./fixtures/DTrackTestFixture');
const { getTestApiKey, generateUniqueName } = require('./test-utils');
const { run } = require('../../src/task.js');

jest.mock('azure-pipelines-task-lib/task', () => mockTaskLib);

process.env.NODE_ENV = 'test';

describe('Task re-uploading an unchanged BOM with a threshold action', () => {
  const BASE_URL = 'https://localhost:8080';
  let client;
  let dTrackTestFixture;
  let testBomFilePath;
  let caFilePath;

  beforeAll(() => {
    const apiKey = getTestApiKey();
    caFilePath = path.join(__dirname, '../../../test-environment/certs', 'apiserver.crt');
    const caFile = fs.existsSync(caFilePath) ? fs.readFileSync(caFilePath) : undefined;
    client = new DTrackClient(BASE_URL, apiKey, caFile);
    dTrackTestFixture = new DTrackTestFixture(BASE_URL, apiKey, caFile);
    testBomFilePath = path.join(__dirname, 'fixtures/test-bom.json');
  });

  beforeEach(() => {
    mockTaskLib.reset();
  });

  function setTaskInputs(projectId) {
    mockTaskLib.setInput('dtrackURI', BASE_URL);
    mockTaskLib.setInput('dtrackAPIKey', getTestApiKey('BOM-Upload-Viewer'));
    mockTaskLib.setInput('dtrackProjId', projectId);
    mockTaskLib.setInput('dtrackPollingTimeoutSeconds', '20');
    mockTaskLib.setInput('thresholdAction', 'warn');
    mockTaskLib.setInput('thresholdCritical', '1');
    mockTaskLib.setPathInput('bomFilePath', testBomFilePath, true, true);
    mockTaskLib.setStats(testBomFilePath, { isFile: () => true });
    mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
    mockTaskLib.setStats(caFilePath, { isFile: () => true });
  }

  it('completes on every server version except those between 5.1.0 and 5.2.1', async () => {
    const projectId = await dTrackTestFixture.createProject(generateUniqueName('task-test-dedup-skip'), '1.0.0');
    setTaskInputs(projectId);

    await run();
    const secondRun = run();

    const version = await client.getVersion();
    const hasMetricsDedupBugWithoutTokenFix = /^5\.1\./.test(version) || version === '5.2.0';
    if (hasMetricsDedupBugWithoutTokenFix) {
      await expect(secondRun).rejects.toThrow('Polling Dependency Track for update timed out after 20 seconds.');
    } else {
      await expect(secondRun).resolves.toMatchObject({ projectId });
    }
  }, 120000);
});
