-- Read-only inspection for the existing DJHQ project. No application rows are read.
-- Assumes Supabase's schema_migrations table has version and name columns.
-- If that table is absent or inaccessible, omit the migration_history CTE and its
-- SELECT below; this script cannot safely discover its contents dynamically.
WITH
migration_history AS (
  SELECT version, name
  FROM supabase_migrations.schema_migrations
  WHERE version = '082' OR name ILIKE '%set2go%'
  ORDER BY version DESC LIMIT 30
),
objects AS (
  SELECT n.nspname AS schema_name, c.relname AS object_name,
         c.relkind, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'auth')
    AND (c.relname IN ('artists', 'users', 'set2go_upload_sessions', 'set2go_upload_tracks',
                       'set2go_upload_sessions_owner_idx', 'set2go_upload_sessions_cleanup_idx', 'set2go_upload_tracks_session_idx')
         OR (n.nspname = 'public' AND c.relname LIKE 'set2go%'))
  ORDER BY n.nspname, c.relname LIMIT 100
),
functions AS (
  SELECT n.nspname AS schema_name, p.proname AS function_name,
         pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
         pg_catalog.pg_get_userbyid(p.proowner) AS owner,
         p.prosecdef AS security_definer, p.proconfig AS settings,
         pg_catalog.pg_get_functiondef(p.oid) AS definition,
         p.proacl AS acl,
         (SELECT pg_catalog.jsonb_object_agg(r.rolname, pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE'))
          FROM pg_catalog.pg_roles r WHERE r.rolname IN ('anon', 'authenticated', 'service_role')) AS execute_privileges
  FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('set2go_reserve_track', 'set2go_transition_track') AND p.prokind = 'f'
  ORDER BY p.proname, arguments LIMIT 20
),
relationships AS (
  SELECT ns.nspname AS source_schema, src.relname AS source_table,
         con.conname AS constraint_name, pg_catalog.pg_get_constraintdef(con.oid) AS definition
  FROM pg_catalog.pg_constraint con
  JOIN pg_catalog.pg_class src ON src.oid = con.conrelid
  JOIN pg_catalog.pg_namespace ns ON ns.oid = src.relnamespace
  WHERE con.contype = 'f' AND ((ns.nspname = 'public' AND (src.relname = 'artists' OR src.relname LIKE 'set2go%'))
       OR (con.confrelid = pg_catalog.to_regclass('auth.users') AND ns.nspname = 'public'))
  ORDER BY 1, 2, 3 LIMIT 100
),
policies AS (
  SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
  FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename LIKE 'set2go%'
  ORDER BY tablename, policyname LIMIT 100
),
grants AS (
  SELECT grantee, table_name, privilege_type
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND table_name LIKE 'set2go%'
  ORDER BY table_name, grantee, privilege_type LIMIT 100
),
compatibility AS (
  SELECT pg_catalog.to_regclass('auth.users') IS NOT NULL AS auth_users_exists,
         EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid = pg_catalog.to_regclass('auth.users') AND a.attname = 'id' AND a.attnum > 0 AND NOT a.attisdropped AND a.atttypid = 'uuid'::regtype) AS auth_users_id_is_uuid,
         EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = 'gen_random_uuid' AND n.nspname IN ('pg_catalog', 'public', 'extensions') AND p.pronargs = 0) AS uuid_generator_exists,
         EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') AS anon_role_exists,
         EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') AS authenticated_role_exists,
         EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role') AS service_role_exists
)
SELECT '01_server' AS section, pg_catalog.jsonb_build_object('version', pg_catalog.version()) AS result
UNION ALL SELECT '02_schemas', pg_catalog.to_jsonb(x) FROM (SELECT nspname FROM pg_catalog.pg_namespace WHERE nspname IN ('public','auth','supabase_migrations')) x
UNION ALL SELECT '03_migration_history', pg_catalog.to_jsonb(x) FROM migration_history x
UNION ALL SELECT '04_objects', pg_catalog.to_jsonb(x) FROM objects x
UNION ALL SELECT '05_identity_relationships', pg_catalog.to_jsonb(x) FROM relationships x
UNION ALL SELECT '06_rls_policies', pg_catalog.to_jsonb(x) FROM policies x
UNION ALL SELECT '07_table_grants', pg_catalog.to_jsonb(x) FROM grants x
UNION ALL SELECT '08_functions', pg_catalog.to_jsonb(x) FROM functions x
UNION ALL SELECT '09_compatibility', pg_catalog.to_jsonb(x) FROM compatibility x
ORDER BY section, result;
