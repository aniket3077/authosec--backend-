// This file is deprecated - use firebase-auth.ts instead
// Keeping as stub to prevent import errors during migration
import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

/**
 * DEPRECATED: Use firebase-auth.ts instead
 * This file is kept for backward compatibility during migration
 */

export interface ClerkUserData {
  clerkId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

/**
 * Get the authenticated user from Clerk
 */
export async function getAuthUser() {
  const user = await currentUser();
  if (!user) return null;

  return {
    clerkId: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    phone: user.phoneNumbers[0]?.phoneNumber,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
  };
}

/**
 * Get authenticated user's ID
 */
export async function getAuthUserId() {
  const { userId } = await auth();
  return userId;
}

/**
 * Sync Clerk user with database
 * Creates or updates user in our database
 */
export async function syncUserWithDatabase(clerkUser: ClerkUserData) {
  const existingUser = await prisma.user.findUnique({
    where: { clerkId: clerkUser.clerkId },
  });

  if (existingUser) {
    // Update existing user
    return await prisma.user.update({
      where: { clerkId: clerkUser.clerkId },
      data: {
        email: clerkUser.email,
        phone: clerkUser.phone,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        lastLogin: new Date(),
      },
    });
  } else {
    // Create new user
    return await prisma.user.create({
      data: {
        clerkId: clerkUser.clerkId,
        email: clerkUser.email,
        phone: clerkUser.phone,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        role: UserRole.ACCOUNT_USER,
        lastLogin: new Date(),
      },
    });
  }
}

/**
 * Get user from database by Clerk ID
 */
export async function getUserByClerkId(clerkId: string) {
  return await prisma.user.findUnique({
    where: { clerkId },
    include: {
      company: true,
    },
  });
}

/**
 * Get current authenticated user from database
 */
export async function getCurrentUser() {
  const clerkUser = await getAuthUser();
  if (!clerkUser) return null;

  // Sync with database
  const dbUser = await syncUserWithDatabase(clerkUser);
  return dbUser;
}

/**
 * Check if user has specific role
 */
export async function hasRole(role: UserRole) {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin() {
  return await hasRole(UserRole.SUPER_ADMIN);
}

/**
 * Check if user is company admin
 */
export async function isCompanyAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.role === UserRole.COMPANY_ADMIN || user.role === UserRole.SUPER_ADMIN;
}

/**
 * Get user's company
 */
export async function getUserCompany() {
  const user = await getCurrentUser();
  if (!user || !user.companyId) return null;

  return await prisma.company.findUnique({
    where: { id: user.companyId },
  });
}

/**
 * Assign role to user
 */
export async function assignRole(userId: string, role: UserRole) {
  return await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
}

/**
 * Assign user to company
 */
export async function assignUserToCompany(userId: string, companyId: string) {
  return await prisma.user.update({
    where: { id: userId },
    data: { companyId },
  });
}

export const ClerkService = {
  getAuthUser,
  getAuthUserId,
  syncUserWithDatabase,
  getUserByClerkId,
  getCurrentUser,
  hasRole,
  isSuperAdmin,
  isCompanyAdmin,
  getUserCompany,
  assignRole,
  assignUserToCompany,
};
