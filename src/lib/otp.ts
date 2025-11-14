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
      const otpData: any = {
        phone_number: phoneNumber,
        otp_hash: otpHash,
        purpose,
        expires_at: expiresAt,
        attempts: 0,
      };

      if (transactionId) {
        otpData.transaction_id = transactionId;
      }

      await prisma.otp_logs.create({
        data: otpData,
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
        phone_number: phoneNumber,
        otp_hash: otpHash,
        purpose,
        is_verified: false,
        expires_at: {
          gte: new Date(),
        },
      };

      if (transactionId) {
        where.transaction_id = transactionId;
      }

      const otpLog = await prisma.otp_logs.findFirst({
        where,
        orderBy: { created_at: 'desc' },
      });      if (!otpLog) {
        throw new Error('Invalid or expired OTP');
      }
      
      // Check attempts
      if (otpLog.attempts >= this.MAX_ATTEMPTS) {
        throw new Error('Maximum OTP attempts exceeded');
      }
      
      // Check expiration
      if (otpLog.expires_at < new Date()) {
        throw new Error('OTP has expired');
      }

      // Mark as verified
      await prisma.otp_logs.update({
        where: { id: otpLog.id },
        data: {
          is_verified: true,
          verified_at: new Date(),
        },
      });

      return {
        success: true,
        userId: otpLog.user_id || undefined,
      };
    } catch (error: any) {
      // Increment attempts
      try {
        const otpHash = this.hashOTP(otp);
        const otpLog = await prisma.otp_logs.findFirst({
          where: {
            phone_number: phoneNumber,
            otp_hash: otpHash,
            purpose,
            is_verified: false,
          },
        });
        
        if (otpLog) {
          await prisma.otp_logs.update({
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
      await prisma.otp_logs.updateMany({
        where: {
          phone_number: phoneNumber,
          is_verified: false,
        },
        data: {
          is_verified: true,
        },
      });
    } catch (error) {
      console.error('Failed to invalidate OTPs:', error);
    }
  }
}

export default OTPService;
