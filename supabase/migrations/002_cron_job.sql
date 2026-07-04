-- Run this AFTER deploying the check-gaming-limit edge function.
-- Replace YOUR_PROJECT_REF with your Supabase project reference ID.
-- The SUPABASE_SERVICE_ROLE_KEY secret must be set in your project.

select cron.schedule(
  'check-gaming-limit',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-gaming-limit',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
