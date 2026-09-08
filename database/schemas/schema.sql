-- SportX Relational Database Schema
-- Compatible with SQLite / PostgreSQL

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    name TEXT NOT NULL,
    college_name TEXT,
    department TEXT,
    fitness_goal TEXT DEFAULT 'fitness',
    fitness_level TEXT DEFAULT 'beginner',
    available_time_minutes INTEGER DEFAULT 20,
    total_xp INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Exercises Table
CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_area TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    ai_supported BOOLEAN DEFAULT 1,
    description TEXT
);

-- 3. Workout Sessions Table
CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    completed_reps INTEGER NOT NULL,
    form_score REAL NOT NULL,
    duration_seconds INTEGER NOT NULL,
    calories_burned REAL,
    xp_earned INTEGER DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(exercise_id) REFERENCES exercises(id)
);

-- 4. Challenges Table
CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    target_metric TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    participants_count INTEGER DEFAULT 0,
    badge_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Challenge Participants Table
CREATE TABLE IF NOT EXISTS challenge_participants (
    id TEXT PRIMARY KEY,
    challenge_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    progress_value INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    FOREIGN KEY(challenge_id) REFERENCES challenges(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);
