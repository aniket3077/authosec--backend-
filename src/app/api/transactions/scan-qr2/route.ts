import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { QRService } from '@/lib/qr';

const scanQR2Schema = z.object({
  qrCode: z.string(),
});

// POST /api/transactions/scan-qr2
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
    const user = await getUserByFirebaseUid(decodedToken.uid);

    if (!user) {
      return apiError('User not found', 404, request);
    }

    const body = await request.json();
    const { qrCode } = scanQR2Schema.parse(body);

    // Find transaction by encrypted QR2 data
    const transaction = await prisma.transactions.findFirst({
      where: {
        qr2_encrypted_data: qrCode,
        status: 'QR2_GENERATED',
      },
      include: {
        users_transactions_receiver_idTousers: true,
        companies: true,
      },
    });

    if (!transaction) {
      return apiError('Invalid or expired QR code', 404, request);
    }

    // Verify user is the sender
    if (transaction.sender_id !== user.id) {
      return apiError('Unauthorized to scan this QR code', 403, request);
    }

    // Decrypt and validate QR2
    const qrData = await QRService.validateQR(
      qrCode,
      transaction.encryption_key!,
      transaction.iv!
    );

    if (QRService.isExpired(qrData)) {
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });
      return apiError('QR code has expired', 400, request);
    }

    // Update transaction status
    await prisma.transactions.update({
      where: { id: transaction.id },
      data: { status: 'QR2_SCANNED' },
    });

    // Log the action
    await prisma.transaction_logs.create({
      data: {
        transaction_id: transaction.id,
        action: 'QR2_SCANNED',
        status: 'QR2_SCANNED',
        metadata: { scannedBy: user.id },
      },
    });

    return apiResponse(
      {
        transaction: {
          id: transaction.id,
          transactionNumber: transaction.transaction_number,
          amount: transaction.amount,
          currency: transaction.currency,
          status: 'QR2_SCANNED',
        },
        message: 'QR2 validated. Ready for OTP verification.',
      },
      200,
      request
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Scan QR2 error:', error);
    return apiError(error.message || 'Failed to scan QR2', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}
