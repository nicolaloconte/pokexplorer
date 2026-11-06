const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/auth-cloud.js');

test('Discord returns to the Pages directory from either game URL', () => {
  const directory = 'https://nicolcnt.github.io/pokexplorer/';
  for (const entry of ['', 'index.html']) {
    const location = new URL(directory + entry + '?from=bookmark#menu');
    assert.equal(globalThis.PokexAuth.redirectUrl(location), directory);
  }
});

test('Discord redirects keep the deployment directory on localhost', () => {
  const location = new URL('http://localhost:8000/preview/index.html');
  assert.equal(globalThis.PokexAuth.redirectUrl(location), 'http://localhost:8000/preview/');
  assert.throws(() => globalThis.PokexAuth.redirectUrl(new URL('file:///preview/index.html')));
});
