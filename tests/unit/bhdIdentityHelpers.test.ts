import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeNextPath, oauthRedirectUri, sha256Base64Url } from '../../lib/bhd/identity';

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

  it('does not send another product redirect_uri', () => {
    const previous = process.env.BHD_OAUTH_REDIRECT_URI;
    process.env.BHD_OAUTH_REDIRECT_URI = 'https://baitak.bhd-om.com/api/auth/bhd/callback';
    try {
      assert.equal(
        oauthRedirectUri('https://www.bhd-om.com'),
        'https://www.bhd-om.com/api/auth/bhd/callback'
      );
    } finally {
      if (previous === undefined) delete process.env.BHD_OAUTH_REDIRECT_URI;
      else process.env.BHD_OAUTH_REDIRECT_URI = previous;
    }
  });
});
