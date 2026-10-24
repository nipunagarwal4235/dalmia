import test from 'node:test';
import assert from 'node:assert/strict';
import {safeAuthRedirect} from '../lib/auth-redirect.ts';

test('login return paths reject external URLs and authentication loops', () => {
  for (const value of [undefined, '', 'https://example.com', '//example.com', '/\\example.com', '/\n/example.com', '/login', '/signup?next=/login', '/forgot-password', '/auth/callback', '/../login']) {
    assert.equal(safeAuthRedirect(value), '/', String(value));
  }
  assert.equal(safeAuthRedirect('/models/door-handles-2605'), '/models/door-handles-2605');
  assert.equal(safeAuthRedirect('/?q=2605'), '/?q=2605');
});
