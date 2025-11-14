import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { isAdminEmail } from '@/lib/admin';
import { v4 as uuidv4 } from 'uuid';

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
    const { firstName, lastName, phone, companyName, businessType, registrationId } = body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (existingUser) {
      // User already exists, update lastLogin and role if admin
      const userEmail = decodedToken.email || existingUser.email;
      const shouldBeAdmin = userEmail && isAdminEmail(userEmail);
      
      const updatedUser = await prisma.users.update({
        where: { firebase_uid: decodedToken.uid },
        data: { 
          last_login: new Date(),
          // Update role to SUPER_ADMIN if email is in admin list
          ...(shouldBeAdmin && existingUser.role !== 'SUPER_ADMIN' && { role: 'SUPER_ADMIN' }),
          // Update other fields if provided
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
          ...(phone && { phone }),
          updated_at: new Date(),
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

    // Determine user role based on email and company registration
    const userEmail = decodedToken.email;
    let userRole: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'ACCOUNT_USER' = 'ACCOUNT_USER';
    let companyId: string | null = null;

    // Check if this is a super admin
    if (userEmail && isAdminEmail(userEmail)) {
      userRole = 'SUPER_ADMIN';
    }
    // Check if this is a company registration
    else if (companyName && businessType && registrationId) {
      // Create company first
      const company = await prisma.companies.create({
        data: {
          id: uuidv4(),
          name: companyName,
          email: userEmail || '',
          phone: phone || '',
          business_type: businessType,
          registration_id: registrationId,
          subscription_tier: 'FREE', // Default to FREE tier
          is_active: true,
          updated_at: new Date(),
        },
      });
      
      companyId = company.id;
      userRole = 'COMPANY_ADMIN'; // Company registrant becomes company owner
    }

    // Create new user in database
    const newUser = await prisma.users.create({
      data: {
        id: uuidv4(),
        firebase_uid: decodedToken.uid,
        email: userEmail || null,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        role: userRole,
        company_id: companyId, // Link to company if created
        is_active: true,
        last_login: new Date(),
        updated_at: new Date(),
      },
    });

    return apiResponse(
      {
        user: newUser,
        message: companyId ? 'Company and user created successfully' : 'User created successfully',
        isNew: true,
        companyCreated: !!companyId,
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
