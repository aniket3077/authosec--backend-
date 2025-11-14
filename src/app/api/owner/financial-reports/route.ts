import { NextRequest, NextResponse } from 'next/server';
import { handleCors } from '@/lib/cors';
import { apiResponse, apiError } from '@/lib/response';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import prisma from '@/lib/prisma';

// GET /api/owner/financial-reports
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.slice(7).trim();
    await verifyFirebaseToken(token);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get transactions for the period
    const transactions = await prisma.transactions.aggregate({
      where: {
        created_at: {
          gte: startDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const revenue = Number(transactions._sum?.amount) || 0;
    const expenses = revenue * 0.656; // 65.6% mock expenses
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const taxAmount = profit * 0.18; // 18% GST

    const financialData = {
      revenue,
      expenses,
      profit,
      profitMargin: Number(profitMargin.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      transactionCount: transactions._count,
      period,
    };

    return apiResponse(financialData, 200, request);
  } catch (error) {
    console.error('Error fetching financial reports:', error);
    return apiError('Failed to fetch financial reports', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request);
  return corsResponse || new NextResponse(null, { status: 204 });
}
