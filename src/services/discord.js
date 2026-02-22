const DISCORD_API = 'https://discord.com/api';

export function makeAuthUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email guilds',
    state
  });
  return `${DISCORD_API}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken({ clientId, clientSecret, redirectUri, code }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  const r = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Discord token exchange failed: ${r.status} ${txt}`);
  }
  return r.json();
}

export async function fetchDiscordUser(accessToken) {
  const r = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) throw new Error(`Discord /users/@me failed: ${r.status}`);
  return r.json();
}

export async function fetchDiscordGuilds(accessToken) {
  const r = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) throw new Error(`Discord /users/@me/guilds failed: ${r.status}`);
  return r.json();
}

export function canManageGuild(guild) {
  // permissions is string per docs. Admin = 0x8, Manage Guild = 0x20.
  // Use BigInt for safety.
  const perms = BigInt(guild.permissions ?? '0');
  const ADMIN = 0x8n;
  const MANAGE_GUILD = 0x20n;
  return (perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD;
}

export function avatarUrl(user) {
  if (!user?.id || !user?.avatar) return '';
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}
