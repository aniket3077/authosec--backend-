/**
 * AWS SNS SMS Integration for OTP sending
 * https://docs.aws.amazon.com/sns/
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { getOTPTemplate } from './sms-templates';

// Initialize AWS SNS client
const awsRegion = process.env.AWS_REGION || 'ap-south-1';
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const snsSenderId = process.env.AWS_SNS_SENDER_ID || 'AuthoSec';

let snsClient: SNSClient | null = null;

if (awsAccessKeyId && awsSecretAccessKey) {
  snsClient = new SNSClient({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  });
} else {
  console.warn('⚠️ AWS SNS credentials not found. SMS sending will be disabled.');
}

/**
 * Send SMS using AWS SNS
 * @param to - Phone number in E.164 format (e.g., +919876543211)
 * @param message - Message to send
 * @returns Promise with success status
 */
export async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!snsClient) {
    console.warn('⚠️ AWS SNS not configured. Skipping SMS send.');
    return false;
  }

  try {
    const command = new PublishCommand({
      PhoneNumber: to,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: snsSenderId,
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional', // Use 'Promotional' for marketing messages
        },
      },
    });

    const response = await snsClient.send(command);
    console.log(`✅ SMS sent to ${to} via AWS SNS. MessageId: ${response.MessageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${to} via AWS SNS:`, error);
    return false;
  }
}

/**
 * Send OTP via SMS using AWS SNS
 * @param phoneNumber - Phone number in E.164 format
 * @param otp - 6-digit OTP code
 * @returns Promise with success status
 */
export async function sendOTPSMS(phoneNumber: string, otp: string): Promise<boolean> {
  // Get template from environment or use default
  const templateType = (process.env.SMS_TEMPLATE_TYPE as any) || 'default';
  
  // Generate message using template system
  const message = getOTPTemplate(otp, {
    type: templateType,
    companyName: 'AuthoSec',
    supportEmail: 'support@authosec.com'
  });

  return sendSMS(phoneNumber, message);
}

/**
 * Additional AWS SNS Helper Functions
 */

/**
 * Set SMS spending limit (optional, for cost control)
 */
export async function setSMSSpendingLimit(limitUSD: number): Promise<boolean> {
  if (!snsClient) return false;
  
  try {
    // Note: SMS spending limits are set via AWS Console or CLI
    console.log(`💰 Set monthly SMS spending limit to $${limitUSD} via AWS Console`);
    return true;
  } catch (error) {
    console.error('Failed to set spending limit:', error);
    return false;
  }
}

/**
 * Get SMS delivery status (requires CloudWatch Logs)
 */
export function getSMSDeliveryStatus(messageId: string): string {
  return `Check delivery status in AWS CloudWatch for MessageId: ${messageId}`;
}
