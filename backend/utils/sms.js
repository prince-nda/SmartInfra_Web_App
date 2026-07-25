const twilio = require('twilio');
require('dotenv').config();

const isConfigured = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER;

const client = isConfigured
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

/**
 * Normalizes a Rwandan number to E.164 (+250...) since that's what Twilio
 * requires. Accepts local formats like "07XXXXXXXX" or "07XX XXX XXX".
 */
function toE164(phone) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('250')) return `+${digits}`;
  if (digits.startsWith('0')) return `+250${digits.slice(1)}`;
  return `+250${digits}`;
}

async function sendSms(to, body) {
  if (!isConfigured) {
    console.warn('Twilio not configured - skipping SMS send');
    return;
  }
  const toNumber = toE164(to);
  if (!toNumber) return;

  try {
    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toNumber,
      body,
    });
  } catch (err) {
    // SMS is a nice-to-have alongside email/in-app notifications;
    // never let a failed text block the request that triggered it.
    console.error('SMS send failed:', err.message);
  }
}

function sendOtpSms(phone, otp) {
  return sendSms(phone, `SmartInfra: Your verification code is ${otp}. It expires in 10 minutes.`);
}

function sendReportSubmittedSms(phone, reportId) {
  return sendSms(phone, `SmartInfra: Your report #${reportId} was received and marked Submitted. Track it in the app.`);
}

function sendStatusUpdateSms(phone, reportId, newStatus) {
  const label = newStatus.replace('_', ' ');
  return sendSms(phone, `SmartInfra: Your report #${reportId} status changed to "${label}".`);
}

module.exports = { sendSms, sendOtpSms, sendReportSubmittedSms, sendStatusUpdateSms, toE164 };