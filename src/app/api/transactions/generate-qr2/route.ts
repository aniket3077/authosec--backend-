import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { QRService } from '@/lib/qr';
import { nanoid } from 'nanoid';

const generateQR2Schema = z.object({
  transactionId: z.string().uuid(),
});

// POST /api/transactions/generate-qr2
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
    const { transactionId } = generateQR2Schema.parse(body);

    const transaction = await prisma.transactions.findUnique({
      where: { id: transactionId },
      include: {
        users_transactions_receiver_idTousers: true,
        companies: true,
      },
    });

    if (!transaction) {
      return apiError('Transaction not found', 404, request);
    }

    // Verify user is the receiver
    if (transaction.receiver_id !== user.id) {
      return apiError('Unauthorized', 403, request);
    }

    // Verify status
    if (transaction.status !== 'QR1_SCANNED') {
      return apiError('Invalid transaction status', 400, request);
    }

    // VALIDATION: Ensure QR1 was generated before allowing QR2 generation
    if (!transaction.qr1_generated_at) {
      return apiError('QR1 must be generated before QR2', 400, request);
    }

    // Generate QR2
    const qr2Data = {
      transactionId: transaction.id,
      type: 'qr2' as const,
      amount: Number(transaction.amount),
      senderId: transaction.sender_id,
      receiverId: transaction.receiver_id,
      timestamp: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      nonce: nanoid(16),
    };

    const { qrCodeImage, encryptedData } = await QRService.generateQR(
      qr2Data,
      transaction.encryption_key!,
      transaction.iv!
    );

    // Update transaction with QR2
    await prisma.transactions.update({
      where: { id: transaction.id },
      data: {
        qr2_code: qrCodeImage,
        qr2_encrypted_data: encryptedData,
        qr2_generated_at: new Date(),
        qr2_expires_at: new Date(qr2Data.expiresAt),
        status: 'QR2_GENERATED',
      },
    });

    // Log the action
    await prisma.transaction_logs.create({
      data: {
        transaction_id: transaction.id,
        action: 'QR2_GENERATED',
        status: 'QR2_GENERATED',
        metadata: { generatedBy: user.id },
      },
    });

    // Notify sender
    await prisma.notifications.create({
      data: {
        user_id: transaction.sender_id,
        company_id: transaction.company_id,
        title: 'QR2 Generated',
        message: 'Scan the QR2 code to continue',
        type: 'TRANSACTION',
        priority: 'HIGH',
        action_url: `/transactions/${transaction.id}`,
      },
    });

    return apiResponse(
      {
        transaction: {
          id: transaction.id,
          transactionNumber: transaction.transaction_number,
          qr2: {
            image: qrCodeImage,
            expiresAt: new Date(qr2Data.expiresAt).toISOString(),
          },
          status: 'QR2_GENERATED',
        },
        message: 'QR2 generated successfully. Show to sender.',
      },
      200,
      request
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Generate QR2 error:', error);
    return apiError(error.message || 'Failed to generate QR2', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}
