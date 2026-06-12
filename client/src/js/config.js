/**
 * Supabase settings. The project URL and anon/publishable key are not confidential
 * in client-side apps; they appear in every request. Access control is enforced in
 * Supabase with Row Level Security (RLS) and table policies — not by hiding this file.
 * Never put the service_role key here (or anywhere in front-end code).
 */
export const SUPABASE_URL = 'https://oqknepaevzhcmmmatame.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_ZwdxLA2twuvjkBug6JPxxA_zlWzaVN2';
/** Return URL for email auth links opened from inbox (not OAuth).
 *  Add these in Supabase → Auth → URL Configuration → Redirect URLs:
 *  http://localhost:3000/**  http://127.0.0.1:3000/**  http://localhost:5173/**
 *  https://talentxray.talentsradar.com/**
 */
export const AUTH_EMAIL_BASE = 'https://talentxray.talentsradar.com';
