/* ==========================================================================
   BREW BUTTERFLY CAFE — EMAIL DELIVERY
   ========================================================================== */

require('dotenv').config();

const nodemailer = require('nodemailer');

const RESEND_API_KEY =
  process.env.RESEND_API_KEY;

const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  process.env.SMTP_FROM ||
  process.env.NOTIFY_EMAIL ||
  process.env.SMTP_USER ||
  'onboarding@resend.dev';

const SMTP_USER =
  process.env.SMTP_USER;

const SMTP_PASS =
  process.env.SMTP_PASS;

const SMTP_HOST =
  process.env.SMTP_HOST ||
  'smtp.gmail.com';

const isGmailHost =
  String(SMTP_HOST)
   .toLowerCase()
   .includes('gmail');

const SMTP_PORT = Number(
  process.env.SMTP_PORT &&
   process.env.SMTP_PORT !== ''
   ? process.env.SMTP_PORT
   : isGmailHost
     ? 587
     : 465
);

const SMTP_SECURE = String(
  process.env.SMTP_SECURE &&
   process.env.SMTP_SECURE !== ''
   ? process.env.SMTP_SECURE
   : isGmailHost
     ? 'false'
     : 'true'
).toLowerCase() === 'true';

const SMTP_FROM =
  process.env.SMTP_FROM ||
  SMTP_USER;

const NOTIFY_EMAIL =
  process.env.NOTIFY_EMAIL ||
  SMTP_USER;

if (!RESEND_API_KEY) {
  console.warn(
   '[EMAIL] RESEND_API_KEY is missing. Falling back to SMTP if configured.'
  );
}

if (!SMTP_USER) {
  console.warn(
   '[EMAIL] SMTP_USER is missing.'
  );
}

if (!SMTP_PASS) {
  console.warn(
   '[EMAIL] SMTP_PASS is missing.'
  );
}

/* ==========================================================================
   TRANSPORTER
   ========================================================================== */

const transporter =
  nodemailer.createTransport({
   host: SMTP_HOST,

   port: SMTP_PORT,

   secure: SMTP_SECURE,

   auth: {
     user:
       SMTP_USER,

     pass:
       SMTP_PASS
   },

   connectionTimeout: 15000,

   greetingTimeout: 15000,

   socketTimeout: 20000
  });

/* ==========================================================================
   VERIFY SMTP
   ========================================================================== */

async function verifySmtp() {
  if (RESEND_API_KEY) {
    console.log(
      '[EMAIL] Resend is configured; skipping SMTP verification.'
    );

    return true;
  }

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'RESEND_API_KEY or SMTP_USER/SMTP_PASS are required.'
    );
  }

  console.log(
    `[SMTP] Verifying connection to ${SMTP_HOST}:${SMTP_PORT} (secure=${SMTP_SECURE})...`
  );

  await transporter.verify();

  console.log(
    '[SMTP] Gmail SMTP connection verified.'
  );

  return true;
}

/* ==========================================================================
   ESCAPE HTML
   ========================================================================== */

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
   message: error.message || 'Unknown SMTP error',
   response: error.response || null,
   responseCode: error.responseCode || null,
   command: error.command || null,
   status: error.status || null
  };
}

async function getSmtpStatus() {
  const status = {
   provider: RESEND_API_KEY ? 'resend' : 'smtp',
   configured: Boolean(RESEND_API_KEY || (SMTP_USER && SMTP_PASS)),
   resendConfigured: Boolean(RESEND_API_KEY),
   smtpUserConfigured: Boolean(SMTP_USER),
   smtpPassConfigured: Boolean(SMTP_PASS),
   notifyEmailConfigured: Boolean(NOTIFY_EMAIL),
   host: SMTP_HOST,
   port: SMTP_PORT,
   secure: SMTP_SECURE,
   fromEmail: RESEND_FROM_EMAIL
  };

  if (RESEND_API_KEY) {
   status.ready = true;
   status.message = 'Resend is configured.';
   return status;
  }

  if (!SMTP_USER || !SMTP_PASS) {
   status.ready = false;
   status.error = 'RESEND_API_KEY or SMTP_USER/SMTP_PASS are required.';
   return status;
  }

  try {
   await transporter.verify();
   status.ready = true;
   status.message = 'SMTP connection verified.';
   return status;
  } catch (error) {
   status.ready = false;
   status.error = formatSmtpError(error);
   return status;
  }
}

/* ==========================================================================
   SEND RESERVATION EMAIL
   ========================================================================== */

