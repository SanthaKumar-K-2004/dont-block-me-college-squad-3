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
