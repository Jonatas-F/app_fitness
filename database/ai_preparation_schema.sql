CREATE TABLE IF NOT EXISTS ai_generation_runs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  generation_type VARCHAR(40) NOT NULL,
  model VARCHAR(120),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  instructions TEXT,
  input_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_text TEXT,
  response_json JSONB,
  error_message TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (generation_type IN ('chat', 'diet', 'workout', 'recommendation')),
  CHECK (status IN ('pending', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS ai_data_writes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ai_generation_run_id BIGINT REFERENCES ai_generation_runs(id) ON DELETE SET NULL,
  target_table VARCHAR(80) NOT NULL,
  target_id BIGINT,
  action VARCHAR(30) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (action IN ('insert', 'update', 'archive', 'delete', 'noop'))
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_runs_account_date
  ON ai_generation_runs (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generation_runs_account_type
  ON ai_generation_runs (account_id, generation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_data_writes_account_date
  ON ai_data_writes (account_id, created_at DESC);

WITH ranked_training AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY updated_at DESC, id DESC) AS rn
  FROM training_plans
  WHERE plan_status = 'active'
)
UPDATE training_plans tp
SET plan_status = 'archived',
    updated_at = CURRENT_TIMESTAMP
FROM ranked_training rt
WHERE tp.id = rt.id
  AND rt.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_plans_one_active
  ON training_plans (account_id)
  WHERE plan_status = 'active';

WITH ranked_diets AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY updated_at DESC, id DESC) AS rn
  FROM diet_plans
  WHERE plan_status = 'active'
)
UPDATE diet_plans dp
SET plan_status = 'archived',
    updated_at = CURRENT_TIMESTAMP
FROM ranked_diets rd
WHERE dp.id = rd.id
  AND rd.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_diet_plans_one_active
  ON diet_plans (account_id)
  WHERE plan_status = 'active';
