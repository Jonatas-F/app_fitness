ALTER TABLE diet_plans
  ADD COLUMN IF NOT EXISTS checkin_id BIGINT REFERENCES checkins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variation_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS meal_count_available SMALLINT,
  ADD COLUMN IF NOT EXISTS source_preferences_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE diet_meals
  ADD COLUMN IF NOT EXISTS day_id VARCHAR(30),
  ADD COLUMN IF NOT EXISTS slot_id VARCHAR(60),
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS meal_status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS water_target_liters DECIMAL(4,2);

ALTER TABLE diet_meal_items
  ADD COLUMN IF NOT EXISTS food_preference_item_id TEXT,
  ADD COLUMN IF NOT EXISTS preference_mark TEXT,
  ADD COLUMN IF NOT EXISTS order_index SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meal_item_status VARCHAR(20) NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_diet_plans_account_checkin
  ON diet_plans (account_id, checkin_id);

CREATE INDEX IF NOT EXISTS idx_diet_meals_plan_day
  ON diet_meals (diet_plan_id, day_id, order_index);

CREATE INDEX IF NOT EXISTS idx_diet_meal_items_meal_order
  ON diet_meal_items (diet_meal_id, order_index);

CREATE INDEX IF NOT EXISTS idx_diet_meal_items_food_preference
  ON diet_meal_items (food_preference_item_id);

CREATE TABLE IF NOT EXISTS diet_meal_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  diet_plan_id BIGINT REFERENCES diet_plans(id) ON DELETE SET NULL,
  diet_meal_id BIGINT REFERENCES diet_meals(id) ON DELETE SET NULL,
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
  UNIQUE (account_id, diet_plan_id, day_id, slot_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_diet_meal_logs_account_date
  ON diet_meal_logs (account_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_diet_meal_logs_plan_date
  ON diet_meal_logs (diet_plan_id, log_date DESC);
