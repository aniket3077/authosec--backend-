import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { z } from 'zod';
import { auth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

const verifyOTPSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  otp: z.string().length(6, 'OTP must be 6 digits')
});

// Import otpStore from send-otp route
// In production, use Redis or similar distributed cache
const otpStore = new Map<string, { otp: string; expires: number }>();

// POST /api/auth/verify-otp
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const body = await request.json();
    const { phoneNumber, otp } = verifyOTPSchema.parse(body);

    // Get stored OTP
    const storedOTP = otpStore.get(phoneNumber);

    if (!storedOTP) {
      return apiError('OTP not found or expired. Please request a new OTP.', 400, request);
    }

    // Check if OTP expired
    if (Date.now() > storedOTP.expires) {
      otpStore.delete(phoneNumber);
      return apiError('OTP expired. Please request a new OTP.', 400, request);
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      return apiError('Invalid OTP. Please try again.', 400, request);
    }

    // OTP is valid, delete it
    otpStore.delete(phoneNumber);

    // Find user by phone number
    const user = await prisma.users.findFirst({
      where: { phone: phoneNumber },
      select: {
        id: true,
        firebase_uid: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: true,
        company_id: true,
      },
    });

    if (!user) {
      return apiError('User not found', 404, request);
    }

    // Create custom Firebase token for the user
    let customToken: string;
    
    if (user.firebase_uid) {
      // User has Firebase UID, create token with it
      customToken = await auth.createCustomToken(user.firebase_uid, {
        phone: phoneNumber,
        role: user.role,
      });
    } else {
      // User doesn't have Firebase UID yet, create one
      // Use phone number as UID (or create Firebase user)
      const firebaseUID = `phone_${phoneNumber.replace(/\+/g, '')}`;
      customToken = await auth.createCustomToken(firebaseUID, {
        phone: phoneNumber,
        role: user.role,
      });

      // Update user with Firebase UID
      await prisma.users.update({
        where: { id: user.id },
        data: { firebase_uid: firebaseUID },
      });
    }

    return apiResponse({
      success: true,
      token: customToken,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        phone: user.phone,
        role: user.role,
        companyId: user.company_id,
      },
    }, request);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Verify OTP error:', error);
    return apiError(error.message || 'Failed to process OTP verification', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); 
  return corsResponse || new NextResponse(null, { status: 204 });
}
