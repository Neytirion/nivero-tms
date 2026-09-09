-- Restrict direct project updates to mutable business fields.
-- Ownership, manager assignment, intake tokens, and computed health fields
-- must only change through dedicated, permission-checked operations or triggers.

revoke update on public.projects from public, anon, authenticated;

grant update (
  name,
  description,
  customer_name,
  start_date,
  end_date,
  estimated_hours,
  budget_amount,
  status,
  completed_at,
  deadline_at,
  use_estimates
) on public.projects to authenticated;

-- These columns remain intentionally excluded from direct client updates:
-- owner_id, client_intake_token, actual_hours, progress_percent,
-- baseline_hours, hours_consumed_percent, expected_progress_percent,
-- hours_variance_percent, forecast_at_completion_percent, risk_status,
-- risk_reason, created_at, updated_at.

notify pgrst, 'reload schema';
