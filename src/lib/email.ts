// ─── Email canonicalization (MON-54 account-dedup) ──────────────────────────
//
// Gmail (and the googlemail.com alias) ignore dots and anything after a "+" in
// the local part, and are case-insensitive — so dustin.weeres@gmail.com,
// dustinweeres@gmail.com, and DustinWeeres+test@googlemail.com ALL deliver to
// one inbox owned by one person. Supabase/GoTrue, however, compares raw email
// strings, so each variant mints a SEPARATE auth user. Worse, Google OAuth
// returns the dotless form, so a dotted password signup can never auto-link to
// the user's Google identity → the split-account bug we hit (see memory).
//
// Canonicalizing Gmail addresses to one stable form on the password signup/login
// path makes those rows match what Google returns, so a single account is reused.
// This is SAFE only because the whole dot/`+` space of a Gmail address resolves
// to a single owner — we never collapse two different people. Non-Gmail domains
// are left untouched, where dots and `+tags` ARE significant to delivery.

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Lowercase + trim every address; additionally fold Gmail dot/`+tag`/googlemail
 * variants onto their canonical `local@gmail.com` form. Use this for any email
 * that feeds Supabase auth (signUp / signInWithPassword / resetPasswordForEmail)
 * so the same human always resolves to the same auth user.
 */
export function canonicalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at <= 0) return email; // not a sensible address — leave as-is
  const domain = email.slice(at + 1);
  if (!GMAIL_DOMAINS.has(domain)) return email;
  // Gmail: strip everything from the first "+" and remove all dots in the local part.
  const local = email.slice(0, at).split('+')[0].replace(/\./g, '');
  return `${local}@gmail.com`;
}
