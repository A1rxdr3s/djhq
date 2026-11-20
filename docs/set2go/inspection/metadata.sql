\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT version();
SELECT nspname FROM pg_catalog.pg_namespace WHERE nspname IN ('public','auth','supabase_migrations') ORDER BY 1;
SELECT n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','supabase_migrations') AND (c.relname LIKE 'set2go%' OR (n.nspname='auth' AND c.relname='users') OR c.relname IN ('artists','schema_migrations')) ORDER BY 1,2;
SELECT n.nspname,c.relname,a.attname,pg_catalog.format_type(a.atttypid,a.atttypmod) AS type FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped AND ((n.nspname='public' AND (c.relname LIKE 'set2go%' OR c.relname='artists')) OR (n.nspname='auth' AND c.relname='users' AND a.attname='id')) ORDER BY 1,2,a.attnum;
SELECT n.nspname,p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,p.prosecdef,p.proconfig,pg_catalog.has_function_privilege(current_user,p.oid,'EXECUTE') AS inspector_can_execute FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'set2go%' ORDER BY 1,2;
SELECT n.nspname,c.relname,pg_catalog.has_table_privilege(current_user,c.oid,'SELECT') AS can_select,pg_catalog.has_table_privilege(current_user,c.oid,'INSERT') AS can_insert,pg_catalog.has_table_privilege(current_user,c.oid,'UPDATE') AS can_update FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth') AND (c.relname LIKE 'set2go%' OR c.relname IN ('artists','users')) AND c.relkind IN ('r','p','v') ORDER BY 1,2;
SELECT nspname,pg_catalog.has_schema_privilege(current_user,oid,'CREATE') AS can_create FROM pg_catalog.pg_namespace WHERE nspname IN ('public','auth','supabase_migrations');
SELECT schemaname,tablename,policyname,roles,cmd FROM pg_catalog.pg_policies WHERE schemaname='public' AND (tablename LIKE 'set2go%' OR tablename='artists') ORDER BY 1,2,3;
SELECT current_user, pg_catalog.has_database_privilege(current_user,current_database(),'TEMPORARY') AS can_create_temp;
SELECT r.rolname AS granted_role FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid=m.roleid JOIN pg_catalog.pg_roles member ON member.oid=m.member WHERE member.rolname=current_user ORDER BY 1;
SELECT n.nspname, count(*) AS executable_security_definer_functions FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth') AND p.prosecdef AND pg_catalog.has_function_privilege(current_user,p.oid,'EXECUTE') GROUP BY n.nspname;
-- Migration history contains rows, not catalog metadata. No access is granted here.
-- Determine version 082 only through an independently authorized metadata-only process.
COMMIT;
