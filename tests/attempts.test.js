import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAttempts, isValidAttempt } from '../src/attempts.js';

test('mergeAttempts deduplicates by ID, prefers later groups, and sorts newest first', () => {
  const old = { id: 'a', score: 2, timestamp: 10 };
  const updated = { id: 'a', score: 3, timestamp: 11 };
  const newest = { id: 'b', score: 4, timestamp: 20 };
  assert.deepEqual(mergeAttempts([old, null, { score: 1 }], [updated, newest]), [newest, updated]);
});

test('mergeAttempts safely handles missing and malformed groups', () => {
  assert.deepEqual(mergeAttempts(null, 'not-an-array', [{ id: '', timestamp: 4 }, { id: 'ok', timestamp: 1 }]), [
    { id: 'ok', timestamp: 1 }
  ]);
});

test('isValidAttempt accepts a bounded valid attempt', () => {
  assert.equal(isValidAttempt({
    id: 'att_123', friendName: 'Macha', score: 2, total: 3,
    avgTimeSec: 1.5, maxStreak: 2, xpEarned: 250, timestamp: 123, answers: { q1: 'a', q2: 'b' },
    missedDealbreaker: false
  }, 3), true);
});

test('isValidAttempt rejects invalid scores, question totals, names, and answer maps', () => {
  const valid = {
    id: 'att_123', friendName: 'Macha', score: 2, total: 3,
    avgTimeSec: 1.5, maxStreak: 2, xpEarned: 250, timestamp: 123, answers: { q1: 'a' },
    missedDealbreaker: false
  };
  assert.equal(isValidAttempt({ ...valid, score: 4 }, 3), false);
  assert.equal(isValidAttempt({ ...valid, total: 4 }, 3), false);
  assert.equal(isValidAttempt({ ...valid, friendName: ' ' }, 3), false);
  assert.equal(isValidAttempt({ ...valid, answers: [] }, 3), false);
});
