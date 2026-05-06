// ===== STATE =====
let state = {
  subjects: [],
  tasks: [],
  streak: 0,
  pomodoroSessions: 0,
  lastDate: null
};

// Load from localStorage
function loadState() {
  const saved = localStorage.getItem('studyflow_state');
  if (saved) {
    try { state = { ...state, ...JSON.parse(saved) }; } catch(e) {}
  }
}

function saveState() {
  localStorage.setItem('studyflow_state', JSON.stringify(state));
}

// ===== NAVIGATION =====
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`[data-page="${name}"]`).classList.add('active');
  document.getElementById('pageTitle').textContent = {
    dashboard: 'Dashboard',
    planner: 'Planner',
    tasks: 'Tasks',
    pomodoro: 'Pomodoro',
    analytics: 'Analytics'
  }[name];

  if (name === 'dashboard') refreshDashboard();
  if (name === 'planner') renderCalendar();
  if (name === 'tasks') renderTasks('all');
  if (name === 'analytics') renderAnalytics();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    showPage(item.dataset.page);
    document.getElementById('sidebar').classList.remove('open');
  });
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ===== THEME TOGGLE =====
document.getElementById('themeToggle').addEventListener('click', () => {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('themeIcon').textContent = isDark ? '🌙' : '☀️';
});

// ===== DATE =====
function setDate() {
  const now = new Date();
  const opts = { weekday: 'long', month: 'long', day: 'numeric' };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', opts);
}

// ===== DASHBOARD =====
function refreshDashboard() {
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter(t => t.completed).length;
  const totalHours = state.subjects.reduce((a, s) => a + parseFloat(s.hours || 0), 0);
  const score = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Stats
  document.getElementById('statSubjects').textContent = state.subjects.length;
  document.getElementById('statTasks').textContent = totalTasks;
  document.getElementById('statHours').textContent = totalHours.toFixed(1) + 'h';
  document.getElementById('statStreak').textContent = state.streak;

  // Score circle
  animateScore(score);
  document.getElementById('completedCount').textContent = completedCount() + ' Completed';
  document.getElementById('pendingCount').textContent = pendingCount() + ' Pending';

  // Today tasks
  renderTodayTasks();

  // Subject progress
  renderSubjectProgress();
}

function animateScore(score) {
  const circle = document.getElementById('scoreCircle');
  const numEl = document.getElementById('scoreNumber');
  const circumference = 326.7;
  const offset = circumference - (score / 100) * circumference;
  circle.style.strokeDashoffset = offset;

  // Add gradient def
  let svg = circle.closest('svg');
  if (!svg.querySelector('defs')) {
    svg.insertAdjacentHTML('afterbegin', `
      <defs>
        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#7c6af7"/>
          <stop offset="100%" stop-color="#22d3ee"/>
        </linearGradient>
      </defs>
    `);
    circle.style.stroke = 'url(#scoreGradient)';
  }

  // Animate number
  let current = 0;
  const step = score / 40;
  const timer = setInterval(() => {
    current = Math.min(current + step, score);
    numEl.textContent = Math.round(current);
    if (current >= score) clearInterval(timer);
  }, 20);
}

function completedCount() { return state.tasks.filter(t => t.completed).length; }
function pendingCount() { return state.tasks.filter(t => !t.completed).length; }

function renderTodayTasks() {
  const container = document.getElementById('todayTasks');
  const today = new Date().toDateString();
  const todayTasks = state.tasks.filter(t => {
    if (!t.date) return false;
    return new Date(t.date).toDateString() === today;
  }).slice(0, 5);

  if (todayTasks.length === 0) {
    container.innerHTML = '<div class="empty-state">No tasks scheduled for today.</div>';
    return;
  }

  container.innerHTML = todayTasks.map(task => `
    <div class="today-task-item ${task.completed ? 'done' : ''}" onclick="toggleTask('${task.id}')">
      <div class="task-checkbox ${task.completed ? 'checked' : ''}">${task.completed ? '✓' : ''}</div>
      <span class="task-name">${task.name}</span>
      <span class="task-subject-tag">${task.subject}</span>
    </div>
  `).join('');
}

