import { Resend } from 'resend';

// Initialize Resend only if API key is available
const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailParams {
  to: string;
  type: 'invitation' | 'password_reset' | 'creator_setup';
  inviteToken?: string;
  resetUrl?: string;
  firstName?: string;
  creatorUsername?: string;
  setupUrl?: string;
}

export async function sendInviteEmail(params: EmailParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend API key not configured - email sending disabled');
    throw new Error('Email service not configured');
  }

  const { to, type, inviteToken, resetUrl, firstName, creatorUsername, setupUrl } = params;

  let subject: string;
  let html: string;

  if (type === 'creator_setup') {
    subject = 'Welcome to Tasty - Set Up Your Creator Account';
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Welcome to Tasty Creator Platform</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Hi there!
        </p>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Your creator account has been set up with the username: <strong>${creatorUsername}</strong>
        </p>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Click the button below to set up your password and access your creator dashboard:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setupUrl}" 
             style="display: inline-block; padding: 12px 24px; background: #ec4899; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Set Up Password & Login
          </a>
        </div>
        <p style="color: #999; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #666; font-size: 14px; word-break: break-all;">
          ${setupUrl}
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          This setup link was sent from Tasty Creator Platform. If you believe this was sent in error, please contact support.
        </p>
      </div>
    `;
  } else if (type === 'invitation') {
    const inviteLink = `https://tastyyyy.com/invitation?token=${inviteToken}`;
    subject = 'You\'ve Been Invited to Tasty CRM';
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Welcome to Tasty CRM</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          You've been invited to join the team. Click the button below to set up your account:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" 
             style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #999; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #666; font-size: 14px; word-break: break-all;">
          ${inviteLink}
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          This invitation was sent from Tasty CRM. If you believe this was sent in error, please ignore this email.
        </p>
      </div>
    `;
  } else {
    subject = 'Reset Your Tasty CRM Password';
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          You requested a password reset for your Tasty CRM account. Click the button below to reset your password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #999; font-size: 14px;">
          This link will expire in 30 minutes for security reasons.
        </p>
        <p style="color: #999; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #666; font-size: 14px; word-break: break-all;">
          ${resetUrl}
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
    `;
  }

  try {
    await resend.emails.send({
      from: 'notifications@tastyyyy.com',
      to,
      subject,
      html
    });
    
    console.log(`${type} email sent successfully to ${to}`);
  } catch (err) {
    console.error(`Failed to send ${type} email:`, err);
    // Don't throw error - log and continue so invitation still works
    console.warn(`Email sending failed but invitation was created successfully`);
  }
}

// Legacy function for backward compatibility
export async function sendInviteEmailLegacy(toEmail: string, inviteToken: string): Promise<void> {
  return sendInviteEmail({
    to: toEmail,
    type: 'invitation',
    inviteToken
  });
}

export async function sendCreatorSetupEmail(toEmail: string, username: string, setupToken: string): Promise<void> {
  const setupLink = `https://tastyyyy.com/creator-setup?token=${setupToken}`;
  
  return sendInviteEmail({
    to: toEmail,
    type: 'creator_setup',
    creatorUsername: username,
    setupUrl: setupLink
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string): Promise<void> {
  const resetLink = `https://tastyyyy.com/reset-password?token=${resetToken}`;

  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('Resend API key not configured - email sending disabled');
      return;
    }
    
    await resend.emails.send({
      from: 'notifications@tastyyyy.com',
      to: toEmail,
      subject: 'Reset Your Tasty CRM Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            You requested to reset your password for Tasty CRM. Click the button below to create a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="display: inline-block; padding: 12px 24px; background: #dc2626; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #999; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #666; font-size: 14px; word-break: break-all;">
            ${resetLink}
          </p>
          <p style="color: #dc2626; font-size: 14px; margin-top: 20px;">
            <strong>This link will expire in 1 hour for security purposes.</strong>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `
    });
    
    console.log(`Password reset email sent successfully to ${toEmail}`);
  } catch (err) {
    console.error('Failed to send password reset email:', err);
    throw new Error(`Failed to send password reset email: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}