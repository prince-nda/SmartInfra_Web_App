require('dotenv').config();

async function sendEmail({ to, subject, html, text }) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'SmartInfra',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text || undefined,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Brevo API error ${response.status}: ${errorBody}`);
    }
  } catch (err) {
    // Never let an email failure crash the request that triggered it;
    // log and let the caller decide whether to surface it.
    console.error('Email send failed:', err.message);
  }
}

function sendVerificationOtpEmail(to, fullName, otp) {
  return sendEmail({
    to,
    subject: 'Your SmartInfra verification code',
    html: `<p>Hi ${fullName},</p>
      <p>Thanks for registering with SmartInfra. Your verification code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.1em;">${otp}</p>
      <p>This code expires in 10 minutes. If you didn't create this account, you can ignore this email.</p>`,
  });
}

function sendPasswordResetOtpEmail(to, fullName, otp) {
  return sendEmail({
    to,
    subject: 'Your SmartInfra password reset code',
    html: `<p>Hi ${fullName},</p>
      <p>We received a request to reset your SmartInfra password. Your reset code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.1em;">${otp}</p>
      <p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>`,
  });
}

/**
 * Sent to a newly-created staff account with their login email and
 * system-generated temporary password. They're forced to set their own
 * password on first login (must_change_password), so this credential
 * is single-use in practice.
 */
function sendStaffWelcomeEmail(to, fullName, tempPassword) {
  return sendEmail({
    to,
    subject: 'Your SmartInfra administrator account',
    html: `<p>Hi ${fullName},</p>
      <p>An administrator account has been created for you on SmartInfra. Use these details to log in:</p>
      <p>
        <strong>Email:</strong> ${to}<br/>
        <strong>Temporary password:</strong> <span style="font-size: 20px; font-weight: 700; letter-spacing: 0.05em;">${tempPassword}</span>
      </p>
      <p>You'll be asked to set your own password the first time you log in. This temporary password will not work again after that.</p>
      <p>If you weren't expecting this account, please contact your system administrator.</p>`,
  });
}

function sendReportSubmittedEmail(to, fullName, reportId) {
  return sendEmail({
    to,
    subject: `SmartInfra: Report #${reportId} received`,
    html: `<p>Hi ${fullName},</p>
      <p>Your infrastructure report <strong>#${reportId}</strong> has been received and is now marked as <strong>Submitted</strong>.</p>
      <p>You can track its progress any time from your SmartInfra dashboard.</p>`,
  });
}

function sendStatusUpdateEmail(to, fullName, reportId, newStatus, customMessage) {
  return sendEmail({
    to,
    subject: `SmartInfra: Report #${reportId} update`,
    html: `<p>Hi ${fullName},</p>
      <p>Your infrastructure report <strong>#${reportId}</strong> status has changed to <strong>${newStatus.replace('_', ' ')}</strong>.</p>
      ${customMessage ? `<p>${customMessage}</p>` : ''}`,
  });
}

module.exports = {
  sendEmail,
  sendVerificationOtpEmail,
  sendPasswordResetOtpEmail,
  sendStaffWelcomeEmail,
  sendReportSubmittedEmail,
  sendStatusUpdateEmail,
};