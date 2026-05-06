# ⚡ StudyFlow — AI-Based Study Planner & Productivity Tracker

A modern, full-stack Final Year Project web application with AI-powered study scheduling, Pomodoro timer, progress tracking, and analytics.

---

## 📁 Project Structure

```
study-planner/
├── frontend/
│   ├── index.html          ← Main app (single-page)
│   ├── css/
│   │   └── style.css       ← Full UI with dark/light mode
│   └── js/
│       ├── app.js          ← Core state, navigation, tasks
│       ├── planner.js      ← AI schedule generator + calendar
│       ├── pomodoro.js     ← Pomodoro timer with audio
│       └── charts.js       ← Analytics, bar/pie charts
├── backend/
│   ├── app.py              ← Flask REST API
│   ├── requirements.txt    ← Python dependencies
│   └── StudyFlow_Backend.ipynb  ← Google Colab version
└── README.md
```

---

## 🚀 Running Locally

### Frontend Only (No Backend Needed)
The app works 100% offline using `localStorage`:

```bash
# Option 1: Open directly
open frontend/index.html

# Option 2: Serve with Python
cd frontend
python -m http.server 3000
# Visit http://localhost:3000
```

### Full Stack (Frontend + Flask Backend)

**Step 1: Set up Python backend**
```bash
cd backend
pip install -r requirements.txt
python app.py
# API runs at http://localhost:5000
```

**Step 2: Serve frontend**
```bash
cd frontend
python -m http.server 3000
```

**Step 3: Open** `http://localhost:3000` in your browser.

---

## 🧠 AI/ML Component Explained

### Algorithm: Rule-Based Priority Scheduler

**Priority Score Formula:**
```
Priority = (Difficulty × 3) + (Urgency × 2) + (1 / Hours_Per_Day)
```

| Factor | Weight | Explanation |
|--------|--------|-------------|
| Difficulty | ×3 | Hard subjects need more early attention |
| Urgency | ×2 | Closer deadlines = higher priority (1–10 scale) |
| Hours/day | ÷ | More hours = slightly lower priority (already covered) |

**Study Days Assignment:**
- Easy subject → 2 study sessions
- Medium subject → 3 study sessions  
- Hard subject → 4 study sessions

**Completion Prediction:**
```
Prediction% = 100 - (difficulty × 10) + (min(hours,4) × 5) - (priority × 0.5)
```
Outputs a 10–95% completion likelihood per task.

**Spaced Repetition:**
Subjects are interleaved across the week (not back-to-back) for better retention.

---

## 🌐 Deployment Guide

### Frontend → Vercel

1. Push `frontend/` folder to GitHub:
```bash
git init
git add .
git commit -m "StudyFlow v1.0"
git remote add origin https://github.com/YOUR_USERNAME/studyflow.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Click Deploy ✅

### Backend → Render (Free)

1. Push `backend/` to GitHub (or same repo)
2. Go to [render.com](https://render.com) → New Web Service
3. Connect GitHub repo, set:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python app.py`
4. Copy the public URL (e.g. `https://studyflow-api.onrender.com`)
5. In `frontend/js/app.js`, set:
```javascript
const API_BASE = "https://studyflow-api.onrender.com";
```

### Backend → Google Colab (Free, Temporary)

Open `backend/StudyFlow_Backend.ipynb` in Colab and follow the steps. Uses `ngrok` for a public tunnel.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/subjects` | List all subjects |
| POST | `/api/subjects` | Add a subject |
| DELETE | `/api/subjects/:id` | Remove a subject |
| POST | `/api/generate-schedule` | AI schedule generation |
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Add a task |
| PATCH | `/api/tasks/:id` | Update task (mark complete) |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/analytics` | Full analytics + recommendations |

### Example API Call
```javascript
// Add a subject
fetch('http://localhost:5000/api/subjects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Mathematics",
    difficulty: 3,
    deadline: "2025-06-15",
    hours_per_day: 2
  })
});

// Generate AI schedule
fetch('http://localhost:5000/api/generate-schedule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ subjects: [] })  // Uses DB subjects
});
```

---

## ✨ Features

| Feature | Status |
|---------|--------|
| Subject + deadline management | ✅ |
| AI-powered weekly schedule | ✅ |
| Drag-free task cards (click to complete) | ✅ |
| Weekly calendar view | ✅ |
| Pomodoro timer (25/5/15 min) | ✅ |
| Productivity score (circular) | ✅ |
| Animated progress bars | ✅ |
| Bar chart (weekly activity) | ✅ |
| Pie chart (subject distribution) | ✅ |
| AI recommendations | ✅ |
| Dark / Light mode toggle | ✅ |
| Export schedule as .txt | ✅ |
| Mobile responsive | ✅ |
| Offline (localStorage) | ✅ |
| Flask REST API | ✅ |
| SQLite database | ✅ |

---

## 🎓 FYP Documentation Notes

### Tech Stack
- **Frontend:** HTML5, CSS3 (custom properties, grid, flexbox), Vanilla JS (ES6+)
- **Backend:** Python 3.x, Flask 3.0, SQLite3
- **ML/AI:** Rule-based priority scoring + linear completion prediction
- **Deployment:** Vercel (frontend) + Render/Colab (backend)

### Design Patterns Used
- **MVC:** Separation of data (state), view (HTML/CSS), and controller (JS)
- **Responsive Design:** CSS Grid + media queries for all screen sizes
- **Progressive Enhancement:** App works without backend (localStorage fallback)

### Database Schema
```sql
subjects (id, name, difficulty, deadline, hours_per_day, created_at)
tasks    (id, name, subject, difficulty, deadline, hours, date, completed, completed_at)
progress (id, date, tasks_completed, study_minutes)
```

---

## 👨‍💻 Author
Built as Final Year Project — AI-Based Study Planner
