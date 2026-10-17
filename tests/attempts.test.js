import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAttempts, mergeQuizSnapshots, isValidAttempt } from '../src/attempts.js';

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


test('mergeQuizSnapshots preserves the private local PIN and local attempts when cloud parent has none', () => {
  const localAttempt = {
    id: 'local_attempt', friendName: 'Macha', score: 2, total: 3,
    avgTimeSec: 1, maxStreak: 2, xpEarned: 250, timestamp: 100, answers: {}, missedDealbreaker: false
  };
  const local = {
    Q12345: { id: 'Q12345', creatorName: 'Santha', pin: '4821', title: 'local', attempts: [localAttempt] }
  };
  const remote = {
    Q12345: { id: 'Q12345', creatorName: 'Santha', questions: [], attempts: [] }
  };
  const merged = mergeQuizSnapshots(local, remote);
  assert.equal(merged.Q12345.pin, '4821');
  assert.equal(merged.Q12345.title, 'local');
  assert.deepEqual(merged.Q12345.attempts, [localAttempt]);
  assert.deepEqual(merged.Q12345.questions, []);
});

test('mergeQuizSnapshots merges cloud attempts and lets cloud copies win on duplicate IDs', () => {
  const localAttempt = { id: 'same', score: 1, timestamp: 10 };
  const remoteAttempt = { id: 'same', score: 3, timestamp: 11 };
  const freshAttempt = { id: 'remote', score: 2, timestamp: 12 };
  const merged = mergeQuizSnapshots(
    { Q12345: { id: 'Q12345', pin: '1111', attempts: [localAttempt] } },
    { Q12345: { id: 'Q12345', attempts: [remoteAttempt, freshAttempt] } }
  );
  assert.equal(merged.Q12345.pin, '1111');
  assert.deepEqual(merged.Q12345.attempts, [freshAttempt, remoteAttempt]);
});
