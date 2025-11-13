import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { isAdminEmail } from '@/lib/admin';

/**
 * POST /api/users/sync
 * Syncs Firebase user to PostgreSQL database
 * Called after user registration to create database record
 */
export async function POST(request: NextRequest) {
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

    // Extract user data from token and request body
    const body = await request.json();
    const { firstName, lastName, phone } = body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (existingUser) {
      // User already exists, update lastLogin and role if admin
      const userEmail = decodedToken.email || existingUser.email;
      const shouldBeAdmin = userEmail && isAdminEmail(userEmail);
      
      const updatedUser = await prisma.user.update({
        where: { firebaseUid: decodedToken.uid },
        data: { 
          lastLogin: new Date(),
          // Update role to SUPER_ADMIN if email is in admin list
          ...(shouldBeAdmin && existingUser.role !== 'SUPER_ADMIN' && { role: 'SUPER_ADMIN' }),
          // Update other fields if provided
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone && { phone }),
        },
      });

      return apiResponse(
        {
          user: updatedUser,
          message: 'User synced successfully',
          isNew: false,
        },
        200,
        request
      );
    }

    // Determine user role based on email
    const userEmail = decodedToken.email;
    const userRole = userEmail && isAdminEmail(userEmail) ? 'SUPER_ADMIN' : 'ACCOUNT_USER';

    // Create new user in database
    const newUser = await prisma.user.create({
      data: {
        firebaseUid: decodedToken.uid,
        email: userEmail || null,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        role: userRole,
        isActive: true,
        lastLogin: new Date(),
      },
    });

    return apiResponse(
      {
        user: newUser,
        message: 'User created successfully',
        isNew: true,
      },
      201,
      request
    );
  } catch (error: any) {
    console.error('User sync error:', error);
    return apiError(error.message || 'Failed to sync user', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}
