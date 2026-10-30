/**
 * Where the account button should point for the current session.
 * Signed-in members should never be sent back to the application form.
 */
export function accountLinkFor(session) {
  if (session?.profileMissing) return { to: '/membership', label: 'Complete application' };
  if (session?.role === 'staff') return { to: '/admin', label: 'Admin dashboard' };
  if (session?.role === 'member') return { to: '/portal', label: 'My portal' };
  return { to: '/login', label: 'Member login' };
}

/**
 * Label and destination for a membership call to action.
 * Anonymous visitors get the join flow; signed-in users get their workspace.
 */
export function joinTargetFor(session) {
  if (session?.profileMissing) return { to: '/membership', label: 'Complete application' };
  if (session?.role === 'staff') return { to: '/admin', label: 'Admin dashboard' };
  if (session?.role === 'member') return { to: '/portal', label: 'My portal' };
  return { to: '/membership', label: 'Join the union' };
}
