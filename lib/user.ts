import type { User } from '@supabase/supabase-js';

function getEmailPrefix(email: string | null | undefined) {
  if (!email) return null;
  const [prefix] = email.split('@');
  return prefix?.trim() || null;
}

export function getUserDisplayName(user: User | null | undefined, fallback = 'User') {
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const username =
    typeof meta?.username === 'string'
      ? meta.username.trim()
      : '';
  const fullName =
    typeof meta?.full_name === 'string'
      ? meta.full_name.trim()
      : typeof meta?.name === 'string'
        ? meta.name.trim()
        : '';
  const emailPrefix = getEmailPrefix(user?.email);

  return username || fullName || emailPrefix || fallback;
}
