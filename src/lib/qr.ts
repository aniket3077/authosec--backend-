import QRCode from 'qrcode';
import { EncryptionService } from './encryption';

export interface QRData {
  transactionId: string;
  type: 'qr1' | 'qr2';
  amount: number;
  senderId: string;
  receiverId: string;
  timestamp: number;
  expiresAt: number;
  nonce: string; // Random nonce for uniqueness
}

export class QRService {
  // QR1 expires in 15 minutes
  private static readonly QR1_EXPIRY_MS = 15 * 60 * 1000;
  
  // QR2 expires in 10 minutes
  private static readonly QR2_EXPIRY_MS = 10 * 60 * 1000;
  
  /**
   * Generate QR code with encrypted data
   */
  static async generateQR(
    data: QRData,
    encryptionKey: string,
    iv: string
  ): Promise<{ qrCodeImage: string; encryptedData: string }> {
    try {
      // Add timestamp and expiry
      const qrData: QRData = {
        ...data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (data.type === 'qr1' ? this.QR1_EXPIRY_MS : this.QR2_EXPIRY_MS),
        nonce: EncryptionService.generateIV().substring(0, 16) // Random nonce
      };
      
      // Encrypt the data
      const encryptedData = EncryptionService.encrypt(qrData, encryptionKey, iv);
      
      // Generate QR code image
      const qrCodeImage = await QRCode.toDataURL(encryptedData, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      
      return {
        qrCodeImage,
        encryptedData
      };
    } catch (error) {
      console.error('QR generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }
  
  /**
   * Validate and decrypt QR code data
   */
  static async validateQR(
    encryptedData: string,
    encryptionKey: string,
    iv: string
  ): Promise<QRData> {
    try {
      // Decrypt the data
      const qrData = EncryptionService.decrypt(encryptedData, encryptionKey, iv) as QRData;
      
      // Validate expiration
      if (qrData.expiresAt < Date.now()) {
        throw new Error('QR code has expired');
      }
      
      // Validate structure
      if (!qrData.transactionId || !qrData.type || !qrData.amount) {
        throw new Error('Invalid QR code data structure');
      }
      
      return qrData;
    } catch (error: any) {
      console.error('QR validation error:', error);
      throw new Error(error.message || 'Failed to validate QR code');
    }
  }
  
  /**
   * Check if QR code is expired
   */
  static isExpired(qrData: QRData): boolean {
    return qrData.expiresAt < Date.now();
  }
  
  /**
   * Get remaining time in seconds
   */
  static getRemainingTime(qrData: QRData): number {
    const remaining = qrData.expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }
}

export default QRService;
