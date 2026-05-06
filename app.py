"""
StudyFlow — Flask Backend API
Run: python app.py
API runs on http://localhost:5000
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import sqlite3
from datetime import datetime, timedelta
import math

app = Flask(__name__)
CORS(app)  # Allow frontend to call backend

DB_PATH = "studyflow.db"

# ==================== DATABASE SETUP ====================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                difficulty INTEGER DEFAULT 2,
                deadline TEXT,
                hours_per_day REAL DEFAULT 2,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                subject TEXT NOT NULL,
                difficulty INTEGER DEFAULT 2,
                deadline TEXT,
                hours REAL DEFAULT 1,
                date TEXT,
                completed INTEGER DEFAULT 0,
                completed_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                tasks_completed INTEGER DEFAULT 0,
                study_minutes INTEGER DEFAULT 0
            );
        """)
    print("✅ Database initialized.")

# ==================== AI/ML LOGIC ====================

def calculate_priority(subject):
    """Rule-based priority score for AI scheduling."""
    difficulty = subject.get("difficulty", 2)
    deadline_str = subject.get("deadline", "")
    hours = float(subject.get("hours_per_day", 1))

    # Deadline urgency (1-10 scale)
    urgency = 5  # default if no deadline
    if deadline_str:
        try:
            deadline = datetime.strptime(deadline_str, "%Y-%m-%d")
            days_left = max(1, (deadline - datetime.now()).days)
            urgency = max(1, min(10, 11 - days_left))
        except:
            pass

    # Final priority score
    priority = (difficulty * 3) + (urgency * 2) + (1.0 / max(0.5, hours))
    return round(priority, 2)

def generate_ai_schedule(subjects):
    """Generate a weekly study plan using rule-based AI."""
    if not subjects:
        return []

    # Sort by priority (highest first)
    scored = [
        {**s, "priority": calculate_priority(s)}
        for s in subjects
    ]
    scored.sort(key=lambda x: x["priority"], reverse=True)

    tasks = []
    now = datetime.now()

    for idx, subject in enumerate(scored):
        difficulty = subject.get("difficulty", 2)
        deadline_str = subject.get("deadline", "")
        hours = float(subject.get("hours_per_day", 2))
        priority = subject["priority"]

        # Days to study: harder/more urgent = more days
        study_days = max(1, min(7, difficulty + 1))

        for day_offset in range(study_days):
            task_date = now + timedelta(days=(idx + day_offset) % 7)
            tasks.append({
                "name": f"{subject['name']} — Session {day_offset + 1}",
                "subject": subject["name"],
                "difficulty": difficulty,
                "deadline": deadline_str,
                "hours": hours,
                "date": task_date.strftime("%Y-%m-%d"),
                "priority": priority,
                "completion_prediction": predict_completion(difficulty, hours, priority)
            })

    return tasks

def predict_completion(difficulty, hours, priority):
    """Simple linear prediction model for task completion likelihood."""
    # Higher difficulty + low hours + high priority = lower completion likelihood
    score = 100 - (difficulty * 10) + (min(hours, 4) * 5) - (priority * 0.5)
    return round(max(10, min(95, score)), 1)

# ==================== API ROUTES ====================

@app.route("/", methods=["GET"])
def index():
    return jsonify({"message": "StudyFlow API is running!", "version": "1.0"})

# --- Subjects ---
@app.route("/api/subjects", methods=["GET"])
def get_subjects():
    with get_db() as db:
        rows = db.execute("SELECT * FROM subjects ORDER BY created_at DESC").fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/subjects", methods=["POST"])
def add_subject():
    data = request.json
    if not data or not data.get("name"):
        return jsonify({"error": "Subject name is required"}), 400

    with get_db() as db:
        db.execute(
            "INSERT INTO subjects (name, difficulty, deadline, hours_per_day) VALUES (?, ?, ?, ?)",
            (data["name"], data.get("difficulty", 2), data.get("deadline", ""), data.get("hours_per_day", 2))
        )
        db.commit()
    return jsonify({"message": f"Subject '{data['name']}' added successfully!"})

