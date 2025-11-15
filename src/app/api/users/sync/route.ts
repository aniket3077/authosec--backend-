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

    // Validate email format if provided
    const userEmail = decodedToken.email;
    if (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return apiError('Invalid email format', 400, request);
    }

    // Validate phone number format if provided (E.164 format)
    if (phone && phone.trim()) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone.trim())) {
        return apiError('Invalid phone number format. Please use E.164 format (e.g., +919876543210)', 400, request);
      }
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { firebase_uid: decodedToken.uid },
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
          ...(firstName && { first_name: firstName.trim() }),
          ...(lastName && { last_name: lastName.trim() }),
          ...(phone && { phone: phone.trim() }),
          updated_at: new Date(),
        },
      });

      // Transform to camelCase
      const userResponse = {
        id: updatedUser.id,
        firebaseUid: updatedUser.firebase_uid,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        role: updatedUser.role,
        companyId: updatedUser.company_id,
        isActive: updatedUser.is_active,
        lastLogin: updatedUser.last_login,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      };

      return apiResponse(
        {
          user: userResponse,
          message: 'User synced successfully',
          isNew: false,
        },
        200,
        request
      );
    }

    // Determine user role based on email and company registration
    let userRole: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'ACCOUNT_USER' = 'ACCOUNT_USER';
    let companyId: string | null = null;

    // Check if this is a super admin
    if (userEmail && isAdminEmail(userEmail)) {
      userRole = 'SUPER_ADMIN';
    }
    // Check if this is a company registration
    else if (companyName && businessType && registrationId) {
      // Validate company fields
      if (!companyName.trim() || !businessType.trim() || !registrationId.trim()) {
        return apiError('Company name, business type, and registration ID are required', 400, request);
      }

      // Create company first
      const company = await prisma.companies.create({
        data: {
          id: uuidv4(),
          name: companyName.trim(),
          email: userEmail || '',
          phone: phone?.trim() || '',
          business_type: businessType.trim(),
          registration_id: registrationId.trim(),
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
        first_name: firstName?.trim() || null,
        last_name: lastName?.trim() || null,
        phone: phone?.trim() || null,
        role: userRole,
        company_id: companyId, // Link to company if created
        is_active: true,
        last_login: new Date(),
        updated_at: new Date(),
      },
    });

    // Transform to camelCase
    const userResponse = {
      id: newUser.id,
      firebaseUid: newUser.firebase_uid,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      phone: newUser.phone,
      role: newUser.role,
      companyId: newUser.company_id,
      isActive: newUser.is_active,
      lastLogin: newUser.last_login,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at,
    };

    return apiResponse(
      {
        user: userResponse,
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
