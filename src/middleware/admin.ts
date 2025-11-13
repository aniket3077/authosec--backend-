import { NextRequest } from 'next/server';
import { apiError } from '@/lib/response';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { hasAdminAccess } from '@/lib/admin';

/**
 * Middleware to verify admin access
 * Returns user if they have admin access, otherwise returns error response
 */
export async function verifyAdminAccess(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        error: apiError('Unauthorized - No token provided', 401, request),
        user: null,
      };
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { company: true },
    });

    if (!user) {
      return {
        error: apiError('User not found', 404, request),
        user: null,
      };
    }

    // Check if user has admin access (via role or email)
    const email = user.email || decodedToken.email || '';
    if (!hasAdminAccess(email, user.role)) {
      return {
        error: apiError('Forbidden - Admin access required', 403, request),
        user: null,
      };
    }

    return {
      error: null,
      user,
    };
  } catch (error: any) {
    return {
      error: apiError(error.message || 'Authentication failed', 500, request),
      user: null,
    };
  }
}
