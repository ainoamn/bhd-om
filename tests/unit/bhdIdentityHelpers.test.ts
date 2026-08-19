import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeNextPath, sha256Base64Url } from '../../lib/bhd/identity';

describe('bhd identity helpers', () => {
  it('accepts relative returnTo only', () => {
    assert.equal(isSafeNextPath('/ar/admin'), true);
    assert.equal(isSafeNextPath('/'), true);
    assert.equal(isSafeNextPath('https://evil.example/'), false);
    assert.equal(isSafeNextPath('//id.bhd-om.com'), false);
    assert.equal(isSafeNextPath(null), false);
  });

  it('computes S256 challenge as base64url', () => {
    const digest = sha256Base64Url('verifier-value');
    assert.equal(digest.includes('+'), false);
    assert.equal(digest.includes('/'), false);
    assert.equal(digest.length > 20, true);
  });
});
