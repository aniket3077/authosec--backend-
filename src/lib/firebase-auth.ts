import { auth } from './firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

/**
 * Firebase Authentication Service
 * Handles Firebase authentication and user synchronization with database
 */

export interface FirebaseUserData {
  firebaseUid: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

/**
 * Sync Firebase user with database
 * Creates or updates user in our database
 */
export async function syncUserWithDatabase(firebaseUser: FirebaseUserData) {
  const existingUser = await prisma.user.findUnique({
    where: { firebaseUid: firebaseUser.firebaseUid },
  });

  if (existingUser) {
    // Update existing user
    return await prisma.user.update({
      where: { firebaseUid: firebaseUser.firebaseUid },
      data: {
        email: firebaseUser.email,
        phone: firebaseUser.phone,
        firstName: firebaseUser.firstName,
        lastName: firebaseUser.lastName,
        imageUrl: firebaseUser.imageUrl,
        lastLogin: new Date(),
      },
    });
  } else {
    // Create new user
    return await prisma.user.create({
      data: {
        firebaseUid: firebaseUser.firebaseUid,
        email: firebaseUser.email,
        phone: firebaseUser.phone,
        firstName: firebaseUser.firstName,
        lastName: firebaseUser.lastName,
        imageUrl: firebaseUser.imageUrl,
        role: UserRole.ACCOUNT_USER,
        lastLogin: new Date(),
      },
    });
  }
}

/**
 * Get user from database by Firebase UID
 */
export async function getUserByFirebaseUid(firebaseUid: string) {
  return await prisma.user.findUnique({
    where: { firebaseUid },
    include: {
      company: true,
    },
  });
}

/**
 * Get user from database by ID
 */
export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      company: true,
    },
  });
}

/**
 * Check if user has specific role
 */
export async function userHasRole(firebaseUid: string, role: UserRole) {
  const user = await getUserByFirebaseUid(firebaseUid);
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(firebaseUid: string) {
  return await userHasRole(firebaseUid, UserRole.SUPER_ADMIN);
}

/**
 * Check if user is company admin
 */
export async function isCompanyAdmin(firebaseUid: string) {
  const user = await getUserByFirebaseUid(firebaseUid);
  if (!user) return false;
  return user.role === UserRole.COMPANY_ADMIN || user.role === UserRole.SUPER_ADMIN;
}

/**
 * Get user's company
 */
export async function getUserCompany(firebaseUid: string) {
  const user = await getUserByFirebaseUid(firebaseUid);
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

/**
 * Verify Firebase ID token from request headers
 */
export async function verifyFirebaseToken(token: string): Promise<DecodedIdToken> {
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Get user from Firebase Auth
 */
export async function getFirebaseUser(uid: string) {
  try {
    const user = await auth.getUser(uid);
    return user;
  } catch (error) {
    console.error('Failed to get Firebase user:', error);
    throw new Error('User not found');
  }
}

/**
 * Create custom token for user
 */
export async function createCustomToken(uid: string, claims?: object) {
  try {
    const customToken = await auth.createCustomToken(uid, claims);
    return customToken;
  } catch (error) {
    console.error('Failed to create custom token:', error);
    throw new Error('Token creation failed');
  }
}

/**
 * Delete Firebase user
 */
export async function deleteFirebaseUser(uid: string) {
  try {
    await auth.deleteUser(uid);
  } catch (error) {
    console.error('Failed to delete Firebase user:', error);
    throw new Error('User deletion failed');
  }
}

/**
 * Update Firebase user
 */
export async function updateFirebaseUser(uid: string, data: {
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  disabled?: boolean;
}) {
  try {
    const updatedUser = await auth.updateUser(uid, data);
    return updatedUser;
  } catch (error) {
    console.error('Failed to update Firebase user:', error);
    throw new Error('User update failed');
  }
}
