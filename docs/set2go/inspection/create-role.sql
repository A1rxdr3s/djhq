-- REVIEW ONLY. Do not execute until the PUBLIC privilege audit in README passes.
-- NOLOGIN prevents access until password provisioning and privilege review are complete.
-- No password, grants, role memberships, or changes to existing objects are included.
CREATE ROLE djqh_schema_inspector NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE djqh_schema_inspector SET default_transaction_read_only = on;
-- After review: provision password through a secure client and separately enable LOGIN.
-- The read-only setting is a guardrail, not a privilege boundary.
