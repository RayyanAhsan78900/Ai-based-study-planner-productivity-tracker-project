// ===== POMODORO TIMER =====
let pomoInterval = null;
let pomoTimeLeft = 1500;
let pomoTotalTime = 1500;
let pomoRunning = false;
let pomoMode = 'Focus Time';

const pomoRing = document.getElementById('pomoRing');
const pomoTimeEl = document.getElementById('pomoTime');
const pomoLabelEl = document.getElementById('pomoLabel');
const pomoStartBtn = document.getElementById('pomoStart');
const circumference = 553;

function setPomoDisplay(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  pomoTimeEl.textContent = `${m}:${s}`;
  const progress = seconds / pomoTotalTime;
  pomoRing.style.strokeDashoffset = circumference * (1 - progress);
}

function togglePomodoro() {
  if (pomoRunning) {
    clearInterval(pomoInterval);
    pomoRunning = false;
    pomoStartBtn.textContent = '▶ Resume';
  } else {
    pomoRunning = true;
    pomoStartBtn.textContent = '⏸ Pause';
    pomoInterval = setInterval(() => {
      pomoTimeLeft--;
      setPomoDisplay(pomoTimeLeft);
      if (pomoTimeLeft <= 0) {
        clearInterval(pomoInterval);
        pomoRunning = false;
        pomoStartBtn.textContent = '▶ Start';

        // Session complete
        if (pomoMode === 'Focus Time') {
          state.pomodoroSessions++;
          saveState();
          renderSessionDots();
          showToast('🍅 Focus session complete! Time for a break!');
          playNotification();
        } else {
          showToast('☕ Break over! Back to work!');
          playNotification();
        }
        pomoTimeLeft = pomoTotalTime;
        setPomoDisplay(pomoTotalTime);
      }
    }, 1000);
  }
}

function resetPomodoro() {
  clearInterval(pomoInterval);
  pomoRunning = false;
  pomoStartBtn.textContent = '▶ Start';
  pomoTimeLeft = pomoTotalTime;
  setPomoDisplay(pomoTotalTime);
}

function playNotification() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch(e) {}
}

function renderSessionDots() {
  document.getElementById('pomoSessions').textContent = state.pomodoroSessions;
  const container = document.getElementById('sessionDots');
  container.innerHTML = '';
  for (let i = 0; i < Math.min(state.pomodoroSessions % 8 || (state.pomodoroSessions > 0 ? 8 : 0), 8); i++) {
    const dot = document.createElement('div');
    dot.className = 'session-dot';
    container.appendChild(dot);
  }
}

// Mode switching
document.querySelectorAll('.pomo-mode').forEach(btn => {
  btn.addEventListener('click', () => {
    clearInterval(pomoInterval);
    pomoRunning = false;
    pomoStartBtn.textContent = '▶ Start';

    document.querySelectorAll('.pomo-mode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    pomoTotalTime = parseInt(btn.dataset.time);
    pomoTimeLeft = pomoTotalTime;
    pomoMode = btn.id === 'btnFocus' ? 'Focus Time' : btn.id === 'btnBreak' ? 'Short Break' : 'Long Break';
    pomoLabelEl.textContent = pomoMode;

    // Change ring color based on mode
    if (btn.id === 'btnFocus') pomoRing.style.stroke = 'var(--accent)';
    else if (btn.id === 'btnBreak') pomoRing.style.stroke = 'var(--success)';
    else pomoRing.style.stroke = 'var(--warning)';

    setPomoDisplay(pomoTimeLeft);
  });
});

// Init
setPomoDisplay(pomoTimeLeft);
renderSessionDots();