@app.route("/api/subjects/<int:subject_id>", methods=["DELETE"])
def delete_subject(subject_id):
    with get_db() as db:
        db.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
        db.commit()
    return jsonify({"message": "Subject deleted."})

# --- Schedule Generation ---
@app.route("/api/generate-schedule", methods=["POST"])
def generate_schedule():
    data = request.json or {}
    subjects = data.get("subjects", [])

    if not subjects:
        # Load from DB if not provided
        with get_db() as db:
            rows = db.execute("SELECT * FROM subjects").fetchall()
            subjects = [dict(r) for r in rows]

    if not subjects:
        return jsonify({"error": "No subjects found. Add subjects first."}), 400

    tasks = generate_ai_schedule(subjects)
    return jsonify({
        "tasks": tasks,
        "count": len(tasks),
        "message": f"Generated {len(tasks)} tasks for {len(subjects)} subjects."
    })

# --- Tasks ---
@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    with get_db() as db:
        rows = db.execute("SELECT * FROM tasks ORDER BY date ASC, priority DESC").fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.json
    if not data or not data.get("name"):
        return jsonify({"error": "Task name is required"}), 400

    with get_db() as db:
        db.execute(
            """INSERT INTO tasks (name, subject, difficulty, deadline, hours, date)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (data["name"], data.get("subject", "General"), data.get("difficulty", 2),
             data.get("deadline", ""), data.get("hours", 1), data.get("date", ""))
        )
        db.commit()
    return jsonify({"message": "Task added."})

@app.route("/api/tasks/<int:task_id>", methods=["PATCH"])
def update_task(task_id):
    data = request.json or {}
    completed = data.get("completed", False)
    completed_at = datetime.now().isoformat() if completed else None

    with get_db() as db:
        db.execute(
            "UPDATE tasks SET completed = ?, completed_at = ? WHERE id = ?",
            (1 if completed else 0, completed_at, task_id)
        )
        db.commit()
    return jsonify({"message": "Task updated."})

@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    with get_db() as db:
        db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        db.commit()
    return jsonify({"message": "Task deleted."})

# --- Analytics ---
@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    with get_db() as db:
        tasks = [dict(r) for r in db.execute("SELECT * FROM tasks").fetchall()]
        subjects = [dict(r) for r in db.execute("SELECT * FROM subjects").fetchall()]

    total = len(tasks)
    completed = sum(1 for t in tasks if t["completed"])
    pending = total - completed
    score = round((completed / total) * 100, 1) if total > 0 else 0

    # Per-subject stats
    subject_stats = {}
    for s in subjects:
        s_tasks = [t for t in tasks if t["subject"] == s["name"]]
        s_done = sum(1 for t in s_tasks if t["completed"])
        subject_stats[s["name"]] = {
            "total": len(s_tasks),
            "completed": s_done,
            "progress": round((s_done / len(s_tasks)) * 100, 1) if s_tasks else 0
        }

    # Daily activity (last 7 days)
    daily = {}
    for i in range(7):
        d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        daily[d] = sum(1 for t in tasks if t.get("completed_at", "")[:10] == d)

    # AI Recommendations
    recs = []
    for s in subjects:
        if s.get("deadline"):
            days_left = (datetime.strptime(s["deadline"], "%Y-%m-%d") - datetime.now()).days
            if 0 < days_left <= 3:
                recs.append(f"🚨 {s['name']}: deadline in {days_left} day(s)! Prioritize now.")
            elif 0 < days_left <= 7:
                recs.append(f"⚠️ {s['name']}: {days_left} days left. Increase focus.")

    if score < 30 and total > 3:
        recs.append("📈 Low completion rate. Break tasks into smaller sessions.")
    elif score > 80:
        recs.append("🏆 Excellent work! Keep the momentum going.")

    return jsonify({
        "total_tasks": total,
        "completed": completed,
        "pending": pending,
        "productivity_score": score,
        "subject_stats": subject_stats,
        "daily_activity": daily,
        "recommendations": recs
    })

# ==================== MAIN ====================
if __name__ == "__main__":
    init_db()
    print("🚀 StudyFlow API starting on http://localhost:5000")
    app.run(debug=True, port=5000)
