import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/firebase-admin';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ACCOUNT_USER']).default('ACCOUNT_USER'),
});

/**
 * POST /api/company/users
 * Create a new accountant user (Company Admin only)
 */
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    // Get the requesting user
    const requestingUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { company: true },
    });

    if (!requestingUser) {
      return apiError('User not found', 404, request);
    }

    // Check if user is COMPANY_ADMIN
    if (requestingUser.role !== 'COMPANY_ADMIN') {
      return apiError('Forbidden - Only company admins can create users', 403, request);
    }

    if (!requestingUser.companyId) {
      return apiError('User is not associated with a company', 400, request);
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        'Validation failed',
        400,
        request,
        validation.error.errors
      );
    }

    const { email, firstName, lastName, phone, password, role } = validation.data;

    // Check if user with email already exists in Firebase
    let firebaseUser;
    try {
      firebaseUser = await auth.getUserByEmail(email);
      return apiError('User with this email already exists', 409, request);
    } catch (error: any) {
      // User doesn't exist, create new one
      if (error.code === 'auth/user-not-found') {
        // Create user in Firebase
        firebaseUser = await auth.createUser({
          email,
          password,
          displayName: `${firstName} ${lastName}`,
          phoneNumber: phone.startsWith('+') ? phone : `+91${phone}`,
        });
      } else {
        throw error;
      }
    }

    // Check if phone already exists in database
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      // Delete the Firebase user we just created
      await auth.deleteUser(firebaseUser.uid);
      return apiError('User with this phone number already exists', 409, request);
    }

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        firebaseUid: firebaseUser.uid,
        email,
        firstName,
        lastName,
        phone,
        role,
        companyId: requestingUser.companyId,
        isActive: true,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: requestingUser.id,
        companyId: requestingUser.companyId,
        action: 'CREATE_USER',
        resource: 'User',
        resourceId: newUser.id,
        newValues: {
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phone: newUser.phone,
          role: newUser.role,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Create notification for the new user
    await prisma.notification.create({
      data: {
        userId: newUser.id,
        companyId: requestingUser.companyId,
        title: 'Welcome to AuthoSec',
        message: `Your account has been created by ${requestingUser.firstName} ${requestingUser.lastName}. Please check your email for login credentials.`,
        type: 'SYSTEM',
        priority: 'HIGH',
      },
    });

    return apiResponse(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phone: newUser.phone,
          role: newUser.role,
          companyId: newUser.companyId,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
      },
      201,
      request
    );
  } catch (error: any) {
    console.error('Create user error:', error);
    return apiError(
      error.message || 'Failed to create user',
      500,
      request
    );
  }
}

/**
 * GET /api/company/users
 * Get all users in the company (Company Admin only)
 */
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    // Get the requesting user
    const requestingUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!requestingUser) {
      return apiError('User not found', 404, request);
    }

    // Check if user is COMPANY_ADMIN
    if (requestingUser.role !== 'COMPANY_ADMIN') {
      return apiError('Forbidden - Only company admins can view users', 403, request);
    }

    if (!requestingUser.companyId) {
      return apiError('User is not associated with a company', 400, request);
    }

    // Get all users in the company
    const users = await prisma.user.findMany({
      where: {
        companyId: requestingUser.companyId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return apiResponse(
      {
        users,
        total: users.length,
      },
      200,
      request
    );
  } catch (error: any) {
    console.error('Get users error:', error);
    return apiError(
      error.message || 'Failed to retrieve users',
      500,
      request
    );
  }
}

/**
 * OPTIONS /api/company/users
 */
export async function OPTIONS(request: NextRequest) {
  return handleCors(request) || new Response(null, { status: 200 });
}
