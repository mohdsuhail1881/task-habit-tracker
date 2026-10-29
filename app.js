'use strict';
/* Task & Habit Tracker v2 — DOM layer. Pure date/streak logic lives in logic.js */
const L = window.THTLogic;
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'tht-v2';

let state = load();
let calYear, calMonth, calHabitId = 'all', selectedDate = L.todayStr();
{ const now = new Date(); calYear = now.getFullYear(); calMonth = now.getMonth(); }

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.tasks) && Array.isArray(p.habits)) return { tasks: p.tasks, habits: p.habits, checkins: p.checkins || {} }; }
  } catch (e) {}
  return { tasks: [], habits: [], checkins: {} };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
function renderAll() { renderToday(); renderManage(); renderCalendar(); renderStats(); }

/* ---------- theme ---------- */
const themeBtn = $('#theme-toggle');
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('tht-theme', t); } catch (e) {}
  themeBtn.textContent = t === 'dark' ? '☀' : '☾';
  const m = $('#meta-theme-color'); if (m) m.content = t === 'dark' ? '#0b1513' : '#0f766e';
}
(function () { let s = null; try { s = localStorage.getItem('tht-theme'); } catch (e) {} applyTheme(s || 'light'); })();
themeBtn.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

/* ---------- tabs ---------- */
$$('.tab').forEach((btn) => btn.addEventListener('click', () => {
  $$('.tab').forEach((b) => { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', String(b === btn)); });
  $$('.panel').forEach((p) => { const show = p.id === 'panel-' + btn.dataset.tab; p.classList.toggle('active', show); p.hidden = !show; });
  if (btn.dataset.tab === 'calendar') renderCalendar();
  if (btn.dataset.tab === 'stats') renderStats();
}));

/* ---------- today ---------- */
function habitRow(h, dateStr) {
  const li = document.createElement('li'); li.className = 'item';
  const c = L.countFor(state.checkins, h.id, dateStr), target = L.targetOf(h);
  const done = c >= target;
  li.innerHTML = `<span class="swatch" style="background:${esc(h.color || '#0f766e')}"></span>
    <div class="item-main"><strong>${esc(h.icon || '')} ${esc(h.name)}</strong><small>${done ? 'Done' : (c > 0 ? c + ' / ' + target + ' — partly done' : 'Not done yet')} · ${esc(h.frequency || 'daily')}${h.reminderTime ? ' · ⏰ ' + esc(h.reminderTime) : ''}</small></div>`;
  const minus = document.createElement('button'); minus.className = 'icon-btn'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Remove one check-in');
  minus.onclick = () => setCount(h.id, dateStr, Math.max(0, c - 1));
  const plus = document.createElement('button'); plus.className = 'btn-primary'; plus.textContent = done ? '✓ Done' : '+ Check in';
  plus.onclick = () => setCount(h.id, dateStr, c + 1);
  const edit = document.createElement('button'); edit.className = 'icon-btn'; edit.textContent = '✎'; edit.setAttribute('aria-label', 'Edit habit'); edit.onclick = () => openEdit('habit', h.id);
  li.append(minus, plus, edit);
  return li;
}
function taskRow(t) {
  const li = document.createElement('li'); li.className = 'item' + (t.done ? ' done' : '');
  const overdue = !t.done && t.dueDate && t.dueDate < L.todayStr();
  li.innerHTML = `<span class="swatch" style="background:${esc(t.color || '#7c3aed')}"></span>
    <div class="item-main"><strong>${esc(t.title)}</strong><small>${esc(t.priority || 'Medium')} priority${t.category ? ' · ' + esc(t.category) : ''}${t.dueDate ? ' · Due ' + esc(t.dueDate) + (overdue ? ' — OVERDUE' : '') : ''}${t.notes ? ' · ' + esc(t.notes) : ''}</small></div>`;
  const toggle = document.createElement('button'); toggle.className = t.done ? 'btn-small' : 'btn-primary'; toggle.textContent = t.done ? '↩ Undo' : '✓ Done';
  toggle.onclick = () => { t.done = !t.done; t.doneDate = t.done ? L.todayStr() : null; save(); renderAll(); };
  const edit = document.createElement('button'); edit.className = 'icon-btn'; edit.textContent = '✎'; edit.onclick = () => openEdit('task', t.id);
  li.append(toggle, edit);
  return li;
}
function setCount(habitId, dateStr, count) {
  if (!state.checkins[habitId]) state.checkins[habitId] = {};
  if (count <= 0) delete state.checkins[habitId][dateStr]; else state.checkins[habitId][dateStr] = count;
  save(); renderAll();
}
function renderToday() {
  const today = L.todayStr();
  $('#today-title').textContent = 'Today — ' + new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const scheduled = state.habits.filter((h) => L.isScheduled(h, today));
  const doneHabits = scheduled.filter((h) => L.isDone(state.checkins, h, today)).length;
  const openTasks = state.tasks.filter((t) => !t.done);
  const total = scheduled.length + openTasks.length;
  const doneCount = doneHabits + state.tasks.filter((t) => t.done && t.doneDate === today).length;
  const pct = scheduled.length ? Math.round((doneHabits / scheduled.length) * 100) : 0;
  $('#today-bar').style.width = pct + '%';
  $('#today-progress').textContent = scheduled.length ? doneHabits + ' of ' + scheduled.length + ' habits done' : 'No habits scheduled today';
  $('#today-hint').textContent = scheduled.length ? 'Missed days from earlier in the week stay visible in Calendar — they are not erased.' : 'Add a habit in Manage to start your first streak.';
  const hl = $('#today-habits'); hl.innerHTML = '';
  $('#today-habits-empty').hidden = scheduled.length > 0;
  scheduled.forEach((h) => hl.appendChild(habitRow(h, today)));
  const tl = $('#today-tasks'); tl.innerHTML = '';
  const sorted = [...state.tasks].sort((a, b) => Number(a.done) - Number(b.done) || String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')));
  $('#today-tasks-empty').hidden = sorted.length > 0;
  sorted.forEach((t) => tl.appendChild(taskRow(t)));
  void total; void doneCount;
}

/* ---------- calendar (no gaps) ---------- */
function monthName(y, m) { return new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); }
function renderCalendar() {
  const sel = $('#cal-habit'); const prev = sel.value;
  sel.innerHTML = '<option value="all">All habits</option>' + state.habits.map((h) => `<option value="${esc(h.id)}">${esc(h.icon || '')} ${esc(h.name)}</option>`).join('');
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev; else sel.value = 'all';
  calHabitId = sel.value;
  $('#cal-title').textContent = monthName(calYear, calMonth);
  const grid = $('#cal-grid'); grid.innerHTML = '';
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = L.todayStr();
  for (let i = 0; i < firstDow; i++) { const b = document.createElement('div'); b.className = 'cal-day blank'; grid.appendChild(b); }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = calYear + '-' + L.pad(calMonth + 1) + '-' + L.pad(d);
    const btn = document.createElement('button'); btn.className = 'cal-day'; btn.type = 'button';
    const habits = calHabitId === 'all' ? state.habits.filter((h) => L.isScheduled(h, dateStr)) : state.habits.filter((h) => h.id === calHabitId && L.isScheduled(h, dateStr));
    let cls = 'none', label = '';
    if (habits.length) {
      const doneN = habits.filter((h) => L.isDone(state.checkins, h, dateStr)).length;
      if (dateStr > today) { cls = 'upcoming'; label = 'upcoming'; }
      else if (doneN === habits.length) { cls = 'done'; label = doneN + '/' + habits.length; }
      else if (doneN > 0) { cls = 'partial'; label = doneN + '/' + habits.length; }
      else { cls = 'missed'; label = 'missed'; }
    }
    btn.classList.add(cls);
    if (dateStr === selectedDate) btn.classList.add('selected');
    btn.innerHTML = `<strong>${d}</strong><small>${label}</small>`;
    btn.setAttribute('aria-label', dateStr + (label ? ': ' + label : ''));
    btn.onclick = () => { selectedDate = dateStr; renderCalendar(); };
    grid.appendChild(btn);
  }
  renderDayDetail();
}
$('#cal-prev').onclick = () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); };
$('#cal-next').onclick = () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); };
$('#cal-today-btn').onclick = () => { const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth(); selectedDate = L.todayStr(); renderCalendar(); };
$('#cal-habit').onchange = renderCalendar;

