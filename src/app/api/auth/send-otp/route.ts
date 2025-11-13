import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { supabaseAdmin } from '@/lib/supabase';
import { handleCors } from '@/lib/cors';
import { z } from 'zod';

const sendOTPSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format')
});

const verifyOTPSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  token: z.string().length(6, 'OTP must be 6 digits')
});

// POST /api/auth/send-otp
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const body = await request.json();
    const { phone } = sendOTPSchema.parse(body);

    // Send OTP via Supabase Auth
    const { data, error } = await supabaseAdmin.auth.signInWithOtp({
      phone,
      options: {
        channel: 'sms'
      }
    });

    if (error) {
      return apiError(error.message, 400, request);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 OTP sent to ${phone}`);
    }

    return apiResponse(
      {
        message: 'OTP sent successfully',
        phone,
        expiresIn: 300 // 5 minutes
      },
      200,
      request
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Send OTP error:', error);
    return apiError(error.message || 'Failed to send OTP', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}
