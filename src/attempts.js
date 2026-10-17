// Pure helpers for safely combining independent scoreboard records.
export function mergeAttempts(...groups) {
  const byId = new Map();
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const attempt of group) {
      if (!attempt || typeof attempt.id !== 'string' || !attempt.id) continue;
      byId.set(attempt.id, attempt);
    }
  }
  return [...byId.values()].sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
}

export function isValidAttempt(attempt, questionCount) {
  if (!attempt || typeof attempt !== 'object' || !attempt.id || typeof attempt.id !== 'string') return false;
  if (typeof attempt.friendName !== 'string' || attempt.friendName.trim().length < 2) return false;
  if (!Number.isInteger(attempt.score) || !Number.isInteger(attempt.total)) return false;
  if (attempt.total !== questionCount || attempt.total < 1 || attempt.score < 0 || attempt.score > attempt.total) return false;
  if (!Number.isFinite(attempt.avgTimeSec) || attempt.avgTimeSec < 0 || attempt.avgTimeSec > 3600) return false;
  if (!Number.isInteger(attempt.maxStreak) || attempt.maxStreak < 0 || attempt.maxStreak > attempt.total) return false;
  if (!Number.isInteger(attempt.xpEarned) || attempt.xpEarned < 0 || attempt.xpEarned > 100000) return false;
  if (!Number.isInteger(attempt.timestamp) || attempt.timestamp <= 0) return false;
  if (!attempt.answers || typeof attempt.answers !== 'object' || Array.isArray(attempt.answers)) return false;
  if (Object.keys(attempt.answers).length > attempt.total) return false;
  return typeof attempt.missedDealbreaker === 'boolean';
}


// Merge cloud quiz snapshots without dropping device-only creator PINs or local attempts.
// Attempts live in their own subcollection, so an empty parent snapshot must not erase them.
export function mergeQuizSnapshots(localQuizzes, remoteQuizzes) {
  const next = { ...(localQuizzes && typeof localQuizzes === 'object' ? localQuizzes : {}) };
  if (!remoteQuizzes || typeof remoteQuizzes !== 'object' || Array.isArray(remoteQuizzes)) return next;

  for (const [quizId, remote] of Object.entries(remoteQuizzes)) {
    if (!remote || typeof remote !== 'object' || Array.isArray(remote)) continue;
    const local = next[quizId];
    next[quizId] = {
      ...(local && typeof local === 'object' ? local : {}),
      ...remote,
      // The PIN is intentionally never uploaded. Keep it only on the creator's device.
      ...(typeof local?.pin === 'string' && local.pin ? { pin: local.pin } : {}),
      // The cloud stores each attempt separately; union both sources by stable ID.
      attempts: mergeAttempts(local?.attempts || [], remote.attempts || [])
    };
  }
  return next;
}
