import CryptoJS from 'crypto-js';
import crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  
  /**
   * Generate a random encryption key (32 bytes for AES-256)
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Generate a random initialization vector (16 bytes)
   */
  static generateIV(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  
  /**
   * Encrypt data using AES-256-GCM
   */
  static encrypt(data: any, key: string, iv: string): string {
    try {
      const dataString = JSON.stringify(data);
      
      const encrypted = CryptoJS.AES.encrypt(
        dataString,
        CryptoJS.enc.Hex.parse(key),
        {
          iv: CryptoJS.enc.Hex.parse(iv),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );
      
      return encrypted.toString();
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt data using AES-256-GCM
   */
  static decrypt(encryptedData: string, key: string, iv: string): any {
    try {
      const decrypted = CryptoJS.AES.decrypt(
        encryptedData,
        CryptoJS.enc.Hex.parse(key),
        {
          iv: CryptoJS.enc.Hex.parse(iv),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );
      
      const dataString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!dataString) {
        throw new Error('Decryption failed - invalid key or data');
      }
      
      return JSON.parse(dataString);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Hash data using SHA-256
   */
  static hash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }
  
  /**
   * Verify hashed data
   */
  static verifyHash(data: string, hash: string): boolean {
    const dataHash = this.hash(data);
    return dataHash === hash;
  }
}

export default EncryptionService;
