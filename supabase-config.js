/**
 * SkillMapper — Supabase settings loaded by index.html
 *
 * The project URL and anon/publishable key are not confidential in client-side apps; they
 * appear in every request. Access control is enforced in Supabase with Row Level Security
 * (RLS) and table policies — not by hiding this file.
 *
 * Do not add the service_role key here (or anywhere in front-end code).
 */
window.__SKILLMAPPER_SUPABASE__ = {
  url: 'https://oqknepaevzhcmmmatame.supabase.co',
  anonKey: 'sb_publishable_ZwdxLA2twuvjkBug6JPxxA_zlWzaVN2',
  /** Return URL for email auth links opened from inbox (not OAuth). */
  authEmailBase: 'https://talentxray.talentsradar.com',
  /** Add these in Supabase → Auth → URL Configuration → Redirect URLs:
   *  http://localhost:3000/**  http://127.0.0.1:3000/**
   *  https://talentxray.talentsradar.com/**
   */
};
