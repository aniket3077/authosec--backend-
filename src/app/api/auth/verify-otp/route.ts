import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { supabaseAdmin } from '@/lib/supabase';
import { handleCors } from '@/lib/cors';
import { z } from 'zod';

const verifyOTPSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  token: z.string().length(6, 'OTP must be 6 digits')
});

// POST /api/auth/verify-otp
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const body = await request.json();
    const { phone, token } = verifyOTPSchema.parse(body);

    // Verify OTP via Supabase Auth
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      phone,
      token,
      type: 'sms'
    });

    if (error) {
      return apiError(error.message, 400, request);
    }

    if (!data.user) {
      return apiError('Invalid OTP', 400, request);
    }

    // Check if user profile exists
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // If no profile, create one
    if (!profile) {
      await supabaseAdmin.from('user_profiles').insert({
        id: data.user.id,
        phone_number: phone,
        role: 'account_user',
        is_active: true
      });
    }

    return apiResponse(
      {
        user: {
          id: data.user.id,
          phone: data.user.phone,
          role: profile?.role || 'account_user',
          companyId: profile?.company_id
        },
        session: data.session,
        accessToken: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        expiresAt: data.session?.expires_at
      },
      200,
      request
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Verify OTP error:', error);
    return apiError(error.message || 'Failed to verify OTP', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}
