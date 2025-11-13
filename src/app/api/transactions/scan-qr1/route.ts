import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { QRService } from '@/lib/qr';
import { EncryptionService } from '@/lib/encryption';

const scanQR1Schema = z.object({
  qrCode: z.string(),
});

// POST /api/transactions/scan-qr1
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    const body = await request.json();
    const { qrCode } = scanQR1Schema.parse(body);

    // Find transaction by encrypted QR1 data
    const transaction = await prisma.transaction.findFirst({
      where: {
        qr1EncryptedData: qrCode,
        status: 'QR1_SCANNED',
      },
      include: {
        sender: true,
        company: true,
      },
    });

    if (!transaction) {
      return apiError('Invalid or expired QR code', 404, request);
    }

    // Verify user is the receiver
    if (transaction.receiverId !== user.id) {
      return apiError('Unauthorized to scan this QR code', 403, request);
    }

    // Decrypt and validate QR1
    const qrData = await QRService.validateQR(
      qrCode,
      transaction.encryptionKey!,
      transaction.iv!
    );

    if (QRService.isExpired(qrData)) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });
      return apiError('QR code has expired', 400, request);
    }

    // Update transaction status
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'QR1_SCANNED' },
    });

    // Log the action
    await prisma.transactionLog.create({
      data: {
        transactionId: transaction.id,
        action: 'QR1_SCANNED',
        status: 'QR1_SCANNED',
        metadata: { scannedBy: user.id },
      },
    });

    // Notify sender
    await prisma.notification.create({
      data: {
        userId: transaction.senderId,
        companyId: transaction.companyId,
        title: 'QR Code Scanned',
        message: `${user.firstName || 'Receiver'} has scanned your QR code`,
        type: 'TRANSACTION',
        priority: 'NORMAL',
        actionUrl: `/transactions/${transaction.id}`,
      },
    });

    return apiResponse(
      {
        transaction: {
          id: transaction.id,
          transactionNumber: transaction.transactionNumber,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          sender: {
            name: `${transaction.sender.firstName} ${transaction.sender.lastName}`,
            company: transaction.company?.name,
          },
          status: 'QR1_SCANNED',
        },
        message: 'QR code validated. Ready to generate QR2.',
      },
      200,
      request
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Scan QR1 error:', error);
    return apiError(error.message || 'Failed to scan QR code', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}
