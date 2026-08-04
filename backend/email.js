/* ==========================================================================
   BREW BUTTERFLY CAFE — EMAIL SERVICE
   Sends reservation confirmation emails via Gmail SMTP using Nodemailer.
   Includes retry logic (up to 3 attempts) and file logging.
   ========================================================================== */

const nodemailer = require('nodemailer');
const fs         = require('fs');
const path       = require('path');

// ── Ensure logs directory exists ──────────────────────────────────────────────
const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
const LOG_FILE = path.join(LOGS_DIR, 'email.log');

function logEmail(level, msg, extra = '') {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg} ${extra}\n`;
  fs.appendFileSync(LOG_FILE, line);
  if (level === 'error') console.error(line.trim());
  else console.log(line.trim());
}

// ── Create Nodemailer transporter ─────────────────────────────────────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,          // SSL
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    pool: true,            // Keep-alive connection pool
    maxConnections: 3,
    maxMessages: 100
  });
  return transporter;
}

// ── HTML email template ───────────────────────────────────────────────────────
function buildEmailHTML(res) {
  const occasionBadge = res.occasion && res.occasion !== 'Regular Visit'
    ? `<span style="display:inline-block;background:#f2c14e;color:#241f1c;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;margin-left:8px;">${res.occasion}</span>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Table Reservation — Brew Butterfly Cafe</title>
</head>
<body style="margin:0;padding:0;background:#f8f5f0;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5f0;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#241f1c 0%,#3d3530 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:28px;margin-bottom:6px;">🦋</div>
              <h1 style="color:#f2c14e;font-size:22px;margin:0;font-family:Georgia,serif;">Brew Butterfly Cafe</h1>
              <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:6px 0 0;">Tejbinayak, Baimal Marga, Kathmandu</p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background:#f2c14e;padding:14px 40px;text-align:center;">
              <p style="margin:0;font-size:15px;font-weight:700;color:#241f1c;">☕ New Table Reservation Received!</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#475569;font-size:15px;margin-top:0;">
                A guest has requested a table reservation through your website.
                Please review the details below and confirm by phone.
              </p>

              <!-- Ref ID -->
              <div style="background:#f8f5f0;border-left:4px solid #a978d6;border-radius:8px;padding:14px 20px;margin-bottom:24px;">
                <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Reference ID</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#241f1c;font-family:monospace;">${res.id}</p>
              </div>

              <!-- Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0">
                ${detailRow('Guest Name', res.name + occasionBadge)}
                ${detailRow('Phone Number', `<a href="tel:${res.phone}" style="color:#a978d6;text-decoration:none;font-weight:700;">${res.phone}</a>`)}
                ${detailRow('Date &amp; Time', `<strong>${formatDate(res.date)}</strong> at <strong>${res.time}</strong>`)}
                ${detailRow('Party Size', `<strong>${res.guests}</strong> Guest${res.guests !== 1 ? 's' : ''}`)}
                ${detailRow('Occasion', res.occasion || 'Regular Visit')}
                ${res.notes ? detailRow('Special Requests', `<em>${res.notes}</em>`) : ''}
              </table>

              <!-- Action Button -->
              <div style="text-align:center;margin:28px 0 0;">
                <a href="tel:${res.phone}"
                   style="display:inline-block;background:linear-gradient(135deg,#a978d6,#6b3fa0);color:#fff;text-decoration:none;padding:14px 36px;border-radius:30px;font-size:15px;font-weight:700;">
                  📞 Call Guest to Confirm
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f5f0;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Brew Butterfly Cafe · Tejbinayak, Baimal Marga, Kathmandu 44600
                <br>Open Daily: 11:00 AM – 8:00 PM &nbsp;|&nbsp; ☎ 974-4569611
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;width:40%;vertical-align:top;">
        <span style="font-size:13px;color:#64748b;font-weight:600;">${label}</span>
      </td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
        <span style="font-size:14px;color:#1e293b;">${value}</span>
      </td>
    </tr>`;
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch { return dateStr; }
}

// ── Send with retry ───────────────────────────────────────────────────────────
async function sendReservationEmail(reservation, attempt = 1) {
  const MAX_ATTEMPTS = 3;
  const ownerEmail = process.env.OWNER_EMAIL || process.env.SMTP_USER;

  const mailOptions = {
    from: `"Brew Butterfly Cafe" <${process.env.SMTP_USER}>`,
    to: ownerEmail,
    subject: `☕ New Table Reservation — ${reservation.id} (${reservation.name})`,
    text:
      `Brew Butterfly Cafe — New Reservation\n\n` +
      `Ref: ${reservation.id}\nName: ${reservation.name}\nPhone: ${reservation.phone}\n` +
      `Date/Time: ${reservation.date} at ${reservation.time}\nGuests: ${reservation.guests}\n` +
      `Occasion: ${reservation.occasion || 'Regular Visit'}\nNotes: ${reservation.notes || 'None'}\n`,
    html: buildEmailHTML(reservation)
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    logEmail('info', `Email sent for reservation ${reservation.id}`, `(messageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logEmail('error', `Email attempt ${attempt}/${MAX_ATTEMPTS} failed for ${reservation.id}:`, err.message);
    if (attempt < MAX_ATTEMPTS) {
      const delay = attempt * 2000; // Exponential back-off: 2s, 4s
      await new Promise(r => setTimeout(r, delay));
      return sendReservationEmail(reservation, attempt + 1);
    }
    return { success: false, error: err.message };
  }
}

// ── Verify SMTP connection on startup ─────────────────────────────────────────
async function verifySmtp() {
  try {
    await getTransporter().verify();
    logEmail('info', 'SMTP connection verified — Gmail ready to send emails.');
    return true;
  } catch (err) {
    logEmail('error', 'SMTP verification failed:', err.message);
    logEmail('error', 'Check SMTP_USER and SMTP_PASS in backend/.env');
    return false;
  }
}

module.exports = { sendReservationEmail, verifySmtp };
