# Brew Butterfly Cafe — Full Stack & Backend Documentation

## 🚀 Overview
Brew Butterfly Cafe has been upgraded from a static website to a **secure, full-stack Node.js/Express web application** with automated Gmail SMTP notification dispatch, strict security hardening (OWASP Top 10 remediation), and a protected Admin Dashboard accessible via `/admin`.

---

## 🔒 Security Hardening & Enhancements
1. **Protected Admin Access (`/admin`)**:
   - `admin.html` direct access (`/admin.html`) is redirected to `/admin`.
   - The admin panel requires a secure JWT login token to view data or perform management actions.
   - Admin navigation links have been hidden from public visibility.

2. **OWASP Top 10 Protections**:
   - **Content Security Policy (CSP)**: Strict headers via Helmet + `<meta>` CSP tags (restricts untrusted scripts, object-src 'none', frame-ancestors 'none').
   - **XSS & HTML Injection Sanitization**: All user reservation inputs are sanitized server-side and client-side before storage or rendering.
   - **Rate Limiting**: `express-rate-limit` prevents brute-force login attempts (max 5/15m) and reservation spamming (max 5/min).
   - **CSRF Token Guard**: State-changing requests enforce `X-CSRF-Token` headers.
   - **Secure Credentials Management**: Credentials (Gmail App Password & JWT Secrets) are stored securely in `.env` and excluded from version control via `.gitignore`.

---

## 📧 Gmail SMTP Integration
- **Configured Account**: `zero516y@gmail.com`
- **App Password**: `cgzl yvwp kkpm qbod`
- **Functionality**: When a customer submits a table reservation, an HTML email with reservation details and guest call-to-action is automatically dispatched to `zero516y@gmail.com`.
- **Reliability**: Features connection pooling, verification on server boot, exponential back-off retries (up to 3 attempts), and logging to `logs/email.log`.

---

## 🛠️ How to Run the Backend
1. Open terminal in `g:\websiter\backend`.
2. Run `npm install` (already executed).
3. Start the server:
   ```bash
   npm start
   ```
4. Access the application:
   - **Public Website**: `http://localhost:3000`
   - **Protected Admin Panel**: `http://localhost:3000/admin`
   - **Default Admin Credentials**: `admin` / `BrewButterfly@2026`
