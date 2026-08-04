/* ==========================================================================
   BREW BUTTERFLY CAFE — GMAIL SMTP
   ========================================================================== */

require('dotenv').config();

const nodemailer = require('nodemailer');

const SMTP_USER =
  process.env.SMTP_USER;

const SMTP_PASS =
  process.env.SMTP_PASS;

const SMTP_FROM =
  process.env.SMTP_FROM ||
  SMTP_USER;

const NOTIFY_EMAIL =
  process.env.NOTIFY_EMAIL ||
  SMTP_USER;

if (!SMTP_USER || !SMTP_PASS) {
  console.warn(
    '[SMTP] SMTP_USER or SMTP_PASS is missing.'
  );
}

const transporter =
  nodemailer.createTransport({
    host:
      process.env.SMTP_HOST ||
      'smtp.gmail.com',

    port:
      Number(process.env.SMTP_PORT) ||
      465,

    secure:
      String(
        process.env.SMTP_SECURE || 'true'
      ).toLowerCase() === 'true',

    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },

    connectionTimeout: 15000,

    greetingTimeout: 15000,

    socketTimeout: 20000
  });

/* ==========================================================================
   VERIFY SMTP
   ========================================================================== */

async function verifySmtp() {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP_USER and SMTP_PASS are required.'
    );
  }

  await transporter.verify();

  console.log(
    '[SMTP] Gmail SMTP connection verified.'
  );

  return true;
}

/* ==========================================================================
   RESERVATION EMAIL
   ========================================================================== */

async function sendReservationEmail(
  reservation
) {
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
            background:white;
            border-radius:14px;
            overflow:hidden;
            box-shadow:0 5px 20px rgba(0,0,0,.08);
          "
        >

          <div
            style="
              padding:25px;
              background:#111;
              color:white;
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
              Reservation ${reservation.id}
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
                  ${reservation.guests}
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
                  ${escapeHtml(reservation.notes || 'None')}
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

            <hr style="margin:25px 0;border:0;border-top:1px solid #ddd;">

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

  const info =
    await transporter.sendMail({
      from: SMTP_FROM,

      to: NOTIFY_EMAIL,

      subject,

      text,

      html
    });

  console.log(
    `[SMTP] Reservation email sent: ${info.messageId}`
  );

  return {
    success: true,
    messageId: info.messageId
  };
}

/* ==========================================================================
   HTML ESCAPE
   ========================================================================== */

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

module.exports = {
  sendReservationEmail,
  verifySmtp
};
