/**
 * SMS Template Configuration for AI Sensy
 * 
 * Choose the best template based on your needs:
 * - 'default': Professional with emojis (recommended)
 * - 'minimal': Short and simple (saves SMS cost)
 * - 'professional': Business-focused
 * - 'detailed': Maximum security information
 * - 'emoji': Friendly with emojis (best for WhatsApp)
 * - 'corporate': Formal business style
 */

export type TemplateType = 'default' | 'minimal' | 'professional' | 'detailed' | 'emoji' | 'corporate';

export interface OTPTemplateConfig {
  type: TemplateType;
  companyName?: string;
  supportEmail?: string;
  supportPhone?: string;
}

/**
 * Get OTP message template
 */
export function getOTPTemplate(otp: string, config: OTPTemplateConfig = { type: 'default' }): string {
  const { type, companyName = 'AuthoSec', supportEmail = 'support@authosec.com' } = config;

  switch (type) {
    case 'minimal':
      return `Your ${companyName} OTP is ${otp}. Valid for 5 minutes. Don't share.`;

    case 'professional':
      return `${companyName} Verification

Code: ${otp}
Expires: 5 minutes

Security Tip: Never share your OTP
Questions? ${supportEmail}`;

    case 'detailed':
      return `${companyName} Security

Your verification code:
━━━━━━━━━━
   ${otp}
━━━━━━━━━━

⏱️ Expires: 5 minutes
🔒 Keep private
❓ Not you? Contact us now

${companyName} - Secure Access`;

    case 'emoji':
      return `✨ *${companyName}*

🔑 Your OTP: *${otp}*

⏰ Valid: 5 min
🚫 Don't share
💬 Help? Reply HELP`;

    case 'corporate':
      return `${companyName.toUpperCase()} AUTHENTICATION

Verification Code: ${otp}

Valid for 5 minutes only.
Do not share this code.

If you did not request this, contact security immediately.

© ${companyName}`;

    case 'default':
    default:
      return `🔐 ${companyName} Security Alert

Your verification code is:

${otp}

Valid for: 5 minutes
⚠️ DO NOT share this code.

Need help? ${supportEmail}
- ${companyName} Team`;
  }
}

/**
 * AI Sensy WhatsApp Template (if using WhatsApp Business API)
 * Note: WhatsApp templates must be pre-approved
 */
export function getWhatsAppOTPTemplate(otp: string, companyName = 'AuthoSec'): string {
  return `Hello! 👋

Your *${companyName}* verification code is:

*${otp}*

⏰ This code expires in 5 minutes.
🔒 For your security, don't share this code with anyone.

Need assistance? Just reply to this message.

Thank you,
${companyName} Team 💙`;
}

/**
 * Regional Templates (Indian Market)
 */
export function getIndianMarketTemplate(otp: string): string {
  return `नमस्ते / Hello!

AuthoSec Verification Code:
${otp}

⏰ 5 मिनट में समाप्त होगा / Valid for 5 min
🔒 किसी से साझा न करें / Don't share

सहायता / Help: support@authosec.com`;
}

/**
 * SMS Character Count Helper
 * Standard SMS: 160 chars (English), 70 chars (Unicode with emojis)
 */
export function getSMSCharacterCount(template: string): {
  length: number;
  isUnicode: boolean;
  smsCount: number;
  estimatedCost: string;
} {
  const hasUnicode = /[^\x00-\x7F]/.test(template);
  const length = template.length;
  const smsCount = hasUnicode 
    ? Math.ceil(length / 70) 
    : Math.ceil(length / 160);

  return {
    length,
    isUnicode: hasUnicode,
    smsCount,
    estimatedCost: `${smsCount} SMS credit${smsCount > 1 ? 's' : ''}`
  };
}

/**
 * Template Recommendations based on use case
 */
export const TEMPLATE_RECOMMENDATIONS = {
  banking: 'corporate',
  ecommerce: 'professional', 
  social: 'emoji',
  enterprise: 'detailed',
  startup: 'default',
  budget: 'minimal'
} as const;
