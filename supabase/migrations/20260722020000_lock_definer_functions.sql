-- Definer-function EXECUTE cleanup (follow-up to 20260722010000).
--
-- Postgres grants EXECUTE to PUBLIC by default, so the earlier "revoke from
-- anon, authenticated" was ineffective (those roles inherit via PUBLIC). Revoke
-- PUBLIC and re-grant only where a real caller needs it. Idempotent.

-- REAL FIX: blog_draft_secret_matches was PUBLIC-executable — anon could call it
-- as a boolean oracle to brute-force the blog draft secret. Lock to service_role
-- (the submit-blog-draft edge function). Mirrors push_webhook_secret_matches.
revoke execute on function public.blog_draft_secret_matches(text) from public, anon, authenticated;
grant  execute on function public.blog_draft_secret_matches(text) to service_role;

-- Publisher is a cron/service job (publishes due scheduled posts + revalidate
-- webhook). No client should trigger it on demand.
revoke execute on function public._publish_blog_posts() from public, anon, authenticated;
grant  execute on function public._publish_blog_posts() to service_role;

-- Pin the publish-guard trigger's search_path (uses only current_setting + NEW).
alter function public._blog_posts_publish_guard() set search_path = '';

-- Trigger fn, never legitimately RPC-called; triggers fire regardless of EXECUTE
-- grants, so revoking PUBLIC is safe and clears the advisor.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Parent-callable (rotate a kid's pairing code); self-gates on auth.uid(). Remove
-- anon/PUBLIC reachability but KEEP authenticated so the app feature still works.
revoke execute on function public.rotate_kid_pairing_code(uuid) from public, anon;
grant  execute on function public.rotate_kid_pairing_code(uuid) to authenticated;
