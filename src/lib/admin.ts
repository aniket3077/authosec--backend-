/**
 * Check if an email address has admin access
 */
export function isAdminEmail(email: string): boolean {
  const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
  
  if (!adminEmailsEnv) {
    return false;
  }

  const adminEmails = adminEmailsEnv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);

  return adminEmails.includes(email.toLowerCase());
}

/**
 * Get all admin emails
 */
export function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
  
  return adminEmailsEnv
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0);
}

/**
 * Check if user has admin privileges
 * Checks both email and role
 */
export function hasAdminAccess(email: string, role: string): boolean {
  return role === 'SUPER_ADMIN' || isAdminEmail(email);
}
