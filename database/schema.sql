CREATE TABLE IF NOT EXISTS accounts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    auth_provider VARCHAR(30) NOT NULL DEFAULT 'email',
    account_status VARCHAR(20) NOT NULL DEFAULT 'active',
    plan_type VARCHAR(30) NOT NULL DEFAULT 'free',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    CHECK (account_status IN ('active', 'inactive', 'blocked', 'pending'))
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    birth_date DATE,
    sex VARCHAR(20),
    height_cm DECIMAL(5,2),
    current_weight_kg DECIMAL(6,2),
    target_weight_kg DECIMAL(6,2),
    activity_level VARCHAR(30),
    training_level VARCHAR(30),
    timezone VARCHAR(60) DEFAULT 'America/Sao_Paulo',
    avatar_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_profiles_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_goals (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    goal_type VARCHAR(40) NOT NULL,
    goal_status VARCHAR(20) NOT NULL DEFAULT 'active',
    target_value DECIMAL(10,2),
    target_unit VARCHAR(20),
    target_date DATE,
    focus_area VARCHAR(120),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_goals_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_health_profiles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL UNIQUE,
    injuries_notes TEXT,
    limitations_notes TEXT,
    medications_notes TEXT,
    chronic_conditions_notes TEXT,
    sleep_hours_avg DECIMAL(4,2),
    water_intake_liters_goal DECIMAL(4,2),
    stress_level_avg SMALLINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_health_profiles_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_nutrition_preferences (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL UNIQUE,
    diet_style VARCHAR(50),
    meals_per_day SMALLINT,
    allergies_notes TEXT,
    restrictions_notes TEXT,
    preferred_foods TEXT,
    disliked_foods TEXT,
    supplement_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_nutrition_preferences_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS body_measurements (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    measured_at TIMESTAMP NOT NULL,
    weight_kg DECIMAL(6,2),
    body_fat_pct DECIMAL(5,2),
    lean_mass_kg DECIMAL(6,2),
    bmi DECIMAL(5,2),
    waist_cm DECIMAL(5,2),
    abdomen_cm DECIMAL(5,2),
    chest_cm DECIMAL(5,2),
    hip_cm DECIMAL(5,2),
    arm_cm DECIMAL(5,2),
    thigh_cm DECIMAL(5,2),
    calf_cm DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_body_measurements_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bioimpedance_records (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    weight_kg DECIMAL(6,2),
    body_fat_pct DECIMAL(5,2),
    skeletal_muscle_pct DECIMAL(5,2),
    muscle_mass_kg DECIMAL(6,2),
    lean_mass_kg DECIMAL(6,2),
    body_water_pct DECIMAL(5,2),
    basal_metabolic_rate INTEGER,
    visceral_fat_level DECIMAL(5,2),
    metabolic_age SMALLINT,
    device_name VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bioimpedance_records_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS progress_photos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    captured_at TIMESTAMP NOT NULL,
    angle_type VARCHAR(20) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    storage_key VARCHAR(255),
    comparison_group VARCHAR(80),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_progress_photos_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS training_plans (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    goal_id BIGINT,
    title VARCHAR(150) NOT NULL,
    objective_summary TEXT,
    difficulty_level VARCHAR(30),
    weekly_frequency SMALLINT,
    duration_weeks SMALLINT,
    generated_by VARCHAR(30) NOT NULL DEFAULT 'manual',
    plan_status VARCHAR(20) NOT NULL DEFAULT 'draft',
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_training_plans_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_plans_goal
      FOREIGN KEY (goal_id) REFERENCES user_goals(id) ON DELETE SET NULL,
    CHECK (plan_status IN ('draft', 'active', 'archived'))
);

CREATE TABLE IF NOT EXISTS training_days (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    training_plan_id BIGINT NOT NULL,
    day_label VARCHAR(40) NOT NULL,
    focus_group VARCHAR(120),
    estimated_minutes SMALLINT,
    notes TEXT,
    order_index SMALLINT NOT NULL,
    CONSTRAINT fk_training_days_plan
      FOREIGN KEY (training_plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS training_exercises (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    training_day_id BIGINT NOT NULL,
    exercise_name VARCHAR(150) NOT NULL,
    equipment VARCHAR(100),
    sets_count SMALLINT,
    reps_text VARCHAR(30),
    rest_seconds SMALLINT,
    tempo_text VARCHAR(30),
    intensity_text VARCHAR(50),
    video_url VARCHAR(500),
    notes TEXT,
    order_index SMALLINT NOT NULL,
    CONSTRAINT fk_training_exercises_day
      FOREIGN KEY (training_day_id) REFERENCES training_days(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workout_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    training_plan_id BIGINT,
    training_day_id BIGINT,
    completed_at TIMESTAMP NOT NULL,
    duration_minutes SMALLINT,
    perceived_effort DECIMAL(4,2),
    calories_burned DECIMAL(7,2),
    completion_status VARCHAR(20) NOT NULL DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workout_logs_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_workout_logs_plan
      FOREIGN KEY (training_plan_id) REFERENCES training_plans(id) ON DELETE SET NULL,
    CONSTRAINT fk_workout_logs_day
      FOREIGN KEY (training_day_id) REFERENCES training_days(id) ON DELETE SET NULL,
    CHECK (completion_status IN ('completed', 'partial', 'skipped'))
);

CREATE TABLE IF NOT EXISTS diet_plans (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    goal_id BIGINT,
    checkin_id BIGINT,
    title VARCHAR(150) NOT NULL,
    objective_summary TEXT,
    kcal_target INTEGER,
    protein_g DECIMAL(7,2),
    carbs_g DECIMAL(7,2),
    fats_g DECIMAL(7,2),
    fiber_g DECIMAL(7,2),
    water_target_liters DECIMAL(4,2),
    variation_level VARCHAR(20),
    meal_count_available SMALLINT,
    generated_by VARCHAR(30) NOT NULL DEFAULT 'manual',
    plan_status VARCHAR(20) NOT NULL DEFAULT 'draft',
    valid_from DATE,
    valid_until DATE,
    source_preferences_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_diet_plans_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_diet_plans_goal
      FOREIGN KEY (goal_id) REFERENCES user_goals(id) ON DELETE SET NULL,
    CHECK (plan_status IN ('draft', 'active', 'archived'))
);

CREATE TABLE IF NOT EXISTS diet_meals (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    diet_plan_id BIGINT NOT NULL,
    day_id VARCHAR(30),
    slot_id VARCHAR(60),
    meal_name VARCHAR(120) NOT NULL,
    meal_time TIME,
    order_index SMALLINT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    meal_status VARCHAR(20) NOT NULL DEFAULT 'active',
    kcal_target DECIMAL(7,2),
    protein_g DECIMAL(7,2),
    carbs_g DECIMAL(7,2),
    fats_g DECIMAL(7,2),
    water_target_liters DECIMAL(4,2),
    notes TEXT,
    CONSTRAINT fk_diet_meals_plan
      FOREIGN KEY (diet_plan_id) REFERENCES diet_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS diet_meal_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    diet_meal_id BIGINT NOT NULL,
    food_preference_item_id TEXT,
    preference_mark TEXT,
    food_name VARCHAR(150) NOT NULL,
    quantity_text VARCHAR(60),
    unit VARCHAR(30),
    kcal DECIMAL(7,2),
    protein_g DECIMAL(7,2),
    carbs_g DECIMAL(7,2),
    fats_g DECIMAL(7,2),
    substitution_group VARCHAR(80),
    order_index SMALLINT NOT NULL DEFAULT 0,
    meal_item_status VARCHAR(20) NOT NULL DEFAULT 'active',
    notes TEXT,
    CONSTRAINT fk_diet_meal_items_meal
      FOREIGN KEY (diet_meal_id) REFERENCES diet_meals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS diet_meal_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    diet_plan_id BIGINT,
    diet_meal_id BIGINT,
    day_id VARCHAR(30) NOT NULL,
    slot_id VARCHAR(60) NOT NULL,
    meal_name VARCHAR(120) NOT NULL,
    log_date DATE NOT NULL,
    scheduled_at TIMESTAMPTZ,
    performed_at TIMESTAMPTZ,
    log_status VARCHAR(30) NOT NULL DEFAULT 'completed',
    source VARCHAR(30) NOT NULL DEFAULT 'manual',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_diet_meal_logs_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_diet_meal_logs_plan
      FOREIGN KEY (diet_plan_id) REFERENCES diet_plans(id) ON DELETE SET NULL,
    CONSTRAINT fk_diet_meal_logs_meal
      FOREIGN KEY (diet_meal_id) REFERENCES diet_meals(id) ON DELETE SET NULL,
    UNIQUE (account_id, diet_plan_id, day_id, slot_id, log_date)
);

CREATE TABLE IF NOT EXISTS checkins (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    checkin_date DATE NOT NULL,
    weight_kg DECIMAL(6,2),
    energy_score SMALLINT,
    sleep_score SMALLINT,
    mood_score SMALLINT,
    stress_score SMALLINT,
    diet_adherence_pct DECIMAL(5,2),
    workout_adherence_pct DECIMAL(5,2),
    water_intake_liters DECIMAL(4,2),
    observations TEXT,
    next_action TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_checkins_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CHECK (energy_score BETWEEN 1 AND 5 OR energy_score IS NULL),
    CHECK (sleep_score BETWEEN 1 AND 5 OR sleep_score IS NULL),
    CHECK (mood_score BETWEEN 1 AND 5 OR mood_score IS NULL),
    CHECK (stress_score BETWEEN 1 AND 5 OR stress_score IS NULL)
);

ALTER TABLE diet_plans
  DROP CONSTRAINT IF EXISTS fk_diet_plans_checkin,
  ADD CONSTRAINT fk_diet_plans_checkin
    FOREIGN KEY (checkin_id) REFERENCES checkins(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS chat_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    context_type VARCHAR(50) NOT NULL DEFAULT 'general',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_sessions_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id BIGINT NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    tokens_used INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_messages_session
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    CHECK (sender_type IN ('user', 'assistant', 'system'))
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    source_event VARCHAR(50) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    summary_text TEXT NOT NULL,
    recommendation_status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_at TIMESTAMP,
    CONSTRAINT fk_ai_recommendations_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CHECK (recommendation_status IN ('open', 'applied', 'ignored'))
);

CREATE INDEX IF NOT EXISTS idx_user_goals_account_active
    ON user_goals (account_id, is_active);

CREATE INDEX IF NOT EXISTS idx_body_measurements_account_date
    ON body_measurements (account_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_bioimpedance_records_account_date
    ON bioimpedance_records (account_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_progress_photos_account_date
    ON progress_photos (account_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_plans_account_status
    ON training_plans (account_id, plan_status);

CREATE INDEX IF NOT EXISTS idx_workout_logs_account_date
    ON workout_logs (account_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_diet_plans_account_status
    ON diet_plans (account_id, plan_status);

CREATE INDEX IF NOT EXISTS idx_diet_plans_account_checkin
    ON diet_plans (account_id, checkin_id);

CREATE INDEX IF NOT EXISTS idx_diet_meals_plan_day
    ON diet_meals (diet_plan_id, day_id, order_index);

CREATE INDEX IF NOT EXISTS idx_diet_meal_items_meal_order
    ON diet_meal_items (diet_meal_id, order_index);

CREATE INDEX IF NOT EXISTS idx_diet_meal_items_food_preference
    ON diet_meal_items (food_preference_item_id);

CREATE INDEX IF NOT EXISTS idx_diet_meal_logs_account_date
    ON diet_meal_logs (account_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_diet_meal_logs_plan_date
    ON diet_meal_logs (diet_plan_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_account_date
    ON checkins (account_id, checkin_date DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_account
    ON chat_sessions (account_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_date
    ON chat_messages (session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_account_status
    ON ai_recommendations (account_id, recommendation_status);
