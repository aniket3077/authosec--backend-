import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';

// GET /api/users/profile
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    // Get Firebase token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    const profile = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        company: true,
        _count: {
          select: {
            sentTransactions: true,
            receivedTransactions: true,
            notifications: true,
          },
        },
      },
    });

    if (!profile) {
      return apiError('User not found in database. Please sync your account.', 404, request);
    }

    return apiResponse({ profile }, 200, request);
  } catch (error: any) {
    console.error('Get profile error:', error);
    return apiError(error.message || 'Failed to fetch profile', 500, request);
  }
}

// PUT /api/users/profile
export async function PUT(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    // Get Firebase token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    const updatedUser = await prisma.user.update({
      where: { firebaseUid: decodedToken.uid },
      data: {
        firstName,
        lastName,
        phone,
      },
    });

    return apiResponse(
      {
        user: updatedUser,
        message: 'Profile updated successfully',
      },
      200,
      request
    );
  } catch (error: any) {
    console.error('Update profile error:', error);
    return apiError(error.message || 'Failed to update profile', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}
