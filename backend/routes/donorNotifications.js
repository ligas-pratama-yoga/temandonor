/**
 * donorNotifications.js — Route khusus pengiriman notifikasi & pesan ke pendonor
 * 
 * Endpoint:
 *   POST /api/donor-notify/send            — kirim notif in-app + email ke donor
 *   POST /api/donor-notify/event-invite    — undangan event donor
 *   POST /api/donor-notify/blood-need      — kebutuhan darah mendesak
 *   POST /api/donor-notify/schedule-remind — pengingat jadwal
 *   GET  /api/donor-notify/messages        — ambil pesan masuk (untuk donor)
 *   GET  /api/donor-notify/unread-count    — jumlah pesan belum dibaca
 *   PUT  /api/donor-notify/messages/:id/read — tandai pesan dibaca
 *   PUT  /api/donor-notify/messages/read-all — tandai semua dibaca
 *   DELETE /api/donor-notify/messages/:id  — hapus pesan
 *   GET  /api/donor-notify/sent-history    — riwayat pengiriman (untuk PMI)
 *   GET  /api/donor-notify/events          — list event untuk dropdown
 *   GET  /api/donor-notify/simulated-emails — ambil email yang terkirim ke donor
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  sendEmail,
  templateEventDonor,
  templateBloodNeed,
  templateScheduleReminder,
  templateCustomMessage,
} = require('../utils/emailService');

// ─── In-Memory Store (Resilient Fallback saat MySQL offline/testing) ───────────
const inMemoryStore = {
  messages: [
    {
      id: 101,
      sender_id: 'pmi-1',
      sender_name: 'Admin PMI Pusat',
      sender_org: 'PMI Pusat Kota',
      type: 'schedule_remind',
      target_type: 'all',
      target_blood_type: null,
      recipient_id: null,
      title: '⏰ Pengingat Jadwal: Waktunya Donor Darah Rutin!',
      message: 'Halo Pendonor! Sudah 60 hari sejak donasi darah terakhir Anda. Tubuh Anda telah siap untuk mendonorkan darah kembali dan menyelamatkan 3 jiwa sesama.',
      event_id: 1,
      blood_type: 'Semua',
      qty: null,
      hospital: null,
      urgency_note: 'Rutin setiap 60-90 hari',
      cta_url: '/events',
      cta_label: 'Lihat Jadwal Donor Terdekat',
      read_status: 0,
      email_sent: 1,
      email_count: 4,
      in_app_count: 4,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 102,
      sender_id: 'pmi-1',
      sender_name: 'Admin PMI Pusat',
      sender_org: 'PMI Kota Bandung',
      type: 'event_invite',
      target_type: 'all',
      target_blood_type: null,
      recipient_id: null,
      title: '📅 Undangan Event: Donor Darah Akbar Peduli Sesama',
      message: 'PMI mengundang Anda menghadiri event donor darah akbar akhir pekan ini di Gedung Serbaguna PMI. Tersedia pemeriksaan kesehatan gratis, goodie bag, dan sertifikat digital.',
      event_id: 2,
      blood_type: null,
      qty: 150,
      hospital: 'Gedung Serbaguna PMI, Jl. Palang Merah No. 10',
      urgency_note: 'Sabtu & Minggu, Pukul 08:00 - 15:00 WIB',
      cta_url: '/events',
      cta_label: 'Daftar Event Ini',
      read_status: 0,
      email_sent: 1,
      email_count: 4,
      in_app_count: 4,
      created_at: new Date(Date.now() - 3600000 * 8).toISOString()
    },
    {
      id: 103,
      sender_id: 'pmi-1',
      sender_name: 'Unit Transfusi Darah',
      sender_org: 'PMI & RS Hasan Sadikin',
      type: 'blood_need',
      target_type: 'blood_type',
      target_blood_type: 'O+',
      recipient_id: null,
      title: '🚨 KEBUTUHAN DARAH MENDESAK: Golongan O+',
      message: 'Pasien operasi darurat (An. Rahman, Ruang ICU) di RS Hasan Sadikin membutuhkan 3 kantong darah golongan O+ segera dalam 24 jam.',
      event_id: null,
      blood_type: 'O+',
      qty: 3,
      hospital: 'RS Hasan Sadikin Bandung - Gedung IGD Bedah',
      urgency_note: 'Kondisi CITO / Darurat Mendesak 24 Jam',
      cta_url: '/dashboard/donor',
      cta_label: 'Saya Siap Mendonor Sekarang',
      read_status: 0,
      email_sent: 1,
      email_count: 2,
      in_app_count: 2,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ],
  recipients: [
    { id: 1, message_id: 101, donor_id: 'donor', donor_email: 'donor@bloodlink.id', donor_name: 'Pendonor', email_sent: 1, in_app_sent: 1, read_status: 0 },
    { id: 2, message_id: 102, donor_id: 'donor', donor_email: 'donor@bloodlink.id', donor_name: 'Pendonor', email_sent: 1, in_app_sent: 1, read_status: 0 },
    { id: 3, message_id: 103, donor_id: 'donor', donor_email: 'donor@bloodlink.id', donor_name: 'Pendonor', email_sent: 1, in_app_sent: 1, read_status: 0 },
  ],
  emails: [
    {
      id: 'em-1',
      to: 'donor@bloodlink.id',
      donorName: 'Pendonor',
      subject: '[TemanDonor!] ⏰ Pengingat Jadwal: Waktunya Donor Darah Rutin!',
      type: 'schedule_remind',
      sentAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      html: templateScheduleReminder({
        donorName: 'Pendonor Peduli',
        eventName: 'Donor Rutin PMI Kota',
        eventDate: 'Hari Ini & Setiap Hari Kerja (08:00 - 16:00 WIB)',
        eventLocation: 'Gedung Unit Transfusi Darah PMI',
        daysUntil: 0
      })
    },
    {
      id: 'em-2',
      to: 'donor@bloodlink.id',
      donorName: 'Pendonor',
      subject: '[TemanDonor!] 📅 Undangan Event: Donor Darah Akbar Peduli Sesama',
      type: 'event_invite',
      sentAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      html: templateEventDonor({
        donorName: 'Pendonor Peduli',
        eventName: 'Aksi Donor Darah Akbar Peduli Sesama',
        eventDate: 'Sabtu, 25 Oktober 2026',
        eventLocation: 'Gedung Serbaguna PMI, Jl. Palang Merah No. 10',
        eventDescription: 'Pemeriksaan kesehatan gratis, goodie bag, dan doorprize bagi pendonor.',
        pmiName: 'PMI Kota'
      })
    },
    {
      id: 'em-3',
      to: 'donor@bloodlink.id',
      donorName: 'Pendonor',
      subject: '[URGENT] 🚨 Kebutuhan Darah O+ Mendesak - RS Hasan Sadikin',
      type: 'blood_need',
      sentAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      html: templateBloodNeed({
        donorName: 'Pendonor Peduli',
        patientName: 'An. Rahman (ICU)',
        bloodType: 'O+',
        hospital: 'RS Hasan Sadikin Bandung',
        urgencyNote: 'Kondisi CITO / Darurat Mendesak 24 Jam',
        pmiName: 'PMI Kota Bandung',
        qty: 3
      })
    }
  ]
};

// ─── Inisialisasi tabel donor_messages jika belum ada ────────────────────────
async function ensureDonorMessageTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS donor_messages (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        sender_id    VARCHAR(60) NOT NULL,
        sender_name  VARCHAR(150),
        sender_org   VARCHAR(150),
        type         ENUM('event_invite','blood_need','schedule_remind','custom','announcement') NOT NULL DEFAULT 'custom',
        target_type  ENUM('all','blood_type','specific') NOT NULL DEFAULT 'all',
        target_blood_type VARCHAR(15),
        recipient_id VARCHAR(60),
        title        VARCHAR(255) NOT NULL,
        message      TEXT NOT NULL,
        event_id     INT,
        blood_type   VARCHAR(15),
        qty          INT,
        hospital     VARCHAR(255),
        urgency_note TEXT,
        cta_url      VARCHAR(500),
        cta_label    VARCHAR(100),
        read_status  TINYINT(1) NOT NULL DEFAULT 0,
        email_sent   TINYINT(1) NOT NULL DEFAULT 0,
        email_count  INT NOT NULL DEFAULT 0,
        in_app_count INT NOT NULL DEFAULT 0,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_recipient (recipient_id),
        INDEX idx_sender (sender_id),
        INDEX idx_type (type),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS donor_message_recipients (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        message_id   INT NOT NULL,
        donor_id     VARCHAR(60) NOT NULL,
        donor_email  VARCHAR(255),
        donor_name   VARCHAR(150),
        email_sent   TINYINT(1) DEFAULT 0,
        in_app_sent  TINYINT(1) DEFAULT 0,
        read_status  TINYINT(1) DEFAULT 0,
        sent_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_msg (message_id),
        INDEX idx_donor (donor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e) {
    console.warn('[donor-notify] ensure tables skipped (using in-memory fallback):', e.message);
  }
}

ensureDonorMessageTables();

// ─── Helper: ambil daftar donor berdasarkan target ────────────────────────────
async function getDonorTargets({ targetType, targetBloodType, specificDonorId }) {
  try {
    let query = `
      SELECT u.id, u.email, u.name, dp.blood_type
      FROM users u
      LEFT JOIN donor_profiles dp ON dp.user_id = u.id
      WHERE u.role = 'donor'
    `;
    const params = [];

    if (targetType === 'blood_type' && targetBloodType && targetBloodType !== 'Semua') {
      query += ' AND (dp.blood_type = ? OR dp.blood_type IS NULL)';
      params.push(targetBloodType);
    } else if (targetType === 'specific' && specificDonorId) {
      query += ' AND u.id = ?';
      params.push(specificDonorId);
    }

    const [rows] = await pool.query(query, params);
    if (rows && rows.length > 0) return rows;
  } catch (e) {
    // Fallback in-memory
  }

  // Fallback demo donors
  const fallbackDonors = [
    { id: 'donor-1', name: 'Budi Santoso', email: 'budi.santoso@gmail.com', blood_type: 'O+' },
    { id: 'donor-2', name: 'Siti Aminah', email: 'siti.aminah@gmail.com', blood_type: 'A+' },
    { id: 'donor-3', name: 'Rian Hidayat', email: 'rian.hidayat@yahoo.com', blood_type: 'B+' },
    { id: 'donor-4', name: 'Dewi Lestari', email: 'dewi.lestari@gmail.com', blood_type: 'AB+' },
    { id: 'donor', name: 'Pendonor Aktif', email: 'donor@bloodlink.id', blood_type: 'O+' },
  ];

  if (targetType === 'blood_type' && targetBloodType && targetBloodType !== 'Semua') {
    const filtered = fallbackDonors.filter(d => d.blood_type.toLowerCase() === targetBloodType.toLowerCase());
    return filtered.length > 0 ? filtered : fallbackDonors;
  }
  if (targetType === 'specific' && specificDonorId) {
    const found = fallbackDonors.filter(d => String(d.id) === String(specificDonorId));
    return found.length > 0 ? found : [fallbackDonors[0]];
  }

  return fallbackDonors;
}

// ─── POST /api/donor-notify/send ─────────────────────────────────────────────
// Kirim pesan custom (notif in-app + email)
router.post('/send', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  const {
    target_type = 'all',
    target_blood_type,
    recipient_id,
    title,
    message,
    type = 'custom',
    send_email = false,
    blood_type,
    qty,
    hospital,
    urgency_note,
    event_id,
    cta_url,
    cta_label,
  } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'title dan message wajib diisi' });
  }

  const senderId = req.user.id || 'pmi-1';
  const senderName = req.user.name || req.user.email || 'Admin PMI';
  const senderOrg = req.user.org || senderName || 'PMI Kota';

  try {
    const donors = await getDonorTargets({ targetType: target_type, targetBloodType: target_blood_type, specificDonorId: recipient_id });
    const messageId = Date.now();
    let inAppCount = donors.length;
    let emailCount = send_email ? donors.length : 0;

    // Database attempt
    try {
      const [msgResult] = await pool.query(`
        INSERT INTO donor_messages
          (sender_id, sender_name, sender_org, type, target_type, target_blood_type, recipient_id, title, message,
           event_id, blood_type, qty, hospital, urgency_note, cta_url, cta_label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        senderId, senderName, senderOrg, type,
        target_type, target_blood_type || null, recipient_id || null,
        title, message, event_id || null, blood_type || null,
        qty || null, hospital || null, urgency_note || null,
        cta_url || null, cta_label || null,
      ]);

      const dbMessageId = msgResult.insertId;
      for (const donor of donors) {
        const notifId = 'N-' + Date.now() + '-' + String(donor.id).slice(-4) + Math.floor(Math.random() * 100);
        await pool.query(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`,
          [notifId, donor.id, type || 'info', title, message]).catch(() => {});
        await pool.query(`INSERT INTO donor_message_recipients (message_id, donor_id, donor_email, donor_name, email_sent, in_app_sent) VALUES (?, ?, ?, ?, ?, 1)`,
          [dbMessageId, donor.id, donor.email || null, donor.name, send_email && donor.email ? 1 : 0]).catch(() => {});
      }
    } catch (dbErr) {
      console.warn('[donor-notify] MySQL offline, using memory store');
    }

    // Always sync to inMemoryStore
    const newMsg = {
      id: messageId,
      sender_id: senderId,
      sender_name: senderName,
      sender_org: senderOrg,
      type,
      target_type,
      target_blood_type: target_blood_type || null,
      recipient_id: recipient_id || null,
      title,
      message,
      event_id: event_id || null,
      blood_type: blood_type || null,
      qty: qty || null,
      hospital: hospital || null,
      urgency_note: urgency_note || null,
      cta_url: cta_url || null,
      cta_label: cta_label || null,
      read_status: 0,
      email_sent: send_email ? 1 : 0,
      email_count: emailCount,
      in_app_count: inAppCount,
      created_at: new Date().toISOString()
    };
    inMemoryStore.messages.unshift(newMsg);

    // Kirim & Simpan Email
    for (const donor of donors) {
      inMemoryStore.recipients.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        message_id: messageId,
        donor_id: donor.id,
        donor_email: donor.email,
        donor_name: donor.name,
        email_sent: send_email ? 1 : 0,
        in_app_sent: 1,
        read_status: 0
      });

      if (send_email && donor.email) {
        const html = templateCustomMessage({
          donorName: donor.name,
          title,
          message,
          pmiName: senderOrg,
          ctaUrl: cta_url,
          ctaLabel: cta_label,
        });

        // Record simulated email
        inMemoryStore.emails.unshift({
          id: 'em-' + Date.now() + '-' + Math.floor(Math.random() * 100),
          to: donor.email,
          donorName: donor.name,
          subject: `[TemanDonor!] ${title}`,
          type,
          sentAt: new Date().toISOString(),
          html
        });

        sendEmail({ to: donor.email, subject: `[TemanDonor!] ${title}`, html }).catch(() => {});
      }
    }

    res.json({
      success: true,
      message_id: messageId,
      donors_targeted: donors.length,
      in_app_sent: inAppCount,
      email_sent: emailCount,
      message: `Notifikasi berhasil dikirim ke ${inAppCount} pendonor${send_email ? `, ${emailCount} email terkirim` : ''}`,
    });
  } catch (err) {
    console.error('[donor-notify] Error send:', err);
    res.status(500).json({ error: 'Gagal mengirim notifikasi: ' + err.message });
  }
});

// ─── POST /api/donor-notify/event-invite ─────────────────────────────────────
router.post('/event-invite', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  const { event_id, target_blood_type, send_email = true } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id wajib diisi' });

  const senderOrg = req.user.org || req.user.name || 'PMI Kota';
  const senderId = req.user.id || 'pmi-1';

  try {
    let eventName = 'Event Donor Darah Rutin';
    let eventDateStr = 'Minggu, 26 Oktober 2026';
    let eventLocation = 'Gedung Unit Transfusi Darah PMI';
    let eventDesc = 'Mari donorkan darah Anda untuk membantu sesama.';

    try {
      const [[event]] = await pool.query('SELECT * FROM events WHERE id = ?', [event_id]);
      if (event) {
        eventName = event.name;
        eventDateStr = new Date(event.event_date || event.date).toLocaleDateString('id-ID', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
        eventLocation = event.location;
        eventDesc = event.description || eventDesc;
      }
    } catch {}

    const title = `📅 Undangan Event Donor: ${eventName}`;
    const msgBody = `Anda diundang untuk berpartisipasi dalam event donor darah "${eventName}" yang akan diselenggarakan pada ${eventDateStr} di ${eventLocation}. Setiap tetes darah Anda sangat berarti!`;

    const donors = await getDonorTargets({
      targetType: target_blood_type && target_blood_type !== 'Semua' ? 'blood_type' : 'all',
      targetBloodType: target_blood_type,
    });

    const messageId = Date.now();
    const newMsg = {
      id: messageId,
      sender_id: senderId,
      sender_name: req.user.name || 'Admin PMI',
      sender_org: senderOrg,
      type: 'event_invite',
      target_type: target_blood_type ? 'blood_type' : 'all',
      target_blood_type: target_blood_type || null,
      recipient_id: null,
      title,
      message: msgBody,
      event_id,
      blood_type: target_blood_type || null,
      hospital: eventLocation,
      urgency_note: eventDateStr,
      cta_url: '/events',
      cta_label: 'Daftar Event Sekarang',
      read_status: 0,
      email_sent: send_email ? 1 : 0,
      email_count: send_email ? donors.length : 0,
      in_app_count: donors.length,
      created_at: new Date().toISOString()
    };
    inMemoryStore.messages.unshift(newMsg);

    for (const donor of donors) {
      inMemoryStore.recipients.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        message_id: messageId,
        donor_id: donor.id,
        donor_email: donor.email,
        donor_name: donor.name,
        email_sent: send_email ? 1 : 0,
        in_app_sent: 1,
        read_status: 0
      });

      if (send_email && donor.email) {
        const html = templateEventDonor({
          donorName: donor.name,
          eventName,
          eventDate: eventDateStr,
          eventLocation,
          eventDescription: eventDesc,
          pmiName: senderOrg,
        });

        inMemoryStore.emails.unshift({
          id: 'em-' + Date.now() + '-' + Math.floor(Math.random() * 100),
          to: donor.email,
          donorName: donor.name,
          subject: `[TemanDonor!] ${title}`,
          type: 'event_invite',
          sentAt: new Date().toISOString(),
          html
        });

        sendEmail({ to: donor.email, subject: `[TemanDonor!] ${title}`, html }).catch(() => {});
      }
    }

    res.json({
      success: true,
      donors_targeted: donors.length,
      in_app_sent: donors.length,
      email_sent: send_email ? donors.length : 0,
      message: `Undangan event berhasil dikirim ke ${donors.length} pendonor`
    });
  } catch (err) {
    console.error('[donor-notify] event-invite error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/donor-notify/blood-need ───────────────────────────────────────
router.post('/blood-need', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  const {
    blood_type, qty = 1, patient_name, hospital,
    urgency_note, send_email = true
  } = req.body;

  if (!blood_type) return res.status(400).json({ error: 'blood_type wajib diisi' });

  const senderOrg = req.user.org || req.user.name || 'PMI & Unit Transfusi Darah';
  const senderId = req.user.id || 'pmi-1';
  const title = `🚨 KEBUTUHAN DARAH MENDESAK: Golongan ${blood_type}!`;
  const msgBody = `Dibutuhkan segera ${qty} kantong darah golongan ${blood_type} untuk pasien ${patient_name || 'darurat'} di ${hospital || 'Rumah Sakit'}. ${urgency_note ? `Catatan: ${urgency_note}` : ''}`;

  try {
    const donors = await getDonorTargets({ targetType: 'blood_type', targetBloodType: blood_type });
    const messageId = Date.now();

    const newMsg = {
      id: messageId,
      sender_id: senderId,
      sender_name: req.user.name || 'Admin PMI',
      sender_org: senderOrg,
      type: 'blood_need',
      target_type: 'blood_type',
      target_blood_type: blood_type,
      recipient_id: null,
      title,
      message: msgBody,
      event_id: null,
      blood_type,
      qty,
      hospital: hospital || 'Rumah Sakit Terdekat',
      urgency_note: urgency_note || 'CITO / Mendesak 24 Jam',
      cta_url: '/dashboard/donor',
      cta_label: 'Saya Siap Mendonor',
      read_status: 0,
      email_sent: send_email ? 1 : 0,
      email_count: send_email ? donors.length : 0,
      in_app_count: donors.length,
      created_at: new Date().toISOString()
    };
    inMemoryStore.messages.unshift(newMsg);

    for (const donor of donors) {
      inMemoryStore.recipients.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        message_id: messageId,
        donor_id: donor.id,
        donor_email: donor.email,
        donor_name: donor.name,
        email_sent: send_email ? 1 : 0,
        in_app_sent: 1,
        read_status: 0
      });

      if (send_email && donor.email) {
        const html = templateBloodNeed({
          donorName: donor.name,
          patientName: patient_name,
          bloodType: blood_type,
          hospital: hospital || 'RS Terdekat',
          urgencyNote: urgency_note || 'CITO / Sangat Mendesak',
          pmiName: senderOrg,
          qty,
        });

        inMemoryStore.emails.unshift({
          id: 'em-' + Date.now() + '-' + Math.floor(Math.random() * 100),
          to: donor.email,
          donorName: donor.name,
          subject: `[URGENT] ${title}`,
          type: 'blood_need',
          sentAt: new Date().toISOString(),
          html
        });

        sendEmail({ to: donor.email, subject: `[URGENT] ${title}`, html }).catch(() => {});
      }
    }

    res.json({
      success: true,
      donors_targeted: donors.length,
      in_app_sent: donors.length,
      email_sent: send_email ? donors.length : 0,
      message: `Panggilan darurat darah ${blood_type} berhasil disebarkan ke ${donors.length} pendonor`
    });
  } catch (err) {
    console.error('[donor-notify] blood-need error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/donor-notify/schedule-remind ──────────────────────────────────
router.post('/schedule-remind', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  const { event_id, days_before = 1, send_email = true, target_type = 'all', target_blood_type } = req.body;
  const senderOrg = req.user.org || req.user.name || 'PMI Kota';
  const senderId = req.user.id || 'pmi-1';

  try {
    const donors = await getDonorTargets({ targetType: target_blood_type ? 'blood_type' : target_type, targetBloodType: target_blood_type });
    const messageId = Date.now();
    const title = days_before === 0
      ? `⏰ Hari Ini: Waktunya Donor Darah Rutin Anda!`
      : `⏰ Pengingat: ${days_before} Hari Menjelang Jadwal Donor Darah Anda`;
    const msgBody = `Halo Pendonor! Jadwal donor darah rutin Anda sudah tiba. Pastikan Anda istirahat cukup, minum air putih, dan datang ke Unit Donor Darah PMI terdekat untuk mendonorkan darah Anda.`;

    const newMsg = {
      id: messageId,
      sender_id: senderId,
      sender_name: req.user.name || 'Admin PMI',
      sender_org: senderOrg,
      type: 'schedule_remind',
      target_type: target_blood_type ? 'blood_type' : target_type,
      target_blood_type: target_blood_type || null,
      recipient_id: null,
      title,
      message: msgBody,
      event_id: event_id || null,
      blood_type: target_blood_type || null,
      hospital: 'Unit Donor Darah PMI',
      urgency_note: 'Rutin Setiap 60 Hari',
      cta_url: '/events',
      cta_label: 'Lihat Lokasi & Reservasi',
      read_status: 0,
      email_sent: send_email ? 1 : 0,
      email_count: send_email ? donors.length : 0,
      in_app_count: donors.length,
      created_at: new Date().toISOString()
    };
    inMemoryStore.messages.unshift(newMsg);

    for (const donor of donors) {
      inMemoryStore.recipients.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        message_id: messageId,
        donor_id: donor.id,
        donor_email: donor.email,
        donor_name: donor.name,
        email_sent: send_email ? 1 : 0,
        in_app_sent: 1,
        read_status: 0
      });

      if (send_email && donor.email) {
        const html = templateScheduleReminder({
          donorName: donor.name,
          eventName: 'Donor Darah Rutin 60 Hari',
          eventDate: days_before === 0 ? 'Hari Ini (08:00 - 17:00)' : `${days_before} Hari Lagi`,
          eventLocation: 'Unit Transfusi Darah PMI Terdekat',
          daysUntil: days_before,
        });

        inMemoryStore.emails.unshift({
          id: 'em-' + Date.now() + '-' + Math.floor(Math.random() * 100),
          to: donor.email,
          donorName: donor.name,
          subject: `[TemanDonor!] ${title}`,
          type: 'schedule_remind',
          sentAt: new Date().toISOString(),
          html
        });

        sendEmail({ to: donor.email, subject: `[TemanDonor!] ${title}`, html }).catch(() => {});
      }
    }

    res.json({
      success: true,
      donors_targeted: donors.length,
      in_app_sent: donors.length,
      email_sent: send_email ? donors.length : 0,
      message: `Pengingat jadwal berhasil dikirim ke ${donors.length} pendonor`
    });
  } catch (err) {
    console.error('[donor-notify] schedule-remind error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/donor-notify/messages ──────────────────────────────────────────
// Ambil pesan masuk untuk pendonor
router.get('/messages', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(`
      SELECT dm.id, dm.type, dm.title, dm.message, dm.sender_name, dm.sender_org,
             dm.blood_type, dm.qty, dm.hospital, dm.urgency_note,
             dm.event_id, dm.cta_url, dm.cta_label, dm.created_at,
             COALESCE(dmr.read_status, 0) AS read_status
      FROM donor_messages dm
      JOIN donor_message_recipients dmr ON dmr.message_id = dm.id AND dmr.donor_id = ?
      ORDER BY dm.created_at DESC
      LIMIT 50
    `, [userId]);

    if (rows && rows.length > 0) {
      return res.json({ messages: rows, total: rows.length });
    }
  } catch {}

  // Fallback in-memory
  const userRole = req.user.role;
  if (userRole === 'donor' || true) {
    return res.json({ messages: inMemoryStore.messages, total: inMemoryStore.messages.length });
  }
  res.json({ messages: [], total: 0 });
});

// ─── GET /api/donor-notify/unread-count ──────────────────────────────────────
router.get('/unread-count', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const [[row]] = await pool.query(`
      SELECT COUNT(*) as count
      FROM donor_message_recipients dmr
      WHERE dmr.donor_id = ? AND dmr.read_status = 0
    `, [userId]);
    if (row) return res.json({ count: row.count });
  } catch {}

  const unread = inMemoryStore.messages.filter(m => !m.read_status).length;
  res.json({ count: unread });
});

// ─── PUT /api/donor-notify/messages/:id/read ─────────────────────────────────
router.put('/messages/:id/read', authMiddleware, async (req, res) => {
  const msgId = Number(req.params.id) || req.params.id;
  const userId = req.user.id;
  try {
    await pool.query(
      'UPDATE donor_message_recipients SET read_status = 1 WHERE message_id = ? AND donor_id = ?',
      [msgId, userId]
    );
  } catch {}

  const item = inMemoryStore.messages.find(m => m.id === msgId);
  if (item) item.read_status = 1;
  const recip = inMemoryStore.recipients.find(r => r.message_id === msgId);
  if (recip) recip.read_status = 1;

  res.json({ success: true });
});

// ─── PUT /api/donor-notify/messages/read-all ─────────────────────────────────
router.put('/messages/read-all', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    await pool.query('UPDATE donor_message_recipients SET read_status = 1 WHERE donor_id = ?', [userId]);
  } catch {}

  inMemoryStore.messages.forEach(m => { m.read_status = 1; });
  inMemoryStore.recipients.forEach(r => { r.read_status = 1; });
  res.json({ success: true });
});

// ─── DELETE /api/donor-notify/messages/:id ───────────────────────────────────
router.delete('/messages/:id', authMiddleware, async (req, res) => {
  const msgId = Number(req.params.id) || req.params.id;
  const userId = req.user.id;
  try {
    await pool.query('DELETE FROM donor_message_recipients WHERE message_id = ? AND donor_id = ?', [msgId, userId]);
  } catch {}

  inMemoryStore.messages = inMemoryStore.messages.filter(m => m.id !== msgId);
  inMemoryStore.recipients = inMemoryStore.recipients.filter(r => r.message_id !== msgId);
  res.json({ success: true });
});

// ─── GET /api/donor-notify/sent-history ──────────────────────────────────────
router.get('/sent-history', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, type, target_type, target_blood_type, title, message,
             in_app_count, email_count, email_sent, created_at
      FROM donor_messages
      ORDER BY created_at DESC
      LIMIT 50
    `);
    if (rows && rows.length > 0) return res.json({ history: rows });
  } catch {}

  res.json({ history: inMemoryStore.messages });
});

// ─── GET /api/donor-notify/events ────────────────────────────────────────────
router.get('/events', authMiddleware, requireRole('pmi', 'superadmin'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, event_date, location, status
      FROM events
      ORDER BY event_date ASC
      LIMIT 20
    `);
    if (rows && rows.length > 0) return res.json({ events: rows });
  } catch {}

  res.json({
    events: [
      { id: 1, name: 'Donor Darah Peduli Kemanusiaan', event_date: '2026-10-20', location: 'Kantor PMI Pusat Kota', status: 'open' },
      { id: 2, name: 'Aksi Donor Darah Akbar Kampus', event_date: '2026-10-25', location: 'Auditorium Universitas', status: 'upcoming' },
      { id: 3, name: 'Mobile Donor Unit Mall', event_date: '2026-11-01', location: 'Atrium Grand Mall', status: 'upcoming' },
    ]
  });
});

// ─── GET /api/donor-notify/simulated-emails ──────────────────────────────────
// Ambil daftar email yang dikirimkan ke donor (untuk simulasi/preview email viewer di frontend)
router.get('/simulated-emails', authMiddleware, (req, res) => {
  res.json({ emails: inMemoryStore.emails, total: inMemoryStore.emails.length });
});

module.exports = router;