function renderDayDetail() {
  $('#day-detail-title').textContent = 'Day: ' + selectedDate + (selectedDate === L.todayStr() ? ' (today)' : (selectedDate < L.todayStr() ? ' — you can fill this past day' : ' — upcoming'));
  const box = $('#day-detail'); box.innerHTML = '';
  const scheduled = state.habits.filter((h) => L.isScheduled(h, selectedDate));
  if (!scheduled.length) box.innerHTML += '<p class="empty">No habit scheduled on this day. Change a habit\'s days in Manage to include it — the day itself is still shown, never skipped.</p>';
  scheduled.forEach((h) => box.appendChild(habitRow(h, selectedDate)));
  const due = state.tasks.filter((t) => t.dueDate === selectedDate);
  if (due.length) { const h3 = document.createElement('h3'); h3.textContent = 'Tasks due this day'; box.appendChild(h3); due.forEach((t) => box.appendChild(taskRow(t))); }
}

/* ---------- manage ---------- */
$('#habit-freq').onchange = (e) => { $('#habit-days').hidden = e.target.value !== 'custom'; };
function customDaysFromForm() { return $$('#habit-days input:checked').map((c) => Number(c.value)); }
$('#habit-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#habit-name').value.trim(); if (!name) return;
  state.habits.push({
    id: L.uid(), name, icon: $('#habit-icon').value.trim() || '✓', color: $('#habit-color').value,
    targetPerDay: Math.max(1, Number($('#habit-target').value) || 1),
    frequency: $('#habit-freq').value, customDays: customDaysFromForm(),
    startDate: $('#habit-start').value || L.todayStr(), endDate: $('#habit-end').value || null,
    reminderTime: $('#habit-reminder').value || null, notes: $('#habit-notes').value.trim(), createdAt: Date.now(),
  });
  e.target.reset(); $('#habit-icon').value = '📚'; $('#habit-color').value = '#0f766e'; $('#habit-target').value = '1'; $('#habit-days').hidden = true;
  save(); renderAll();
});
$('#task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = $('#task-title').value.trim(); if (!title) return;
  const tasks = state.tasks; const order = tasks.length ? Math.max(...tasks.map((t) => t.order || 0)) + 1 : 0;
  tasks.push({ id: L.uid(), title, priority: $('#task-priority').value, dueDate: $('#task-due').value || null, color: $('#task-color').value, category: $('#task-category').value.trim(), repeat: $('#task-repeat').value, notes: $('#task-notes').value.trim(), done: false, doneDate: null, order, createdAt: Date.now() });
  e.target.reset(); $('#task-color').value = '#7c3aed';
  save(); renderAll();
});
$('#add-habit-today').onclick = () => showTab('manage');
$('#add-task-today').onclick = () => showTab('manage');
function showTab(name) { const btn = document.querySelector(`[data-tab="${name}"]`); if (btn) btn.click(); }

