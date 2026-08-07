/* ==========================================================================
   BREW BUTTERFLY CAFE — RESEND EMAIL DELIVERY
   SMTP is disabled for now. Reservation emails are sent through Resend.
   ========================================================================= */

require('dotenv').config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM =
  process.env.RESEND_FROM ||
  process.env.RESEND_FROM_EMAIL ||
  process.env.NOTIFY_EMAIL ||
  process.env.SMTP_USER ||
  'onboarding@resend.dev';
const NOTIFY_EMAIL =
  process.env.NOTIFY_EMAIL ||
  process.env.SMTP_USER ||
  '';

if (!RESEND_API_KEY) {
  console.warn(
    '[EMAIL] RESEND_API_KEY is missing. Reservation emails will fail until it is configured.'
  );
}

if (!NOTIFY_EMAIL) {
  console.warn(
    '[EMAIL] NOTIFY_EMAIL is missing. Reservations will be sent to the Resend sender address if configured.'
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatSmtpError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name || 'Error',
    code: error.code || null,
    message: error.message || 'Unknown email error',
    response: error.response || null,
    responseCode: error.responseCode || null,
    command: error.command || null,
    status: error.status || null
  };
}

async function verifySmtp() {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required for email delivery.');
  }

  console.log('[EMAIL] Resend is configured; email delivery is enabled.');
  return true;
}

async function getSmtpStatus() {
  const status = {
    provider: 'resend',
    configured: Boolean(RESEND_API_KEY),
    resendConfigured: Boolean(RESEND_API_KEY),
    notifyEmailConfigured: Boolean(NOTIFY_EMAIL),
    fromEmail: RESEND_FROM
  };

  if (!RESEND_API_KEY) {
    status.ready = false;
    status.error = 'RESEND_API_KEY is required for email delivery.';
    return status;
  }

  status.ready = true;
  status.message = 'Resend is configured and ready.';
  return status;
}

async function sendReservationEmail(reservation) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required for email delivery.');
  }

  const recipients = String(
    NOTIFY_EMAIL || RESEND_FROM
  )
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error('NOTIFY_EMAIL is missing.');
  }

  const subject = `🦋 New Table Reservation — ${reservation.id}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Reservation</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:650px;margin:30px auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,.08);">
    <div style="padding:25px;background:#111111;color:#ffffff;text-align:center;">
      <h1 style="margin:0;">🦋 Brew Butterfly Cafe</h1>
      <p style="margin:8px 0 0;">New Reservation</p>
    </div>
    <div style="padding:30px;">
      <h2>Reservation ${escapeHtml(reservation.id)}</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;"><strong>Guest</strong></td><td style="padding:10px 0;">${escapeHtml(reservation.name)}</td></tr>
        <tr><td style="padding:10px 0;"><strong>Phone</strong></td><td style="padding:10px 0;">${escapeHtml(reservation.phone)}</td></tr>
        <tr><td style="padding:10px 0;"><strong>Guests</strong></td><td style="padding:10px 0;">${escapeHtml(reservation.guests)}</td></tr>
        <tr><td style="padding:10px 0;"><strong>Date</strong></td><td style="padding:10px 0;">${escapeHtml(reservation.date)}</td></tr>
        <tr><td style="padding:10px 0;"><strong>Time</strong></td><td style="padding:10px 0;">${escapeHtml(reservation.time)}</td></tr>
        <tr><td style="padding:10px 0;"><strong>Occasion</strong></td><td style="padding:10px 0;">${escapeHtml(reservation.occasion)}</td></tr>
        <tr><td style="padding:10px 0;"><strong>Notes</strong></td><td style="padding:10px 0;">${escapeHtml(reservation.notes || 'None')}</td></tr>
        <tr><td style="padding:10px 0;"><strong>Status</strong></td><td style="padding:10px 0;"><strong>${escapeHtml(reservation.status)}</strong></td></tr>
      </table>
      <hr style="margin:25px 0;border:0;border-top:1px solid #ddd;">
      <p style="color:#666;">This notification was generated automatically by the Brew Butterfly Cafe reservation system.</p>
    </div>
  </div>
</body>
</html>
`;

  const text = `
Brew Butterfly Cafe — New Reservation

Reservation ID: ${reservation.id}
Guest: ${reservation.name}
Phone: ${reservation.phone}
Guests: ${reservation.guests}
Date: ${reservation.date}
Time: ${reservation.time}
Occasion: ${reservation.occasion}
Notes: ${reservation.notes || 'None'}
Status: ${reservation.status}
`;

  console.log(`[EMAIL] Sending reservation email via Resend to: ${recipients.join(', ')}`);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: recipients,
      reply_to: RESEND_FROM,
      subject,
      text,
      html
    })
  });

  const payload = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    console.error("Resend response:", payload);

throw new Error(
  JSON.stringify(payload, null, 2)
);
  }

  console.log(`[EMAIL] Reservation email sent via Resend: ${payload.id}`);

  return {
    success: true,
    messageId: payload.id,
    provider: 'resend'
  };
}

module.exports = {
  sendReservationEmail,
  verifySmtp,
  getSmtpStatus,
  formatSmtpError
};