async function sendReservationEmail(
  reservation
) {
  const recipients = String(
    NOTIFY_EMAIL || SMTP_USER || RESEND_FROM_EMAIL
  )
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error(
      'NOTIFY_EMAIL is missing.'
    );
  }

  const subject =
    `🦋 New Table Reservation — ${reservation.id}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Reservation</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f5f5;
    font-family:Arial,sans-serif;
  "
>

  <div
    style="
      max-width:650px;
      margin:30px auto;
      background:#ffffff;
      border-radius:14px;
      overflow:hidden;
      box-shadow:0 5px 20px rgba(0,0,0,.08);
    "
  >

    <div
      style="
        padding:25px;
        background:#111111;
        color:#ffffff;
        text-align:center;
      "
    >
      <h1 style="margin:0;">
        🦋 Brew Butterfly Cafe
      </h1>

      <p style="margin:8px 0 0;">
        New Reservation
      </p>
    </div>

    <div style="padding:30px;">

      <h2>
        Reservation ${escapeHtml(
          reservation.id
        )}
      </h2>

      <table
        style="
          width:100%;
          border-collapse:collapse;
        "
      >

        <tr>
          <td style="padding:10px 0;">
            <strong>Guest</strong>
          </td>

          <td style="padding:10px 0;">
            ${escapeHtml(reservation.name)}
          </td>
        </tr>

        <tr>
          <td style="padding:10px 0;">
            <strong>Phone</strong>
          </td>

          <td style="padding:10px 0;">
            ${escapeHtml(reservation.phone)}
          </td>
        </tr>

        <tr>
          <td style="padding:10px 0;">
            <strong>Guests</strong>
          </td>

          <td style="padding:10px 0;">
            ${escapeHtml(reservation.guests)}
          </td>
        </tr>

        <tr>
          <td style="padding:10px 0;">
            <strong>Date</strong>
          </td>

          <td style="padding:10px 0;">
            ${escapeHtml(reservation.date)}
          </td>
        </tr>

        <tr>
          <td style="padding:10px 0;">
            <strong>Time</strong>
          </td>

          <td style="padding:10px 0;">
            ${escapeHtml(reservation.time)}
          </td>
        </tr>

        <tr>
          <td style="padding:10px 0;">
            <strong>Occasion</strong>
          </td>

          <td style="padding:10px 0;">
            ${escapeHtml(reservation.occasion)}
          </td>
        </tr>

        <tr>
          <td style="padding:10px 0;">
            <strong>Notes</strong>
          </td>

          <td style="padding:10px 0;">
            ${escapeHtml(
              reservation.notes || 'None'
            )}
          </td>
        </tr>

        <tr>
          <td style="padding:10px 0;">
            <strong>Status</strong>
          </td>

          <td style="padding:10px 0;">
            <strong>
              ${escapeHtml(reservation.status)}
            </strong>
          </td>
        </tr>

      </table>

      <hr
        style="
          margin:25px 0;
          border:0;
          border-top:1px solid #ddd;
        "
      >

      <p style="color:#666;">
        This notification was generated automatically
        by the Brew Butterfly Cafe reservation system.
      </p>

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

  if (RESEND_API_KEY) {
    console.log(
      `[EMAIL] Sending reservation email via Resend to: ${recipients.join(', ')}`
    );

    const response = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: recipients,
          reply_to: RESEND_FROM_EMAIL,
          subject,
          text,
          html
        })
      }
    );

    const payload = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(
        payload.message || `Resend request failed (${response.status}).`
      );
    }

    console.log(
      `[EMAIL] Reservation email sent via Resend: ${payload.id}`
    );

    return {
      success: true,
      messageId: payload.id,
      provider: 'resend'
    };
  }

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'Email configuration is incomplete. Set RESEND_API_KEY or SMTP_USER/SMTP_PASS.'
    );
  }

  console.log(
    `[SMTP] Sending reservation email to: ${recipients.join(', ')}`
  );

  const info =
    await transporter.sendMail({
      from: SMTP_FROM,

      to: recipients.join(','),

      replyTo: SMTP_USER,

      subject,

      text,

      html
    });

  console.log(
    `[SMTP] Reservation email sent: ${info.messageId}`
  );

  return {
    success: true,
    messageId: info.messageId,
    provider: 'smtp'
  };
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

module.exports = {
  sendReservationEmail,
  verifySmtp,
  getSmtpStatus,
  formatSmtpError
};
