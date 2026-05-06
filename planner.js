// ===== AI SCHEDULE GENERATOR =====
// Rule-based ML logic: priority score = difficulty * 3 + urgency(deadline) * 2 + hours

function calcPriority(subject) {
  const diff = parseInt(subject.difficulty) || 2;
  const now = new Date();
  const deadline = subject.deadline ? new Date(subject.deadline) : null;
  const daysLeft = deadline ? Math.max(1, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))) : 30;
  const urgency = Math.max(1, 10 - Math.min(daysLeft, 10)); // 1-10 scale
  const hours = parseFloat(subject.hours) || 1;
  return diff * 3 + urgency * 2 + (1 / hours);
}

function generateSchedule(subjects) {
  const now = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const tasks = [];

  // Sort subjects by priority (AI ordering)
  const sorted = [...subjects].sort((a, b) => calcPriority(b) - calcPriority(a));

  sorted.forEach((sub, idx) => {
    const deadline = sub.deadline ? new Date(sub.deadline) : null;
    const maxDays = deadline
      ? Math.min(7, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)))
      : 7;

    // Distribute tasks across week, high-priority subjects get more days
    const studyDays = Math.max(1, Math.min(maxDays, Math.ceil((parseInt(sub.difficulty) + 1) * 1.5)));

    for (let d = 0; d < studyDays; d++) {
      const taskDate = new Date(now);
      taskDate.setDate(now.getDate() + ((idx + d) % 7));
      tasks.push({
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        name: `${sub.name} — Session ${d + 1}`,
        subject: sub.name,
        difficulty: parseInt(sub.difficulty),
        deadline: sub.deadline,
        hours: sub.hours,
        date: taskDate.toISOString().slice(0, 10),
        completed: false,
        completedAt: null
      });
    }
  });

  return tasks;
}

// ===== ADD SUBJECT =====
function addSubject() {
  const name = document.getElementById('subjectName').value.trim();
  const difficulty = document.getElementById('subjectDifficulty').value;
  const deadline = document.getElementById('subjectDeadline').value;
  const hours = document.getElementById('subjectHours').value;

  if (!name) { showToast('⚠️ Please enter a subject name.'); return; }
  if (!hours || isNaN(hours) || hours <= 0) { showToast('⚠️ Enter valid study hours.'); return; }

  const existing = state.subjects.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (existing) { showToast('⚠️ Subject already added.'); return; }

  const subject = { name, difficulty: parseInt(difficulty), deadline, hours: parseFloat(hours) };
  state.subjects.push(subject);

  // Generate new tasks for this subject and merge
  const newTasks = generateSchedule([subject]);
  state.tasks.push(...newTasks);
  saveState();

  // Clear form
  document.getElementById('subjectName').value = '';
  document.getElementById('subjectHours').value = '';
  document.getElementById('subjectDeadline').value = '';

  showToast(`✅ "${name}" added! ${newTasks.length} tasks generated.`);
  renderCalendar();
}

// ===== WEEKLY CALENDAR =====
function renderCalendar() {
  const container = document.getElementById('weeklyCalendar');
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Get current week (starting Sunday)
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay();
  startOfWeek.setDate(now.getDate() - dayOfWeek);

  let html = '';
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    const dateStr = day.toISOString().slice(0, 10);
    const isToday = day.toDateString() === now.toDateString();

    const dayTasks = state.tasks.filter(t => t.date === dateStr);

    html += `
      <div class="calendar-day ${isToday ? 'today' : ''}">
        <div class="cal-day-header">
          <div class="cal-day-name">${days[day.getDay()]}</div>
          <div class="cal-day-num">${day.getDate()}</div>
        </div>
        <div class="cal-tasks">
          ${dayTasks.slice(0, 4).map(task => `
            <div class="cal-task-chip ${task.completed ? 'completed' : ''}"
                 onclick="toggleTask('${task.id}'); renderCalendar();"
                 title="${task.name}">
              ${task.name.length > 16 ? task.name.slice(0, 16) + '…' : task.name}
            </div>
          `).join('')}
          ${dayTasks.length > 4 ? `<div class="cal-task-chip">+${dayTasks.length - 4} more</div>` : ''}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}