function renderManage() {
  const hl = $('#manage-habits'); hl.innerHTML = '';
  if (!state.habits.length) hl.innerHTML = '<li class="empty">No habits yet.</li>';
  state.habits.forEach((h) => {
    const li = document.createElement('li'); li.className = 'item';
    li.innerHTML = `<span class="swatch" style="background:${esc(h.color)}"></span><div class="item-main"><strong>${esc(h.icon)} ${esc(h.name)}</strong><small>${esc(h.frequency)} · target ${L.targetOf(h)}/day · from ${esc(h.startDate)}${h.endDate ? ' to ' + esc(h.endDate) : ''}${h.reminderTime ? ' · ⏰ ' + esc(h.reminderTime) : ''}</small></div>`;
    const edit = document.createElement('button'); edit.className = 'icon-btn'; edit.textContent = '✎ Edit'; edit.onclick = () => openEdit('habit', h.id);
    const del = document.createElement('button'); del.className = 'icon-btn danger'; del.textContent = '× Delete'; del.onclick = () => { if (confirm('Delete this habit and its history?')) { state.habits = state.habits.filter((x) => x.id !== h.id); delete state.checkins[h.id]; save(); renderAll(); } };
    li.append(edit, del); hl.appendChild(li);
  });
  const tl = $('#manage-tasks'); tl.innerHTML = '';
  if (!state.tasks.length) tl.innerHTML = '<li class="empty">No tasks yet.</li>';
  state.tasks.forEach((t) => {
    const li = document.createElement('li'); li.className = 'item' + (t.done ? ' done' : '');
    li.innerHTML = `<span class="swatch" style="background:${esc(t.color)}"></span><div class="item-main"><strong>${esc(t.title)}</strong><small>${esc(t.priority)}${t.category ? ' · ' + esc(t.category) : ''}${t.dueDate ? ' · Due ' + esc(t.dueDate) : ''}${t.repeat && t.repeat !== 'none' ? ' · repeats ' + esc(t.repeat) : ''}</small></div>`;
    const edit = document.createElement('button'); edit.className = 'icon-btn'; edit.textContent = '✎ Edit'; edit.onclick = () => openEdit('task', t.id);
    const del = document.createElement('button'); del.className = 'icon-btn danger'; del.textContent = '× Delete'; del.onclick = () => { if (confirm('Delete this task?')) { state.tasks = state.tasks.filter((x) => x.id !== t.id); save(); renderAll(); } };
    li.append(edit, del); tl.appendChild(li);
  });
}

