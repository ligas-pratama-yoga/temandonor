/**
 * emailService.js — TemanDonor! Email Notification Service
 * Graceful degradation: jika EMAIL_USER tidak diset, log saja tanpa throw error
 */

const nodemailer = require("nodemailer");

let transporter = null;

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(u) {
  try {
    const p = new URL(u);
    return ['http:', 'https:'].includes(p.protocol) ? p.href : null;
  } catch { return null; }
}

function getTransporter() {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS } =
    process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn(
      "[Email] SMTP tidak dikonfigurasi — email tidak akan dikirim.",
    );
    return null;
  }

  // transporter = nodemailer.createTransport({
  //   host: EMAIL_HOST || "smtp.gmail.com",
  //   port: Number(EMAIL_PORT) || 587,
  //   secure: EMAIL_SECURE === "true",
  //   auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  //   tls: { rejectUnauthorized: false },
  //   logger: true,
  //   debug: true
  // });
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST || "smtp.gmail.com",
    port: Number(EMAIL_PORT) || 587,
    secure: EMAIL_SECURE === "true",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    connectionTimeout: 10_000, // 10 detik untuk membuka koneksi
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });
  return transporter;
}

/**
 * Kirim email. Jika SMTP tidak dikonfigurasi, log peringatan tapi tidak throw.
 * @param {object} opts - { to, subject, html, text? }
 * @returns {Promise<boolean>} true jika berhasil, false jika gagal/tidak dikonfigurasi
 */
async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) return false;

  const fromName = process.env.EMAIL_FROM_NAME || "TemanDonor!";
  const fromAddr = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;

  try {
    const info = await t.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to,
      subject,
      text: text || subject,
      html,
    });

    if (info.rejected.length > 0) {
      console.error("[Email] Ditolak:", info.rejected);
      return false;
    }
    console.log(`[Email] Diterima SMTP: ${info.accepted} | ${info.response}`);
    return true;
  } catch (err) {
    console.error(`[Email] Gagal kirim ke ${to}:`, err.message);
    return false;
  }
}

/**
 * Verifikasi koneksi & kredensial SMTP. Tidak pernah throw.
 * @returns {Promise<{ ok: boolean, reason?: string, error?: string }>}
 */
async function verifySmtp() {
  const t = getTransporter();
  if (!t) {
    return { ok: false, reason: 'not_configured' };
  }

  try {
    await t.verify();
    console.log('[Email] ✅ Koneksi SMTP OK — siap mengirim email.');
    return { ok: true };
  } catch (err) {
    // Reset agar percobaan berikutnya membuat transporter baru
    transporter = null;

    const hint = smtpErrorHint(err);
    console.error(`[Email] ❌ Verifikasi SMTP gagal: ${err.message}`);
    if (hint) console.error(`[Email] 💡 ${hint}`);

    return { ok: false, reason: 'verify_failed', error: err.message };
  }
}

function smtpErrorHint(err) {
  switch (err.code) {
    case 'EAUTH':
      return 'Kredensial ditolak. Untuk Gmail, gunakan App Password (wajib 2FA aktif), bukan password akun.';
    case 'ECONNECTION':
    case 'ETIMEDOUT':
    case 'ESOCKET':
      return 'Tidak bisa terhubung. Cek EMAIL_HOST/EMAIL_PORT, firewall, atau coba port 465 dengan EMAIL_SECURE=true.';
    case 'EDNS':
      return 'Hostname SMTP tidak ditemukan. Periksa EMAIL_HOST.';
    default:
      return null;
  }
}
// ─── Template HTML Email ──────────────────────────────────────────────────────

/**
 * Template email untuk notifikasi event donor darah
 */
