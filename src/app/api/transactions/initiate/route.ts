import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { QRService } from '@/lib/qr';
import { EncryptionService } from '@/lib/encryption';
import { nanoid } from 'nanoid';

const initiateSchema = z.object({
  receiverPhone: z.string().regex(/^\+[1-9]\d{1,14}$/),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  description: z.string().optional()
});

// POST /api/transactions/initiate
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    const body = await request.json();
    const { receiverPhone, amount, currency, description } = initiateSchema.parse(body);

    // Find receiver by phone
    const receiver = await prisma.user.findUnique({
      where: { phone: receiverPhone },
      select: { id: true, companyId: true },
    });

    if (!receiver) {
      return apiError('Receiver not found', 404, request);
    }

    // Generate encryption key and IV
    const encryptionKey = EncryptionService.generateKey();
    const iv = EncryptionService.generateIV();
    const transactionNumber = `TXN${nanoid(10).toUpperCase()}`;

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        transactionNumber,
        senderId: user.id,
        companyId: user.companyId,
        receiverId: receiver.id,
        amount,
        currency,
        description,
        status: 'INITIATED',
        encryptionKey: encryptionKey.substring(0, 16),
        iv,
        otpAttempts: 0,
      },
    });

    // Generate QR1
    const qr1Data = {
      transactionId: transaction.id,
      type: 'qr1' as const,
      amount: Number(amount),
      senderId: user.id,
      receiverId: receiver.id,
      timestamp: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
      nonce: nanoid(16),
    };

    const { qrCodeImage, encryptedData } = await QRService.generateQR(
      qr1Data,
      encryptionKey,
      iv
    );

    // Update transaction with QR1
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        qr1Code: qrCodeImage,
        qr1EncryptedData: encryptedData,
        qr1GeneratedAt: new Date(),
        qr1ExpiresAt: new Date(qr1Data.expiresAt),
      },
    });

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: receiver.id,
        companyId: receiver.companyId,
        title: 'New Transaction Request',
        message: `You have a new transaction request for ${currency} ${amount}`,
        type: 'TRANSACTION',
        priority: 'HIGH',
        actionUrl: `/transactions/${transaction.id}`,
      },
    });

    return apiResponse(
      {
        transaction: {
          id: transaction.id,
          transactionNumber: transactionNumber,
          amount,
          currency,
          status: 'INITIATED',
          qr1: {
            image: qrCodeImage,
            expiresAt: new Date(qr1Data.expiresAt).toISOString(),
          },
        },
        message: 'Transaction initiated. Show QR code to receiver.',
      },
      201,
      request
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Transaction initiation error:', error);
    return apiError(error.message || 'Failed to initiate transaction', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}
