'use strict';
/* Pure logic for Task & Habit Tracker v2 — no DOM, so it can be unit-tested in Node.
   Exposed as window.THTLogic in the browser, and as module.exports in Node. */
(function (root) {
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDate(s) {
    const parts = String(s).split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }
  function addDays(dateStr, n) {
    const d = parseDate(dateStr); d.setDate(d.getDate() + n); return fmtDate(d);
  }
  function todayStr() { return fmtDate(new Date()); }
  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }
  // Is a habit scheduled on this date? No day is ever silently skipped:
  // every date from startDate to today (or endDate) is either scheduled or not-scheduled,
  // and scheduled-but-undone past days are reported as MISSED, never dropped.
  function isScheduled(habit, dateStr) {
    if (!habit || !dateStr) return false;
    if (habit.startDate && dateStr < habit.startDate) return false;
    if (habit.endDate && dateStr > habit.endDate) return false;
    const dow = parseDate(dateStr).getDay(); // 0=Sun
    const freq = habit.frequency || 'daily';
    if (freq === 'daily') return true;
    if (freq === 'weekdays') return dow >= 1 && dow <= 5;
    if (freq === 'weekends') return dow === 0 || dow === 6;
    if (freq === 'custom') {
      const days = Array.isArray(habit.customDays) ? habit.customDays : [1, 2, 3, 4, 5];
      return days.indexOf(dow) !== -1;
    }
    return true;
  }
  function targetOf(habit) { return Math.max(1, Number(habit.targetPerDay) || 1); }
  function countFor(checkins, habitId, dateStr) {
    return (checkins && checkins[habitId] && checkins[habitId][dateStr]) || 0;
  }
  function isDone(checkins, habit, dateStr) {
    return countFor(checkins, habit.id, dateStr) >= targetOf(habit);
  }
  // Status of one habit on one day: done | partial | missed | scheduled | upcoming | not-scheduled | future
  function dayStatus(checkins, habit, dateStr, today) {
    const t = today || todayStr();
    if (!isScheduled(habit, dateStr)) return 'not-scheduled';
    if (dateStr > t) return 'upcoming';
    const c = countFor(checkins, habit.id, dateStr);
    if (c >= targetOf(habit)) return 'done';
    if (c > 0) return 'partial';
    return 'missed';
  }
  // All scheduled dates from start (or first check-in) up to today, in order, no gaps.
  function scheduledDatesUpToToday(habit, today) {
    const t = today || todayStr();
    const start = habit.startDate || (habit.createdAt ? fmtDate(new Date(habit.createdAt)) : t);
    const out = [];
    let cur = start;
    let guard = 0;
    while (cur <= t && guard < 4000) { if (isScheduled(habit, cur)) out.push(cur); cur = addDays(cur, 1); guard++; }
    return out;
  }
  function currentStreak(checkins, habit, today) {
    const t = today || todayStr();
    const dates = scheduledDatesUpToToday(habit, t);
    let streak = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
      if (isDone(checkins, habit, dates[i])) streak++;
      else if (dates[i] === t) continue; // today not done yet does not break a live streak
      else break;
    }
    return streak;
  }
  function longestStreak(checkins, habit, today) {
    const dates = scheduledDatesUpToToday(habit, today || todayStr());
    let best = 0, run = 0;
    for (const d of dates) { if (isDone(checkins, habit, d)) { run++; best = Math.max(best, run); } else run = 0; }
    return best;
  }
  function habitStats(checkins, habit, today) {
    const dates = scheduledDatesUpToToday(habit, today || todayStr());
    const done = dates.filter(d => isDone(checkins, habit, d)).length;
    const missed = dates.length - done;
    return {
      scheduled: dates.length, done, missed,
      pct: dates.length ? Math.round((done / dates.length) * 100) : 0,
      current: currentStreak(checkins, habit, today),
      longest: longestStreak(checkins, habit, today),
    };
  }
  const api = { pad, fmtDate, parseDate, addDays, todayStr, uid, isScheduled, targetOf, countFor, isDone, dayStatus, scheduledDatesUpToToday, currentStreak, longestStreak, habitStats };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.THTLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
