-- Remove the demo tagline that was hard-coded in 001_initial_schema.sql seed data.
-- That text was never intended as real artist copy — it was a developer placeholder.
-- Nulling it prevents the phrase from appearing as a headline on the public Press Kit.
-- Artists who want a tagline can configure one via the HQ dashboard.
UPDATE public.artists
  SET tagline = null
  WHERE tagline = 'Peak-time house and techno for modern club rooms.';
