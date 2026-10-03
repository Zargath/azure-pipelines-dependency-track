const path = require('path');
const fs = require('fs');
const mockTaskLib = require('./mocks/mockTaskLib');
const DTrackClient = require('../../src/dtrackClient').default;
const DTrackManager = require('../../src/dtrackManager').default;
const DTrackTestFixture = require('./fixtures/DTrackTestFixture');
const { getTestApiKey, generateUniqueName } = require('./test-utils');

// Mock the Azure DevOps task library to prevent localization warnings
jest.mock('azure-pipelines-task-lib/task', () => mockTaskLib);

describe('Collection project metrics - validating DependencyTrack/dependency-track#7421', () => {
  const BASE_URL = 'https://localhost:8080';
  let client;
  let dTrackTestFixture;
  let isV4;

  beforeAll(async () => {
    const apiKey = getTestApiKey();
    const caFilePath = path.join(__dirname, '../../../test-environment/certs', 'apiserver.crt');
    const caFile = fs.existsSync(caFilePath) ? fs.readFileSync(caFilePath) : undefined;
    client = new DTrackClient(BASE_URL, apiKey, caFile);
    dTrackTestFixture = new DTrackTestFixture(BASE_URL, apiKey, caFile);
    isV4 = (await dTrackTestFixture.getMajorVersion()) < 5;
  });

  it('returns HTTP 200 with lastOccurrence/firstOccurrence omitted for a collection project whose children have no computed metrics', async () => {
    if (isV4) {
      // DT 5.x-specific: on-demand metrics aggregation for collection projects (the
      // behavior DependencyTrack/dependency-track#7421 is about) doesn't exist on v4 -
      // the endpoint returns a genuinely empty body there instead, which is already
      // covered by the pre-existing epoch-fallback behavior this test isn't about.
      return;
    }

    const parentId = await dTrackTestFixture.createProject(
      generateUniqueName('collection-parent'),
      '1.0.0',
      { collectionLogic: 'AGGREGATE_DIRECT_CHILDREN' }
    );

    await dTrackTestFixture.createProject(
      generateUniqueName('collection-child'),
      '1.0.0',
      { parent: { uuid: parentId } }
    );

    const rawResponse = await dTrackTestFixture.getRawMetrics(parentId);

    expect(rawResponse.status).toBe(200);
    expect(rawResponse.data).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(rawResponse.data, 'lastOccurrence')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(rawResponse.data, 'firstOccurrence')).toBe(false);
  });

  it('documents the actual (buggy) behavior of waitMetricsRefresh against this scenario', async () => {
    if (isV4) {
      return;
    }

    const parentId = await dTrackTestFixture.createProject(
      generateUniqueName('collection-parent'),
      '1.0.0',
      { collectionLogic: 'AGGREGATE_DIRECT_CHILDREN' }
    );

    await dTrackTestFixture.createProject(
      generateUniqueName('collection-child'),
      '1.0.0',
      { parent: { uuid: parentId } }
    );

    // getLastMetricCalculationDate parses the (missing) lastOccurrence field via `new Date(undefined)`,
    // which is an Invalid Date - NOT the epoch sentinel used for a genuinely empty response body.
    const lastOccurrence = await client.getLastMetricCalculationDate(parentId);
    expect(Number.isNaN(lastOccurrence.getTime())).toBe(true);

    // An Invalid Date compares as `false` on both sides of `<`, so waitMetricsRefresh's
    // `do { ... } while (lastOccurrence < lastBomImport)` exits after exactly one iteration -
    // it does NOT hang. It falsely reports "refreshed" immediately, against incomplete metrics.
    const dtrackManager = new DTrackManager(client, 5);
    await expect(dtrackManager.waitMetricsRefresh(parentId)).resolves.toBeUndefined();
  });
});
