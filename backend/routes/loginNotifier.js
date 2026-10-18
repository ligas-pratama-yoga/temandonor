const crypto = require('crypto');
const pool = require('../db.js');
const { sendEmail, templateLoginNotice } = require('../utils/emailService.js');

// Mengembalikan true jika perangkat ini baru untuk user tersebut
async function trackDevice(userId, req) {
  const ua = req.headers['user-agent'] || 'unknown';
  const fingerprint = crypto.createHash('sha256').update(ua).digest('hex');

  const [result] = await pool.query(
    `INSERT INTO login_devices (user_id, fingerprint, ip_address)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE ip_address = VALUES(ip_address)`,
    [userId, fingerprint, req.ip]
  );
  // MySQL: affectedRows 1 = baris baru, 2 = baris lama diperbarui
  return result.affectedRows === 1;
}

async function notifyIfNewDevice(user, req) {
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM login_devices WHERE user_id = ?', [user.id]
  );
  const isNew = await trackDevice(user.id, req);

  // total === 0 berarti login pertama: cukup catat, jangan kirim peringatan
  if (!isNew || total === 0) return;

  await sendEmail({
    to: user.email,
    subject: 'Login baru ke akun TemanDonor! Anda',
    html: templateLoginNotice({
      donorName: user.name,
      loginTime: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      device: (req.headers['user-agent'] || 'unknown').slice(0, 120),
      ip: req.ip,
    }),
  });
}

module.exports = { notifyIfNewDevice };
