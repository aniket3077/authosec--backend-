import crypto from 'crypto';
import { prisma } from './prisma';

export class OTPService {
  // OTP expires in 5 minutes
  private static readonly OTP_EXPIRY_MS = 5 * 60 * 1000;
  
  // Maximum OTP attempts
  private static readonly MAX_ATTEMPTS = 3;
  
  /**
   * Generate a 6-digit OTP
   */
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  /**
   * Hash OTP for secure storage
   */
  static hashOTP(otp: string): string {
    return crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');
  }
  
  /**
   * Send OTP via Supabase Auth (SMS)
   */
  static async sendOTP(
    phoneNumber: string,
    purpose: 'login' | 'transaction' | 'verification',
    transactionId?: string
  ): Promise<{ success: boolean; expiresAt: Date }> {
    try {
      const otp = this.generateOTP();
      const otpHash = this.hashOTP(otp);
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MS);
      
      // Store OTP in database
      await prisma.otpLog.create({
        data: {
          phone: phoneNumber,
          otpHash,
          purpose,
          transactionId,
          expiresAt,
          attempts: 0,
        },
      });
      
      // In development, log OTP to console
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 OTP for ${phoneNumber}: ${otp}`);
      }
      
      // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
      // For production, send actual SMS here
      
      return {
        success: true,
        expiresAt
      };
    } catch (error: any) {
      console.error('OTP service error:', error);
      throw new Error(error.message || 'Failed to send OTP');
    }
  }
  
  /**
   * Verify OTP
   */
  static async verifyOTP(
    phoneNumber: string,
    otp: string,
    purpose: string,
    transactionId?: string
  ): Promise<{ success: boolean; userId?: string }> {
    try {
      const otpHash = this.hashOTP(otp);
      
      // Find OTP log
      const where: any = {
        phone: phoneNumber,
        otpHash,
        purpose,
        isVerified: false,
        expiresAt: {
          gte: new Date(),
        },
      };
      
      if (transactionId) {
        where.transactionId = transactionId;
      }
      
      const otpLog = await prisma.otpLog.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
      });
      
      if (!otpLog) {
        throw new Error('Invalid or expired OTP');
      }
      
      // Check attempts
      if (otpLog.attempts >= this.MAX_ATTEMPTS) {
        throw new Error('Maximum OTP attempts exceeded');
      }
      
      // Check expiration
      if (otpLog.expiresAt < new Date()) {
        throw new Error('OTP has expired');
      }
      
      // Mark as verified
      await prisma.otpLog.update({
        where: { id: otpLog.id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      });
      
      return {
        success: true,
        userId: otpLog.userId || undefined,
      };
    } catch (error: any) {
      // Increment attempts
      try {
        const otpHash = this.hashOTP(otp);
        const otpLog = await prisma.otpLog.findFirst({
          where: {
            phone: phoneNumber,
            otpHash,
            purpose,
            isVerified: false,
          },
        });
        
        if (otpLog) {
          await prisma.otpLog.update({
            where: { id: otpLog.id },
            data: {
              attempts: { increment: 1 },
            },
          });
        }
      } catch (e) {
        console.error('Failed to increment OTP attempts:', e);
      }
      
      console.error('OTP verification error:', error);
      throw new Error(error.message || 'Failed to verify OTP');
    }
  }
  
  /**
   * Invalidate all pending OTPs for a phone number
   */
  static async invalidateOTPs(phoneNumber: string): Promise<void> {
    try {
      await prisma.otpLog.updateMany({
        where: {
          phone: phoneNumber,
          isVerified: false,
        },
        data: {
          isVerified: true,
        },
      });
    } catch (error) {
      console.error('Failed to invalidate OTPs:', error);
    }
  }
}

export default OTPService;
