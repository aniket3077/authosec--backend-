import { NextRequest, NextResponse } from 'next/server';
import { handleCors } from '@/lib/cors';
import { apiResponse, apiError } from '@/lib/response';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import prisma from '@/lib/prisma';

// GET /api/owner/dashboard-stats
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

    // TODO: Add role check for owner/super_admin
    // if (user.role !== 'SUPER_ADMIN' && user.role !== 'OWNER') {
    //   return apiError('Forbidden - Owner access required', 403, request);
    // }

    // Get current month dates
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch transaction statistics
    const [currentMonthTransactions, lastMonthTransactions] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          createdAt: {
            gte: firstDayOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: {
          createdAt: {
            gte: lastMonth,
            lte: lastDayOfLastMonth,
          },
        },
        _sum: {
          amount: true,
        },
        _count: true,
      }),
    ]);

    // Calculate revenue
    const currentRevenue = Number(currentMonthTransactions._sum.amount ?? 0);
    const lastRevenue = Number(lastMonthTransactions._sum.amount ?? 0);
    const revenueGrowth = lastRevenue > 0 
      ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 
      : 0;

    // Get user statistics
    const [totalUsers, newUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth,
          },
        },
      }),
    ]);

    // Calculate user growth
    const lastMonthUsers = totalUsers - newUsers;
    const userGrowth = lastMonthUsers > 0 
      ? (newUsers / lastMonthUsers) * 100 
      : 0;

    // Transaction count and growth
    const currentTransactions = currentMonthTransactions._count;
    const lastTransactions = lastMonthTransactions._count;
    const transactionGrowth = lastTransactions > 0 
      ? ((currentTransactions - lastTransactions) / lastTransactions) * 100 
      : 0;

    // Mock profit margin (should be calculated from expenses in production)
    const expenses = currentRevenue * 0.656; // 65.6% expenses
    const profit = currentRevenue - expenses;
    const profitMargin = currentRevenue > 0 ? (profit / currentRevenue) * 100 : 0;

    const stats = {
      revenue: Number(currentRevenue),
      revenueGrowth: Number(revenueGrowth.toFixed(1)),
      users: totalUsers,
      usersGrowth: Number(userGrowth.toFixed(1)),
      transactions: currentTransactions,
      transactionsGrowth: Number(transactionGrowth.toFixed(1)),
      profitMargin: Number(profitMargin.toFixed(1)),
      profitGrowth: 8.2, // Mock value
    };

    return apiResponse(stats, 200, request);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return apiError('Failed to fetch dashboard statistics', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request);
  return corsResponse || new NextResponse(null, { status: 204 });
}
