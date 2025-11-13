import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/company/dashboard
 * Get dashboard analytics for company admin
 */
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      return apiError('User not found', 404, request);
    }

    if (user.role !== 'COMPANY_ADMIN') {
      return apiError('Forbidden - Only company admins can access dashboard', 403, request);
    }

    if (!user.companyId) {
      return apiError('User is not associated with a company', 400, request);
    }

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
    });

    // Get user statistics
    const totalUsers = await prisma.user.count({
      where: { companyId: user.companyId },
    });

    const activeUsers = await prisma.user.count({
      where: { 
        companyId: user.companyId,
        isActive: true,
      },
    });

    const usersThisMonth = await prisma.user.count({
      where: {
        companyId: user.companyId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    // Get transaction statistics
    const totalTransactions = await prisma.transaction.count({
      where: { companyId: user.companyId },
    });

    const completedTransactions = await prisma.transaction.count({
      where: {
        companyId: user.companyId,
        status: 'COMPLETED',
      },
    });

    const pendingTransactions = await prisma.transaction.count({
      where: {
        companyId: user.companyId,
        status: { in: ['INITIATED', 'QR1_SCANNED', 'QR2_GENERATED', 'QR2_SCANNED', 'OTP_SENT'] },
      },
    });

    const failedTransactions = await prisma.transaction.count({
      where: {
        companyId: user.companyId,
        status: { in: ['FAILED', 'CANCELLED'] },
      },
    });

    const transactionsToday = await prisma.transaction.count({
      where: {
        companyId: user.companyId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    // Get total transaction amount
    const transactionAmounts = await prisma.transaction.aggregate({
      where: {
        companyId: user.companyId,
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { companyId: user.companyId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        transactionNumber: true,
        amount: true,
        status: true,
        createdAt: true,
        sender: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        receiver: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Get recent activity logs
    const recentActivities = await prisma.auditLog.findMany({
      where: { companyId: user.companyId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Get notifications count
    const unreadNotifications = await prisma.notification.count({
      where: {
        companyId: user.companyId,
        isRead: false,
      },
    });

    // Get user role distribution
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      where: { companyId: user.companyId },
      _count: true,
    });

    // Get transaction status distribution
    const transactionsByStatus = await prisma.transaction.groupBy({
      by: ['status'],
      where: { companyId: user.companyId },
      _count: true,
    });

    return apiResponse(
      {
        company: {
          id: company?.id,
          name: company?.name,
          subscriptionTier: company?.subscriptionTier,
          isActive: company?.isActive,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          newThisMonth: usersThisMonth,
          byRole: usersByRole.map(r => ({
            role: r.role,
            count: r._count,
          })),
        },
        transactions: {
          total: totalTransactions,
          completed: completedTransactions,
          pending: pendingTransactions,
          failed: failedTransactions,
          today: transactionsToday,
          totalAmount: transactionAmounts._sum.amount || 0,
          byStatus: transactionsByStatus.map(t => ({
            status: t.status,
            count: t._count,
          })),
        },
        recentTransactions,
        recentActivities,
        notifications: {
          unread: unreadNotifications,
        },
      },
      200,
      request
    );
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return apiError(
      error.message || 'Failed to fetch dashboard data',
      500,
      request
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request) || new Response(null, { status: 200 });
}
