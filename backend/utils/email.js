const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // e.g. smtp-relay.brevo.com
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,                      // STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html, text }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"SmartInfra" <no-reply@smartinfra.rw>',
      to,
      subject,
      text,
      html,
    });
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

function sendReportSubmittedEmail(to, fullName, reportId) {
  return sendEmail({
    to,
    subject: `SmartInfra: Report #${reportId} received`,
    html: `<p>Hi ${fullName},</p>
      <p>Your infrastructure report <strong>#${reportId}</strong> has been received and is now marked as <strong>Submitted</strong>.</p>
      <p>You can track its progress any time from your SmartInfra dashboard.</p>`,
  });
}

function sendStatusUpdateEmail(to, fullName, reportId, newStatus) {
  return sendEmail({
    to,
    subject: `SmartInfra: Report #${reportId} update`,
    html: `<p>Hi ${fullName},</p>
      <p>Your infrastructure report <strong>#${reportId}</strong> status has changed to <strong>${newStatus}</strong>.</p>`,
  });
}

module.exports = {
  sendEmail,
  sendVerificationOtpEmail,
  sendPasswordResetOtpEmail,
  sendReportSubmittedEmail,
  sendStatusUpdateEmail,
};