import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
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
    verifyOTPSchema.parse(body);

    return apiError(
      'OTP verification is handled by Clerk. Use the Clerk SDK to complete the verification flow and obtain session tokens.',
      501,
      request
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Verify OTP error:', error);
    return apiError(error.message || 'Failed to process OTP verification', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}
