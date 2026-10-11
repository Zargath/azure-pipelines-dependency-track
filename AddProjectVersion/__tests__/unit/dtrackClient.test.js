import DTrackClient from '../../src/dtrackClient';

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
  }))
}));

describe('DTrackClient constructor URL validation', () => {
  const apiKey = '';

  it('should accept a valid https URL', () => {
    expect(() => new DTrackClient('https://dtrack.example.com', apiKey)).not.toThrow();
  });

  it('should accept a valid http URL', () => {
    expect(() => new DTrackClient('http://dtrack.example.com', apiKey)).not.toThrow();
  });

  it.each([
    ['not a url'],
    [''],
  ])('should throw a clear error for a malformed URL: %p', (value) => {
    expect(() => new DTrackClient(value, apiKey)).toThrow(`Invalid Dependency-Track URL: ${value}`);
  });

  it.each([
    ['ftp://dtrack.example.com'],
    ['file:///etc/passwd'],
    ['javascript:alert(1)'],
  ])('should reject unsupported URL schemes: %s', (value) => {
    expect(() => new DTrackClient(value, apiKey)).toThrow(/Only http\(s\) is allowed/);
  });

  it.each([
    ['http://localhost:8080'],
    ['http://127.0.0.1:8080'],
    ['http://10.0.0.5:8080'],
    ['http://169.254.169.254'],
  ])('should NOT block localhost or private/internal network addresses: %s', (value) => {
    expect(() => new DTrackClient(value, apiKey)).not.toThrow();
  });
});
