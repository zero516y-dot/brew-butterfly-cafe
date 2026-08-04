const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const NOTIFY_TO = process.env.NOTIFY_TO || SMTP_USER;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

async function verifySmtp() {
  await transporter.verify();
  return true;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendReservationEmail(r) {
  const subject = `🦋 New Reservation — ${r.id} — ${r.date} ${r.time}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto">
      <h2 style="color:#2f5d50">🦋 Brew Butterfly Cafe — New Reservation</h2>
      <p>A new table reservation has been submitted from the website.</p>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
        <tr><td><b>Reference</b></td><td>${escapeHtml(r.id)}</td></tr>
        <tr><td><b>Name</b></td><td>${escapeHtml(r.name)}</td></tr>
        <tr><td><b>Phone</b></td><td>${escapeHtml(r.phone)}</td></tr>
        <tr><td><b>Guests</b></td><td>${escapeHtml(r.guests)}</td></tr>
        <tr><td><b>Date</b></td><td>${escapeHtml(r.date)}</td></tr>
        <tr><td><b>Time</b></td><td>${escapeHtml(r.time)}</td></tr>
        <tr><td><b>Occasion</b></td><td>${escapeHtml(r.occasion)}</td></tr>
        <tr><td><b>Notes</b></td><td>${escapeHtml(r.notes || 'None')}</td></tr>
        <tr><td><b>Status</b></td><td>Pending</td></tr>
      </table>
      <p style="margin-top:20px">Please call the customer to confirm the reservation.</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Brew Butterfly Cafe" <${SMTP_USER}>`,
    to: NOTIFY_TO,
    subject,
    html
  });

  return { success: true, messageId: info.messageId };
}

module.exports = { sendReservationEmail, verifySmtp };
