CREATE OR REPLACE VIEW vw_latest_body_measurement AS
SELECT bm.*
FROM body_measurements bm
WHERE bm.id = (
    SELECT bm2.id
    FROM body_measurements bm2
    WHERE bm2.account_id = bm.account_id
    ORDER BY bm2.measured_at DESC, bm2.id DESC
    FETCH FIRST 1 ROW ONLY
);

CREATE OR REPLACE VIEW vw_latest_checkin AS
SELECT c.*
FROM checkins c
WHERE c.id = (
    SELECT c2.id
    FROM checkins c2
    WHERE c2.account_id = c.account_id
    ORDER BY c2.checkin_date DESC, c2.id DESC
    FETCH FIRST 1 ROW ONLY
);

CREATE OR REPLACE VIEW vw_dashboard_snapshot AS
SELECT
    a.id AS account_id,
    a.email,
    p.full_name,
    p.height_cm,
    p.current_weight_kg,
    g.goal_type AS active_goal_type,
    g.target_value AS active_goal_value,
    g.target_unit AS active_goal_unit,
    tp.id AS active_training_plan_id,
    tp.title AS active_training_plan_title,
    dp.id AS active_diet_plan_id,
    dp.title AS active_diet_plan_title,
    bm.measured_at AS latest_measurement_at,
    bm.weight_kg AS latest_weight_kg,
    bm.body_fat_pct AS latest_body_fat_pct,
    bm.lean_mass_kg AS latest_lean_mass_kg,
    ck.checkin_date AS latest_checkin_date,
    ck.energy_score,
    ck.sleep_score,
    ck.diet_adherence_pct,
    ck.workout_adherence_pct
FROM accounts a
LEFT JOIN user_profiles p
    ON p.account_id = a.id
LEFT JOIN user_goals g
    ON g.account_id = a.id
   AND g.is_active = TRUE
LEFT JOIN training_plans tp
    ON tp.account_id = a.id
   AND tp.plan_status = 'active'
LEFT JOIN diet_plans dp
    ON dp.account_id = a.id
   AND dp.plan_status = 'active'
LEFT JOIN vw_latest_body_measurement bm
    ON bm.account_id = a.id
LEFT JOIN vw_latest_checkin ck
    ON ck.account_id = a.id;

CREATE OR REPLACE VIEW vw_workout_execution_daily AS
SELECT
    account_id,
    CAST(completed_at AS DATE) AS execution_date,
    COUNT(*) AS total_sessions,
    SUM(CASE WHEN completion_status = 'completed' THEN 1 ELSE 0 END) AS completed_sessions,
    SUM(CASE WHEN completion_status = 'partial' THEN 1 ELSE 0 END) AS partial_sessions,
    SUM(CASE WHEN completion_status = 'skipped' THEN 1 ELSE 0 END) AS skipped_sessions,
    AVG(perceived_effort) AS avg_perceived_effort
FROM workout_logs
GROUP BY account_id, CAST(completed_at AS DATE);

CREATE OR REPLACE VIEW vw_checkin_adherence_summary AS
SELECT
    account_id,
    COUNT(*) AS total_checkins,
    AVG(diet_adherence_pct) AS avg_diet_adherence_pct,
    AVG(workout_adherence_pct) AS avg_workout_adherence_pct,
    AVG(energy_score) AS avg_energy_score,
    AVG(sleep_score) AS avg_sleep_score
FROM checkins
GROUP BY account_id;