/* ---------- edit dialog ---------- */
const dialog = $('#edit-dialog'); let editing = null;
function field(label, html) { return `<label>${label} ${html}</label>`; }
function openEdit(kind, id) {
  editing = { kind, id };
  const item = kind === 'habit' ? state.habits.find((h) => h.id === id) : state.tasks.find((t) => t.id === id);
  if (!item) return;
  $('#edit-title').textContent = 'Edit ' + (kind === 'habit' ? 'habit' : 'task');
  if (kind === 'habit') {
    $('#edit-fields').innerHTML =
      field('Name', `<input id="e-name" value="${esc(item.name)}" maxlength="80">`) +
      field('Icon', `<input id="e-icon" value="${esc(item.icon || '')}" maxlength="4">`) +
      field('Colour', `<input id="e-color" type="color" value="${esc(item.color || '#0f766e')}">`) +
      field('Target per day', `<input id="e-target" type="number" min="1" max="20" value="${L.targetOf(item)}">`) +
      field('Frequency', `<select id="e-freq"><option value="daily" ${item.frequency === 'daily' ? 'selected' : ''}>Every day</option><option value="weekdays" ${item.frequency === 'weekdays' ? 'selected' : ''}>Weekdays</option><option value="weekends" ${item.frequency === 'weekends' ? 'selected' : ''}>Weekends</option><option value="custom" ${item.frequency === 'custom' ? 'selected' : ''}>Custom days</option></select>`) +
      field('Start date', `<input id="e-start" type="date" value="${esc(item.startDate || '')}">`) +
      field('End date (optional)', `<input id="e-end" type="date" value="${esc(item.endDate || '')}">`) +
      field('Reminder (optional)', `<input id="e-reminder" type="time" value="${esc(item.reminderTime || '')}">`) +
      field('Notes', `<input id="e-notes" value="${esc(item.notes || '')}" maxlength="200">`);
  } else {
    $('#edit-fields').innerHTML =
      field('Title', `<input id="e-name" value="${esc(item.title)}" maxlength="140">`) +
      field('Priority', `<select id="e-priority"><option ${item.priority === 'Low' ? 'selected' : ''}>Low</option><option ${item.priority === 'Medium' ? 'selected' : ''}>Medium</option><option ${item.priority === 'High' ? 'selected' : ''}>High</option></select>`) +
      field('Colour', `<input id="e-color" type="color" value="${esc(item.color || '#7c3aed')}">`) +
      field('Category', `<input id="e-category" value="${esc(item.category || '')}" maxlength="40">`) +
      field('Due date', `<input id="e-due" type="date" value="${esc(item.dueDate || '')}">`) +
      field('Repeat', `<select id="e-repeat"><option value="none" ${item.repeat === 'none' ? 'selected' : ''}>No repeat</option><option value="daily" ${item.repeat === 'daily' ? 'selected' : ''}>Daily</option><option value="weekly" ${item.repeat === 'weekly' ? 'selected' : ''}>Weekly</option><option value="monthly" ${item.repeat === 'monthly' ? 'selected' : ''}>Monthly</option></select>`) +
      field('Notes', `<input id="e-notes" value="${esc(item.notes || '')}" maxlength="200">`);
  }
  dialog.showModal();
}
$('#edit-save').onclick = () => {
  if (!editing) return;
  const get = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  if (editing.kind === 'habit') {
    const h = state.habits.find((x) => x.id === editing.id); if (!h) return;
    h.name = get('e-name').trim() || h.name; h.icon = get('e-icon').trim() || h.icon; h.color = get('e-color');
    h.targetPerDay = Math.max(1, Number(get('e-target')) || 1); h.frequency = get('e-freq');
    h.startDate = get('e-start') || h.startDate; h.endDate = get('e-end') || null; h.reminderTime = get('e-reminder') || null; h.notes = get('e-notes').trim();
  } else {
    const t = state.tasks.find((x) => x.id === editing.id); if (!t) return;
    t.title = get('e-name').trim() || t.title; t.priority = get('e-priority'); t.color = get('e-color');
    t.category = get('e-category').trim(); t.dueDate = get('e-due') || null; t.repeat = get('e-repeat'); t.notes = get('e-notes').trim();
  }
  dialog.close(); save(); renderAll();
};

