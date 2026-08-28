-- Phase 25: Add pricing per hour to estimates module
-- Run after: all previous phases

-- Add price_per_hour column to estimates table
alter table public.estimates add column if not exists price_per_hour numeric(10,2);

-- Update constraint if needed
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'estimates_price_per_hour_check'
  ) then
    alter table public.estimates
      add constraint estimates_price_per_hour_check
      check (price_per_hour is null or price_per_hour >= 0);
  end if;
end
$$;
