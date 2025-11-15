import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendOTPSMS } from '@/lib/sms';

const sendOTPSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format')
});

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map<string, { otp: string; expires: number }>();

/**
 * Generate random 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/send-otp
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const body = await request.json();
    const { phoneNumber } = sendOTPSchema.parse(body);

    // Check if user exists with this phone number
    const user = await prisma.users.findFirst({
      where: { phone: phoneNumber },
    });

    if (!user) {
      return apiError('No account found with this phone number', 404, request);
    }

    // Generate OTP
    const otp = generateOTP();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP (in production, use Redis with TTL)
    otpStore.set(phoneNumber, { otp, expires });

    // Send OTP via AWS SNS SMS
    const smsSent = await sendOTPSMS(phoneNumber, otp);

    // In development, log the OTP
    console.log(`📱 OTP for ${phoneNumber}: ${otp}`);
    if (smsSent) {
      console.log(`✅ SMS sent successfully via AWS SNS`);
    } else {
      console.warn(`⚠️ SMS failed to send, but OTP is stored for testing`);
    }

    return apiResponse({
      success: true,
      message: smsSent ? 'OTP sent to your phone via SMS' : 'OTP generated (SMS unavailable)',
      // In development, include OTP (remove in production!)
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    }, request);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Send OTP error:', error);
    return apiError(error.message || 'Failed to process OTP request', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); 
  return corsResponse || new NextResponse(null, { status: 204 });
}

// Export otpStore for use in verify-otp route
export { otpStore };
