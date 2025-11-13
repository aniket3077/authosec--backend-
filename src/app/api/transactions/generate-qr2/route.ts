import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { ClerkService } from '@/lib/clerk';
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
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    const body = await request.json();
    const { transactionId } = generateQR2Schema.parse(body);

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        receiver: true,
        company: true,
      },
    });

    if (!transaction) {
      return apiError('Transaction not found', 404, request);
    }

    // Verify user is the receiver
    if (transaction.receiverId !== user.id) {
      return apiError('Unauthorized', 403, request);
    }

    // Verify status
    if (transaction.status !== 'QR1_SCANNED') {
      return apiError('Invalid transaction status', 400, request);
    }

    // Generate QR2
    const qr2Data = {
      transactionId: transaction.id,
      type: 'qr2' as const,
      amount: Number(transaction.amount),
      senderId: transaction.senderId,
      receiverId: transaction.receiverId,
      timestamp: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      nonce: nanoid(16),
    };

    const { qrCodeImage, encryptedData } = await QRService.generateQR(
      qr2Data,
      transaction.encryptionKey!,
      transaction.iv!
    );

    // Update transaction with QR2
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        qr2Code: qrCodeImage,
        qr2EncryptedData: encryptedData,
        qr2GeneratedAt: new Date(),
        qr2ExpiresAt: new Date(qr2Data.expiresAt),
        status: 'QR2_GENERATED',
      },
    });

    // Log the action
    await prisma.transactionLog.create({
      data: {
        transactionId: transaction.id,
        action: 'QR2_GENERATED',
        status: 'QR2_GENERATED',
        metadata: { generatedBy: user.id },
      },
    });

    // Notify sender
    await prisma.notification.create({
      data: {
        userId: transaction.senderId,
        companyId: transaction.companyId,
        title: 'QR2 Generated',
        message: 'Scan the QR2 code to continue',
        type: 'transaction',
        priority: 'high',
        actionUrl: `/transactions/${transaction.id}`,
      },
    });

    return apiResponse(
      {
        transaction: {
          id: transaction.id,
          transactionNumber: transaction.transactionNumber,
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
  return handleCors(request);
}