/* ---------- stats ---------- */
function renderStats() {
  const box = $('#stats-list'); box.innerHTML = '';
  if (!state.habits.length) { box.innerHTML = '<p class="empty">No habits yet — add one in Manage and your stats will appear here.</p>'; return; }
  state.habits.forEach((h) => {
    const s = L.habitStats(state.checkins, h);
    const row = document.createElement('div'); row.className = 'stat-row';
    row.innerHTML = `<div><strong>${esc(h.icon)} ${esc(h.name)}</strong><br><small>${s.scheduled} scheduled days so far · ${s.pct}% completed</small></div><div>🔥 ${s.current} current</div><div>🏆 ${s.longest} longest</div><div>✓ ${s.done} done</div><div>✗ ${s.missed} missed</div>`;
    box.appendChild(row);
  });
}

/* ---------- examples, export, import ---------- */
$('#btn-sample').onclick = () => {
  const today = L.todayStr();
  const start = L.addDays(today, -13);
  const mk = (name, icon, color, freq, days) => ({ id: L.uid(), name, icon, color, targetPerDay: 1, frequency: freq, customDays: days || [1, 2, 3, 4, 5], startDate: start, endDate: null, reminderTime: null, notes: 'Example — edit or delete me', createdAt: Date.now() });
  state.habits.push(mk('Read 20 pages', '📚', '#0f766e', 'daily'));
  state.habits.push(mk('Morning walk', '🚶', '#15803d', 'weekdays'));
  state.habits.push(mk('Practice coding', '💻', '#7c3aed', 'custom', [1, 3, 5]));
  state.tasks.push({ id: L.uid(), title: 'Finish RMS revision notes', priority: 'High', dueDate: today, color: '#7c3aed', category: 'Study', repeat: 'none', notes: 'Example — edit or delete me', done: false, doneDate: null, order: 0, createdAt: Date.now() });
  // Pre-fill the last 13 days for ALL three examples, leaving exactly one missed
  // scheduled day per habit — so the demo shows realistic streaks AND the missed-day
  // display, instead of Walk/Coding sitting at 0% (that looked broken before).
  const examples = state.habits.slice(-3);
  for (let i = 13; i >= 1; i--) {
    const d = L.addDays(today, -i);
    for (const h of examples) {
      if (!L.isScheduled(h, d)) continue;
      if (i === 4) continue; // one shared missed day, on purpose
      if (!state.checkins[h.id]) state.checkins[h.id] = {};
      state.checkins[h.id][d] = 1;
    }
  }
  save(); renderAll(); showTab('calendar');
};
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
$('#btn-export').onclick = () => download('task-habit-backup.json', JSON.stringify(state, null, 2), 'application/json');
$('#btn-csv').onclick = () => {
  const rows = [['habit', 'date', 'status', 'count', 'target']];
  const today = L.todayStr();
  state.habits.forEach((h) => {
    L.scheduledDatesUpToToday(h, today).forEach((d) => rows.push([h.name, d, L.dayStatus(state.checkins, h, d, today), L.countFor(state.checkins, h.id, d), L.targetOf(h)]));
  });
  const csv = rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  download('habit-history.csv', csv, 'text/csv');
};
$('#file-import').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const p = JSON.parse(await f.text());
    if (!p || !Array.isArray(p.habits) || !Array.isArray(p.tasks)) throw new Error('bad file');
    if (!confirm('Replace all current data with this backup?')) return;
    state = { tasks: p.tasks, habits: p.habits, checkins: p.checkins || {} }; save(); renderAll(); alert('Backup imported.');
  } catch (err) { alert('Could not import that file. It must be a backup exported from this app.'); }
  e.target.value = '';
};

/* ---------- boot ---------- */
renderAll();