function renderSubjectProgress() {
  const container = document.getElementById('subjectProgressList');
  if (state.subjects.length === 0) {
    container.innerHTML = '<div class="empty-state">Add subjects to see progress here.</div>';
    return;
  }

  container.innerHTML = state.subjects.map(sub => {
    const subTasks = state.tasks.filter(t => t.subject === sub.name);
    const done = subTasks.filter(t => t.completed).length;
    const pct = subTasks.length > 0 ? Math.round((done / subTasks.length) * 100) : 0;
    return `
      <div class="subject-progress-item">
        <div class="subject-prog-header">
          <span class="subject-prog-name">${sub.name}</span>
          <span class="subject-prog-pct">${pct}% (${done}/${subTasks.length} tasks)</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== TASK TOGGLE =====
function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    saveState();
    refreshDashboard();
    renderTasks(currentFilter);
    if (task.completed) showToast(`✅ "${task.name}" marked complete!`);
  }
}

// ===== TASKS PAGE =====
let currentFilter = 'all';

function renderTasks(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });

  const container = document.getElementById('tasksGrid');
  let filtered = state.tasks;
  if (filter === 'pending') filtered = state.tasks.filter(t => !t.completed);
  if (filter === 'completed') filtered = state.tasks.filter(t => t.completed);

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No tasks here yet!</div>';
    return;
  }

  container.innerHTML = filtered.map(task => {
    const diffMap = { 1: ['Easy', 'diff-easy'], 2: ['Medium', 'diff-medium'], 3: ['Hard', 'diff-hard'] };
    const [diffLabel, diffClass] = diffMap[task.difficulty] || ['Medium', 'diff-medium'];
    const deadline = task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No deadline';
    return `
      <div class="task-card ${task.completed ? 'completed' : ''}" id="taskCard-${task.id}">
        <div class="task-card-header">
          <span class="task-card-title">${task.name}</span>
          <span class="difficulty-badge ${diffClass}">${diffLabel}</span>
        </div>
        <div class="task-card-meta">
          <span>📚 ${task.subject}</span>
          <span>📅 ${deadline}</span>
          <span>⏱ ${task.hours}h</span>
        </div>
        <div class="task-card-actions">
          <button class="action-btn complete-btn" onclick="toggleTask('${task.id}')">
            ${task.completed ? '↩ Undo' : '✓ Complete'}
          </button>
          <button class="action-btn delete-btn" onclick="deleteTask('${task.id}')">✕ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => renderTasks(btn.dataset.filter));
});

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  renderTasks(currentFilter);
  refreshDashboard();
  showToast('🗑 Task deleted.');
}

// ===== TOAST =====
function showToast(msg, duration = 2800) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ===== EXPORT PDF =====
function exportPDF() {
  const content = `
STUDYFLOW — STUDY PLAN EXPORT
Generated: ${new Date().toLocaleDateString()}
================================

SUBJECTS (${state.subjects.length})
${state.subjects.map(s => `• ${s.name} | Difficulty: ${['','Easy','Medium','Hard'][s.difficulty]} | Hours/day: ${s.hours} | Deadline: ${s.deadline}`).join('\n')}

TASKS (${state.tasks.length} total)
${state.tasks.map(t => `• [${t.completed ? 'DONE' : 'PENDING'}] ${t.name} — ${t.subject} (${t.date || 'No date'})`).join('\n')}

PROGRESS
Completed: ${completedCount()} / ${state.tasks.length} tasks
Score: ${state.tasks.length > 0 ? Math.round((completedCount() / state.tasks.length) * 100) : 0}%
  `;
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `StudyFlow_Plan_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  showToast('📄 Schedule exported!');
}

// ===== INIT =====
loadState();
setDate();
refreshDashboard();
