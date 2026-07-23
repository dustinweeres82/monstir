import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Kid-device pairing redeem — STANDING per-kid codes (MON-85 Phase 2).
// Each kid has one stable 8-digit code (kids.pairing_code). A kid types it on
// their own device to assume the PARENT session ("device acts as the household")
// and lock into their view. Codes are reusable (no expiry/consume).
//
// Auth layers: gateway requires the app's anon JWT (verify_jwt=true), the code
// itself is the secret, and failed attempts are IP-throttled to blunt brute
// force against the larger-but-permanent code space.

const MAX_FAILS = 10;            // per IP
const WINDOW_MIN = 10;           // minutes

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';

  let code: unknown;
  try { ({ code } = await req.json()); } catch { return json({ error: 'bad_request' }, 400); }
  if (typeof code !== 'string' || !/^[0-9]{8}$/.test(code)) return json({ error: 'invalid_code' }, 400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Throttle: too many recent failures from this IP -> reject before touching data.
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count: fails } = await admin
    .from('pairing_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gt('created_at', since);
  if ((fails ?? 0) >= MAX_FAILS) return json({ error: 'too_many_attempts' }, 429);

  const recordFail = () => admin.from('pairing_attempts').insert({ ip });

  // Look up the kid by their standing code.
  const { data: kid, error: kidErr } = await admin
    .from('kids')
    .select('id, name, parent_id')
    .eq('pairing_code', code)
    .maybeSingle();
  if (kidErr) return json({ error: 'server_error' }, 500);
  if (!kid) { await recordFail(); return json({ error: 'invalid_or_expired' }, 404); }

  // Resolve the parent's email to mint them a session on the kid device.
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(kid.parent_id);
  const email = userData?.user?.email;
  if (userErr || !email) return json({ error: 'parent_unavailable' }, 500);

  // Admin generateLink does NOT send an email; it returns a verifiable token.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !tokenHash) return json({ error: 'link_failed' }, 500);

  return json({ token_hash: tokenHash, kid_id: kid.id, kid_name: kid.name });
});