function templateEventDonor({
  donorName,
  eventName,
  eventDate,
  eventLocation,
  eventDescription,
  pmiName,
}) {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Undangan Event Donor Darah</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#C0392B,#7B241C);padding:32px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">🩸</div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">TemanDonor!</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Platform Donor Darah Terintegrasi</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#4A4A6A;font-size:15px;margin:0 0 20px;">Halo, <strong style="color:#1A1A2E;">${donorName}</strong> 👋</p>
            <p style="color:#4A4A6A;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Kami mengundang Anda untuk berpartisipasi dalam <strong>Event Donor Darah</strong> yang diselenggarakan oleh <strong>${pmiName}</strong>. 
              Satu kantong darah Anda bisa menyelamatkan hingga 3 jiwa!
            </p>
            <!-- Event Card -->
            <div style="background:#FFF5F5;border-left:4px solid #C0392B;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
              <h2 style="color:#C0392B;font-size:17px;margin:0 0 12px;">${eventName}</h2>
              <table cellpadding="0" cellspacing="0">
                <tr><td style="padding:4px 0;color:#9B9BB5;font-size:12px;width:90px;">📅 Tanggal</td>
                    <td style="padding:4px 0;color:#1A1A2E;font-size:13px;font-weight:600;">${eventDate}</td></tr>
                <tr><td style="padding:4px 0;color:#9B9BB5;font-size:12px;">📍 Lokasi</td>
                    <td style="padding:4px 0;color:#1A1A2E;font-size:13px;font-weight:600;">${eventLocation}</td></tr>
                ${
                  eventDescription
                    ? `<tr><td style="padding:4px 0;color:#9B9BB5;font-size:12px;">📋 Info</td>
                    <td style="padding:4px 0;color:#4A4A6A;font-size:13px;">${eventDescription}</td></tr>`
                    : ""
                }
              </table>
            </div>
            <!-- CTA Button -->
            <div style="text-align:center;margin:28px 0;">
              <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/events"
                 style="background:#C0392B;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:700;display:inline-block;">
                Daftar Sekarang →
              </a>
            </div>
            <p style="color:#9B9BB5;font-size:12px;text-align:center;line-height:1.7;margin:0;">
              Jika Anda tidak merasa mendaftar di platform ini, abaikan email ini.<br/>
              Hubungi kami: <a href="mailto:support@oneblood.id" style="color:#C0392B;">support@oneblood.id</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F7F7FB;padding:20px 40px;text-align:center;">
            <p style="color:#9B9BB5;font-size:11px;margin:0;">
              © 2026 TemanDonor! · Sistem Manajemen Donor Darah Indonesia<br/>
              Email ini dikirim oleh ${pmiName}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Template email untuk kebutuhan darah mendesak dari pasien
 */
function templateBloodNeed({
  donorName,
  patientName,
  bloodType,
  hospital,
  urgencyNote,
  pmiName,
  qty,
}) {
  const isUrgent = urgencyNote?.toLowerCase().includes("darurat");
  return `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Permintaan Donor Darah Darurat</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${isUrgent ? "#8B0000,#C0392B" : "#C0392B,#7B241C"});padding:32px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">${isUrgent ? "🚨" : "🩸"}</div>
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">
              ${isUrgent ? "KEBUTUHAN DARAH MENDESAK" : "Permintaan Donor Darah"}
            </h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">TemanDonor! — Platform Donor Darah</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#4A4A6A;font-size:15px;margin:0 0 16px;">Halo, <strong style="color:#1A1A2E;">${donorName}</strong> 👋</p>
            <p style="color:#4A4A6A;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Saat ini ada pasien yang sangat membutuhkan bantuan darah <strong style="color:#C0392B;">golongan ${bloodType}</strong>. 
              Golongan darah Anda sesuai dan Anda dipilih sebagai kandidat donor potensial.
            </p>
            <!-- Info Pasien -->
            <div style="background:#FFF5F5;border-left:4px solid #C0392B;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
              <h3 style="color:#C0392B;font-size:15px;margin:0 0 12px;">Detail Kebutuhan</h3>
              <table cellpadding="0" cellspacing="0">
                <tr><td style="padding:4px 0;color:#9B9BB5;font-size:12px;width:100px;">🩸 Golongan</td>
                    <td style="padding:4px 0;"><span style="background:#C0392B;color:#fff;padding:2px 10px;border-radius:20px;font-size:13px;font-weight:700;">${bloodType}</span></td></tr>
                <tr><td style="padding:4px 0;color:#9B9BB5;font-size:12px;">📦 Jumlah</td>
                    <td style="padding:4px 0;color:#1A1A2E;font-size:13px;font-weight:600;">${qty || "1-2"} kantong</td></tr>
                ${
                  patientName
                    ? `<tr><td style="padding:4px 0;color:#9B9BB5;font-size:12px;">👤 Pasien</td>
                    <td style="padding:4px 0;color:#1A1A2E;font-size:13px;">${patientName}</td></tr>`
                    : ""
                }
                <tr><td style="padding:4px 0;color:#9B9BB5;font-size:12px;">🏥 Lokasi</td>
                    <td style="padding:4px 0;color:#1A1A2E;font-size:13px;font-weight:600;">${hospital}</td></tr>
                ${
                  urgencyNote
                    ? `<tr><td style="padding:4px 0;color:#9B9BB5;font-size:12px;">⚠️ Info</td>
                    <td style="padding:4px 0;color:#E67E22;font-size:13px;">${urgencyNote}</td></tr>`
                    : ""
                }
              </table>
            </div>
            <div style="text-align:center;margin:28px 0;">
              <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard/donor"
                 style="background:#C0392B;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:700;display:inline-block;">
                Saya Siap Donor →
              </a>
            </div>
            <p style="color:#9B9BB5;font-size:12px;text-align:center;line-height:1.7;margin:0;">
              Hubungi ${pmiName} untuk info lebih lanjut.<br/>
              <a href="mailto:support@oneblood.id" style="color:#C0392B;">support@oneblood.id</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F7F7FB;padding:20px 40px;text-align:center;">
            <p style="color:#9B9BB5;font-size:11px;margin:0;">
              © 2026 TemanDonor! · Pesan ini dikirim oleh ${pmiName}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Template email notifikasi jadwal donor (reminder)
 */
function templateScheduleReminder({
  donorName,
  eventName,
  eventDate,
  eventLocation,
  daysUntil,
}) {
  return `
<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/><title>Pengingat Jadwal Donor</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1A5276,#2980B9);padding:32px 40px;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">📅</div>
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Pengingat Jadwal Donor Darah</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">TemanDonor!</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:#4A4A6A;font-size:15px;margin:0 0 16px;">Halo, <strong style="color:#1A1A2E;">${donorName}</strong> 👋</p>
          <div style="background:#EAF7FB;border-left:4px solid #2980B9;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
            <p style="color:#1A5276;font-size:14px;font-weight:700;margin:0 0 8px;">
              ⏰ ${daysUntil === 0 ? "Event donor HARI INI!" : `Event donor ${daysUntil} hari lagi`}
            </p>
            <h3 style="color:#1A1A2E;font-size:15px;margin:0 0 10px;">${eventName}</h3>
            <p style="color:#4A4A6A;font-size:13px;margin:0;">📅 ${eventDate} · 📍 ${eventLocation}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/alur"
               style="background:#2980B9;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:14px;font-weight:700;display:inline-block;">
              Lihat Tiket QR Saya →
            </a>
          </div>
          <p style="color:#9B9BB5;font-size:12px;text-align:center;">Pastikan Anda sudah beristirahat cukup dan makan sebelum donor. 💪</p>
        </td></tr>
        <tr><td style="background:#F7F7FB;padding:16px 40px;text-align:center;">
          <p style="color:#9B9BB5;font-size:11px;margin:0;">© 2026 TemanDonor!</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Template email pesan custom dari PMI ke donor
 */
function templateCustomMessage({
  donorName,
  title,
  message,
  pmiName,
  ctaUrl,
  ctaLabel,
}) {
  return `
<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/><title>${title}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#C0392B,#7B241C);padding:32px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🩸</div>
          <h1 style="color:#fff;margin:0;font-size:18px;font-weight:700;">TemanDonor!</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:12px;">${pmiName}</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:#4A4A6A;font-size:15px;margin:0 0 16px;">Halo, <strong style="color:#1A1A2E;">${donorName}</strong> 👋</p>
          <h2 style="color:#1A1A2E;font-size:17px;margin:0 0 16px;">${title}</h2>
          <div style="background:#F7F7FB;border-radius:8px;padding:20px;margin-bottom:24px;color:#4A4A6A;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</div>
          ${
            ctaUrl
              ? `<div style="text-align:center;margin:24px 0;">
            <a href="${ctaUrl}" style="background:#C0392B;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:14px;font-weight:700;display:inline-block;">
              ${ctaLabel || "Buka Aplikasi →"}
            </a>
          </div>`
              : ""
          }
          <p style="color:#9B9BB5;font-size:12px;text-align:center;">Email ini dikirim oleh ${pmiName} melalui platform TemanDonor!</p>
        </td></tr>
        <tr><td style="background:#F7F7FB;padding:16px 40px;text-align:center;">
          <p style="color:#9B9BB5;font-size:11px;margin:0;">© 2026 TemanDonor!</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function templateLoginNotice({ donorName, loginTime, device, ip }) {
  return `
<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/><title>Login Baru</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#C0392B;padding:28px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:18px;">🔐 Login Baru Terdeteksi</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;color:#4A4A6A;font-size:14px;line-height:1.7;">
          <p>Halo, <strong>${esc(donorName)}</strong>,</p>
          <p>Akun TemanDonor! Anda baru saja dipakai login dari perangkat baru:</p>
          <ul>
            <li>Waktu: ${esc(loginTime)}</li>
            <li>Perangkat: ${esc(device)}</li>
            <li>Alamat IP: ${esc(ip)}</li>
          </ul>
          <p>Jika ini Anda, abaikan email ini. Jika bukan, segera ganti password Anda.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = {
  sendEmail,
  verifySmtp,
  templateLoginNotice,
  templateEventDonor,
  templateBloodNeed,
  templateScheduleReminder,
  templateCustomMessage,
};
