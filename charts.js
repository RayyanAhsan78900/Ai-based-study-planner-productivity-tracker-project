// ===== ANALYTICS & CHARTS =====

const SUBJECT_COLORS = [
  '#7c6af7', '#22d3ee', '#f472b6', '#6ee7b7',
  '#fbbf24', '#fb923c', '#a78bfa', '#34d399'
];

function renderAnalytics() {
  renderBarChart();
  renderPieChart();
  renderRecommendations();
}

// ===== BAR CHART (Weekly Activity) =====
function renderBarChart() {
  const container = document.getElementById('weeklyBarChart');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();

  // Count tasks per day this week
  const counts = days.map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() + i);
    const dateStr = d.toISOString().slice(0, 10);
    return state.tasks.filter(t => t.date === dateStr && t.completed).length;
  });

  const maxCount = Math.max(...counts, 1);

  container.innerHTML = days.map((day, i) => {
    const heightPct = Math.round((counts[i] / maxCount) * 100);
    const isToday = i === now.getDay();
    return `
      <div class="bar-group">
        <span class="bar-val">${counts[i]}</span>
        <div class="bar" style="height:${Math.max(heightPct, 4)}%; ${isToday ? 'opacity:1;filter:brightness(1.2)' : 'opacity:0.7'}"></div>
        <span class="bar-label">${day}</span>
      </div>
    `;
  }).join('');

  // Animate bars
  setTimeout(() => {
    container.querySelectorAll('.bar').forEach((bar, i) => {
      bar.style.animation = `none`;
    });
  }, 50);
}

// ===== PIE CHART (Subject Distribution) =====
function renderPieChart() {
  const canvas = document.getElementById('pieChart');
  const ctx = canvas.getContext('2d');
  const legendEl = document.getElementById('pieLegend');

  ctx.clearRect(0, 0, 200, 200);

  if (state.subjects.length === 0) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#555';
    ctx.font = '13px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText('No data yet', 100, 100);
    legendEl.innerHTML = '';
    return;
  }

  const subjectTaskCounts = state.subjects.map(sub => ({
    name: sub.name,
    count: state.tasks.filter(t => t.subject === sub.name).length
  })).filter(s => s.count > 0);

  if (subjectTaskCounts.length === 0) {
    ctx.fillStyle = '#555';
    ctx.font = '13px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText('No tasks yet', 100, 100);
    legendEl.innerHTML = '';
    return;
  }

  const total = subjectTaskCounts.reduce((a, s) => a + s.count, 0);
  let startAngle = -Math.PI / 2;
  const cx = 100, cy = 100, r = 80;

  subjectTaskCounts.forEach((sub, i) => {
    const slice = (sub.count / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#1a1d2e';
    ctx.lineWidth = 3;
    ctx.stroke();
    startAngle += slice;
  });

  // Center hole (donut)
  ctx.beginPath();
  ctx.arc(cx, cy, 45, 0, 2 * Math.PI);
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  ctx.fillStyle = isDark ? '#1a1d2e' : '#ffffff';
  ctx.fill();

  // Legend
  legendEl.innerHTML = subjectTaskCounts.map((sub, i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}"></div>
      <span>${sub.name} (${sub.count})</span>
    </div>
  `).join('');
}

// ===== AI RECOMMENDATIONS =====
function renderRecommendations() {
  const container = document.getElementById('aiRecommendations');

  if (state.subjects.length === 0) {
    container.innerHTML = '<div class="empty-state">Add subjects to get personalized recommendations.</div>';
    return;
  }

  const recs = generateRecommendations();
  container.innerHTML = recs.map(rec => `
    <div class="rec-item">
      <span class="rec-icon">${rec.icon}</span>
      <div class="rec-text">
        <strong>${rec.title}</strong>
        ${rec.text}
      </div>
    </div>
  `).join('');
}

function generateRecommendations() {
  const recs = [];
  const now = new Date();
  const completionRate = state.tasks.length > 0
    ? (state.tasks.filter(t => t.completed).length / state.tasks.length) * 100
    : 0;

  // Check for urgent deadlines
  state.subjects.forEach(sub => {
    if (!sub.deadline) return;
    const daysLeft = Math.ceil((new Date(sub.deadline) - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3 && daysLeft > 0) {
      recs.push({
        icon: '🚨',
        title: `Urgent: ${sub.name}`,
        text: `Only ${daysLeft} day${daysLeft > 1 ? 's' : ''} until your deadline. Prioritize this subject today!`
      });
    } else if (daysLeft <= 7) {
      recs.push({
        icon: '⚠️',
        title: `Upcoming: ${sub.name}`,
        text: `Deadline in ${daysLeft} days. Consider increasing daily study time to ${Math.ceil(parseFloat(sub.hours) * 1.5)}h/day.`
      });
    }
  });

  // Hard subjects need more attention
  const hardSubjects = state.subjects.filter(s => parseInt(s.difficulty) === 3);
  if (hardSubjects.length > 0) {
    recs.push({
      icon: '💡',
      title: 'Difficult Subject Strategy',
      text: `For ${hardSubjects.map(s => s.name).join(', ')}: break sessions into 25-min Pomodoro blocks with active recall. Difficulty is high — start early!`
    });
  }

  // Completion rate feedback
  if (completionRate < 30 && state.tasks.length > 3) {
    recs.push({
      icon: '📈',
      title: 'Low Completion Rate',
      text: `You've completed ${Math.round(completionRate)}% of tasks. Try reducing daily hours or splitting tasks into smaller chunks.`
    });
  } else if (completionRate > 80) {
    recs.push({
      icon: '🏆',
      title: 'Excellent Progress!',
      text: `${Math.round(completionRate)}% completion rate — you're crushing it! Consider adding more challenging material.`
    });
  }

  // Study balance
  if (state.subjects.length > 3) {
    recs.push({
      icon: '⚖️',
      title: 'Subject Balance',
      text: `With ${state.subjects.length} subjects, avoid studying the same one for more than 2 consecutive hours. Interleave subjects for better retention.`
    });
  }

  // Default tip
  if (recs.length === 0) {
    recs.push({
      icon: '🎯',
      title: 'Getting Started',
      text: 'Add deadlines to your subjects for smarter scheduling. The AI will automatically prioritize based on urgency and difficulty.'
    });
    recs.push({
      icon: '🍅',
      title: 'Use the Pomodoro Timer',
      text: 'Studies show 25-minute focused sessions with 5-minute breaks improve long-term retention significantly.'
    });
  }

  return recs.slice(0, 4);
}
