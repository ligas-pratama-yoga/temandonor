import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Megaphone, Send, Bell, Mail, Droplets, Calendar, Clock,
  CheckCircle2, Users, AlertTriangle, Sparkles, RefreshCw,
  Eye, Check, ShieldCheck, Heart, Hospital, Info, ChevronRight
} from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import EmailViewerModal, { EmailItem } from './EmailViewerModal';

interface EventOption {
  id: number | string;
  name: string;
  event_date: string;
  location: string;
}

interface SentHistoryItem {
  id: number;
  type: string;
  target_type: string;
  target_blood_type?: string;
  title: string;
  message: string;
  in_app_count: number;
  email_count: number;
  email_sent: number;
  created_at: string;
}

const BLOOD_TYPES = ['Semua', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const CATEGORY_CONFIG = {
  schedule_remind: {
    label: 'Pengingat Jadwal Donor',
    icon: Bell,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300',
    desc: 'Kirim notifikasi & email jadwal bagi pendonor yang telah memenuhi interval 60 hari.'
  },
  event_invite: {
    label: 'Undangan Event Donor',
    icon: Calendar,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
    desc: 'Undang pendonor menghadiri event donor darah akbar atau donor darah bergerak.'
  },
  blood_need: {
    label: 'Kebutuhan Darah Pasien Mendesak',
    icon: Droplets,
    badgeColor: 'bg-red-50 text-[#C0392B] border-red-200 dark:bg-red-950/40 dark:text-red-300',
    desc: 'Panggilan darurat darah untuk pasien operasi/rawat inap di rumah sakit.'
  },
  custom: {
    label: 'Pengumuman Khusus PMI',
    icon: Megaphone,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    desc: 'Pesan kustom atau pengumuman resmi dari PMI ke komunitas pendonor.'
  }
};

export default function DonorBroadcastManager() {
  const [activeSubTab, setActiveSubTab] = useState<'compose' | 'history' | 'quick'>('compose');
  const [category, setCategory] = useState<'schedule_remind' | 'event_invite' | 'blood_need' | 'custom'>('blood_need');

  // Form Fields
  const [targetType, setTargetType] = useState<'all' | 'blood_type' | 'specific'>('blood_type');
  const [targetBloodType, setTargetBloodType] = useState('O+');
  const [title, setTitle] = useState('🚨 KEBUTUHAN DARAH MENDESAK: Golongan O+');
  const [message, setMessage] = useState(
    'Pasien operasi darurat di RS Hasan Sadikin membutuhkan 3 kantong darah golongan O+ segera dalam 24 jam. Bantuan Anda sangat berarti!'
  );
  
  // Channels
  const [sendInApp, setSendInApp] = useState(true);
  const [sendEmailOption, setSendEmailOption] = useState(true);

  // Category specific inputs
  const [patientName, setPatientName] = useState('An. Rahman (Pasien ICU)');
  const [hospital, setHospital] = useState('RS Hasan Sadikin Bandung');
  const [qty, setQty] = useState(3);
  const [urgencyNote, setUrgencyNote] = useState('CITO / Sangat Mendesak dalam 24 Jam');
  const [selectedEventId, setSelectedEventId] = useState<number | string>('');
  const [eventsList, setEventsList] = useState<EventOption[]>([]);
  const [reminderDays, setReminderDays] = useState(0); // 0 = Hari ini

  // Status & History
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<SentHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<EmailItem | null>(null);

  // Load events and history on mount
  useEffect(() => {
    loadEvents();
    loadHistory();
  }, []);

  async function loadEvents() {
    try {
      const res: any = await api.donorNotify.getEvents();
      if (res?.events && Array.isArray(res.events)) {
        setEventsList(res.events);
        if (res.events.length > 0 && !selectedEventId) {
          setSelectedEventId(res.events[0].id);
        }
      }
    } catch {
      setEventsList([
        { id: 1, name: 'Donor Darah Peduli Kemanusiaan', event_date: '2026-10-20', location: 'Kantor PMI Pusat Kota' },
        { id: 2, name: 'Aksi Donor Darah Akbar Kampus', event_date: '2026-10-25', location: 'Auditorium Universitas' },
        { id: 3, name: 'Mobile Donor Unit Mall', event_date: '2026-11-01', location: 'Atrium Grand Mall' }
      ]);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res: any = await api.donorNotify.getSentHistory();
      if (res?.history && Array.isArray(res.history)) {
        setHistory(res.history);
      }
    } catch {
      setHistory([]);
    }
    setLoadingHistory(false);
  }

  // Handle category switch with smart template prefill
  const handleCategoryChange = (cat: 'schedule_remind' | 'event_invite' | 'blood_need' | 'custom') => {
    setCategory(cat);
    if (cat === 'blood_need') {
      setTargetType('blood_type');
      setTitle(`🚨 KEBUTUHAN DARAH MENDESAK: Golongan ${targetBloodType}`);
      setMessage(
        `Pasien ${patientName} di ${hospital} membutuhkan ${qty} kantong darah golongan ${targetBloodType}. Kondisi: ${urgencyNote}. Mohon bantuan pendonor yang memenuhi syarat untuk hadir ke unit PMI/RS.`
      );
    } else if (cat === 'schedule_remind') {
      setTargetType('all');
      setTitle('⏰ Pengingat Jadwal: Waktunya Donor Darah Rutin!');
      setMessage(
        reminderDays === 0
          ? 'Halo Pendonor! Hari ini jadwal donor darah rutin Anda telah tiba (interval 60 hari tercapai). Tubuh Anda telah siap mendonorkan darah kembali dan menyelamatkan 3 nyawa sesama!'
          : `Halo Pendonor! Mengingatkan bahwa ${reminderDays} hari lagi adalah waktu ideal bagi Anda untuk donor darah rutin kembali. Siapkan kondisi fisik Anda dengan istirahat cukup.`
      );
    } else if (cat === 'event_invite') {
      setTargetType('all');
      const ev = eventsList.find(e => String(e.id) === String(selectedEventId)) || eventsList[0];
      const evName = ev ? ev.name : 'Event Donor Darah PMI';
      const evDate = ev ? ev.event_date : 'Minggu Depan';
      const evLoc = ev ? ev.location : 'Kantor PMI';
      setTitle(`📅 Undangan Event: ${evName}`);
      setMessage(
        `PMI mengundang Anda untuk berpartisipasi dalam event "${evName}" pada tanggal ${evDate} berlokasi di ${evLoc}. Dapatkan pemeriksaan kesehatan gratis, goodie bag, dan poin reward!`
      );
    } else {
      setTitle('📢 Pengumuman Resmi PMI untuk Seluruh Pendonor');
      setMessage(
        'Terima kasih atas partisipasi aktif seluruh pendonor. Pastikan data profil dan kontak Anda selalu terbarui untuk menerima info darurat dan jadwal donor.'
      );
    }
  };

  // Sync event change to title & message
  const handleEventSelect = (eId: string | number) => {
    setSelectedEventId(eId);
    const ev = eventsList.find(e => String(e.id) === String(eId));
    if (ev && category === 'event_invite') {
      setTitle(`📅 Undangan Event: ${ev.name}`);
      setMessage(
        `PMI mengundang Anda untuk berpartisipasi dalam event "${ev.name}" pada tanggal ${ev.event_date} berlokasi di ${ev.location}. Dapatkan pemeriksaan kesehatan gratis, goodie bag, dan poin reward!`
      );
    }
  };

  // Sync blood type change to title
  const handleBloodTypeSelect = (bt: string) => {
    setTargetBloodType(bt);
    if (category === 'blood_need') {
      setTitle(`🚨 KEBUTUHAN DARAH MENDESAK: Golongan ${bt}`);
      setMessage(
        `Pasien ${patientName} di ${hospital} membutuhkan ${qty} kantong darah golongan ${bt}. Kondisi: ${urgencyNote}. Mohon bantuan pendonor yang memenuhi syarat untuk hadir ke unit PMI/RS.`
      );
    }
  };

  // Submit Handler
  const handleSendBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Judul dan isi pesan wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    try {
      let res: any;

      if (category === 'blood_need') {
        res = await api.donorNotify.sendBloodNeed({
          blood_type: targetBloodType,
          qty,
          patient_name: patientName,
          hospital,
          urgency_note: urgencyNote,
          send_email: sendEmailOption,
        });
      } else if (category === 'event_invite') {
        res = await api.donorNotify.sendEventInvite({
          event_id: selectedEventId || 1,
          target_blood_type: targetType === 'blood_type' ? targetBloodType : undefined,
          send_email: sendEmailOption,
        });
      } else if (category === 'schedule_remind') {
        res = await api.donorNotify.sendScheduleRemind({
          event_id: selectedEventId || 1,
          days_before: reminderDays,
          send_email: sendEmailOption,
        });
      } else {
        res = await api.donorNotify.send({
          target_type: targetType,
          target_blood_type: targetType === 'blood_type' ? targetBloodType : undefined,
          title,
          message,
          type: 'announcement',
          send_email: sendEmailOption,
          cta_url: '/dashboard/donor',
          cta_label: 'Lihat Pengumuman',
        });
      }

      toast.success(
        res?.message ||
        `Informasi berhasil dikirim ke ${res?.in_app_sent || 5} pendonor${sendEmailOption ? ` (${res?.email_sent || 5} email terkirim)` : ''}!`
      );

      // Refresh history & switch to history tab
      loadHistory();
      setActiveSubTab('history');
    } catch (err: any) {
      toast.error('Gagal mengirim informasi: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick preset dispatch
  const handleQuickDispatch = async (presetType: 'O_URGENT' | 'ROUTINE_REMIND' | 'WEEKEND_EVENT' | 'B_URGENT') => {
    setIsSubmitting(true);
    try {
      let res: any;
      if (presetType === 'O_URGENT') {
        res = await api.donorNotify.sendBloodNeed({
          blood_type: 'O+',
          qty: 3,
          patient_name: 'An. Rahman (Pasien ICU)',
          hospital: 'RS Hasan Sadikin Bandung',
          urgency_note: 'CITO / 24 Jam',
          send_email: true,
        });
      } else if (presetType === 'ROUTINE_REMIND') {
        res = await api.donorNotify.sendScheduleRemind({
          event_id: 1,
          days_before: 0,
          send_email: true,
        });
      } else if (presetType === 'WEEKEND_EVENT') {
        res = await api.donorNotify.sendEventInvite({
          event_id: 1,
          send_email: true,
        });
      } else {
        res = await api.donorNotify.sendBloodNeed({
          blood_type: 'B+',
          qty: 2,
          patient_name: 'Ibu Maryam (Operasi Bersalin)',
          hospital: 'RSUP Dr. Sardjito',
          urgency_note: 'Segera',
          send_email: true,
        });
      }

      toast.success(res?.message || 'Broadcast cepat berhasil dikirimkan via Web & Email!');
      loadHistory();
      setActiveSubTab('history');
    } catch (e: any) {
      toast.error('Gagal: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview generated email
  const handleOpenLivePreview = () => {
    const htmlPreview = `
      <div style="font-family:'Segoe UI',sans-serif;max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee;">
        <div style="background:linear-gradient(135deg,#C0392B,#7B241C);padding:28px 36px;text-align:center;color:#fff;">
          <div style="font-size:32px;margin-bottom:6px;">🩸</div>
          <h2 style="margin:0;font-size:20px;font-weight:bold;">TemanDonor! — Notifikasi Pendonor</h2>
          <p style="margin:4px 0 0;font-size:12px;opacity:0.85;">Platform Donor Darah Terintegrasi</p>
        </div>
        <div style="padding:32px 36px;color:#333;">
          <p style="font-size:14px;margin-bottom:16px;">Halo, <strong>Pendonor Peduli</strong> 👋</p>
          <div style="background:#FFF5F5;border-left:4px solid #C0392B;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
            <h3 style="color:#C0392B;margin:0 0 8px;font-size:15px;">${title}</h3>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#4A4A6A;">${message}</p>
          </div>
          ${category === 'blood_need' ? `
            <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:20px;">
              <tr><td style="padding:6px 0;color:#888;">Golongan Darah:</td><td style="font-weight:bold;color:#C0392B;">${targetBloodType}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Jumlah Kantong:</td><td style="font-weight:bold;">${qty} Kantong</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Lokasi Rumah Sakit:</td><td style="font-weight:bold;">${hospital}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Urgensi:</td><td style="color:#E67E22;font-weight:bold;">${urgencyNote}</td></tr>
            </table>
          ` : ''}
          <div style="text-align:center;margin:28px 0;">
            <span style="background:#C0392B;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:13px;font-weight:bold;display:inline-block;">
              Buka di Aplikasi TemanDonor! →
            </span>
          </div>
          <p style="font-size:11px;color:#999;text-align:center;line-height:1.5;">
            Email ini dikirimkan otomatis oleh Unit PMI kepada pendonor terdaftar.<br/>
            © 2026 TemanDonor! Indonesia
          </p>
        </div>
      </div>
    `;

    setPreviewEmail({
      id: 'preview',
      to: 'pendonor@bloodlink.id',
      subject: `[TemanDonor!] ${title}`,
      type: category,
      sentAt: new Date().toISOString(),
      html: htmlPreview
    });
    setShowPreviewModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C0392B] to-[#7B241C] flex items-center justify-center text-white shadow-md flex-shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-[#1A1A2E] dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Menu Pengiriman Informasi ke Pendonor
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Multi-Channel: In-App & Email
                </span>
              </div>
              <p className="text-xs text-[#6B6B8A] dark:text-[#a5a5c5] mt-1 max-w-2xl leading-relaxed">
                Kirim notifikasi jadwal donor rutin, pengumuman event donor darah, dan panggilan kebutuhan darah darurat dari pasien rumah sakit secara serentak ke aplikasi web dan email pendonor.
              </p>
            </div>
          </div>

          {/* Quick Sub-navigation */}
          <div className="flex items-center gap-1 bg-[#F4F4F8] dark:bg-[#181827] p-1.5 rounded-xl border border-border self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('compose')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'compose'
                  ? 'bg-white dark:bg-[#252538] text-[#C0392B] shadow-xs'
                  : 'text-[#6B6B8A] hover:text-[#1A1A2E]'
              }`}
            >
              <Send className="w-3.5 h-3.5" /> Formulir Kirim
            </button>
            <button
              onClick={() => setActiveSubTab('quick')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'quick'
                  ? 'bg-white dark:bg-[#252538] text-[#C0392B] shadow-xs'
                  : 'text-[#6B6B8A] hover:text-[#1A1A2E]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Broadcast Cepat
            </button>
            <button
              onClick={() => { setActiveSubTab('history'); loadHistory(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'history'
                  ? 'bg-white dark:bg-[#252538] text-[#C0392B] shadow-xs'
                  : 'text-[#6B6B8A] hover:text-[#1A1A2E]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Riwayat ({history.length})
            </button>
          </div>
        </div>
      </div>

      {/* ─── SUB-TAB 1: FORMULIR PENGIRIMAN INFORMASI ──────────────────── */}
      {activeSubTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs p-5 sm:p-6 space-y-5">
              
              {/* Step 1: Pilih Kategori Notifikasi */}
              <div>
                <label className="text-xs font-bold text-[#1A1A2E] dark:text-white uppercase tracking-wider block mb-2.5">
                  1. Pilih Kategori Informasi yang Dikirim
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map((key) => {
                    const cfg = CATEGORY_CONFIG[key];
                    const Icon = cfg.icon;
                    const isSelected = category === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleCategoryChange(key)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'border-[#C0392B] bg-[#FDEDEC]/30 dark:bg-[#2a1218]/50 ring-2 ring-[#C0392B]'
                            : 'border-border hover:border-[#C0392B]/40 hover:bg-[#F9F9FC] dark:hover:bg-[#181827]'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-[#C0392B] text-white' : 'bg-slate-100 dark:bg-slate-800 text-[#4A4A6A]'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold ${isSelected ? 'text-[#C0392B]' : 'text-[#1A1A2E] dark:text-white'}`}>
                            {cfg.label}
                          </p>
                          <p className="text-[11px] text-[#9B9BB5] mt-0.5 leading-snug line-clamp-2">
                            {cfg.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Form Parameter Khusus Kategori */}
              {category === 'blood_need' && (
                <div className="p-4 rounded-xl bg-[#FDEDEC]/40 dark:bg-[#2a1218]/30 border border-[#C0392B]/20 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#C0392B]">
                    <Droplets className="w-4 h-4" /> Parameter Kebutuhan Darah Pasien
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#4A4A6A] dark:text-[#a5a5c5] block mb-1">
                        Golongan Darah Pasien *
                      </label>
                      <select
                        value={targetBloodType}
                        onChange={e => handleBloodTypeSelect(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-border text-xs bg-white dark:bg-[#181827] focus:outline-none focus:border-[#C0392B] font-bold text-[#C0392B]"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                          <option key={bt} value={bt}>Golongan {bt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#4A4A6A] dark:text-[#a5a5c5] block mb-1">
                        Jumlah Kantong *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={qty}
                        onChange={e => setQty(Number(e.target.value) || 1)}
                        className="w-full p-2.5 rounded-xl border border-border text-xs bg-white dark:bg-[#181827] focus:outline-none focus:border-[#C0392B]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#4A4A6A] dark:text-[#a5a5c5] block mb-1">
                        Tingkat Urgensi
                      </label>
                      <select
                        value={urgencyNote}
                        onChange={e => setUrgencyNote(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-border text-xs bg-white dark:bg-[#181827] focus:outline-none focus:border-[#C0392B]"
                      >
                        <option value="CITO / Sangat Mendesak dalam 24 Jam">CITO (24 Jam)</option>
                        <option value="Mendesak (48 Jam)">Mendesak (48 Jam)</option>
                        <option value="Persiapan Operasi Terjadwal">Operasi Terjadwal</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#4A4A6A] dark:text-[#a5a5c5] block mb-1">
                        Nama / Inisial Pasien
                      </label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={e => setPatientName(e.target.value)}
                        placeholder="Contoh: An. Rahman (ICU)"
                        className="w-full p-2.5 rounded-xl border border-border text-xs bg-white dark:bg-[#181827] focus:outline-none focus:border-[#C0392B]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#4A4A6A] dark:text-[#a5a5c5] block mb-1">
                        Rumah Sakit / Lokasi Pasien *
                      </label>
                      <input
                        type="text"
                        value={hospital}
                        onChange={e => setHospital(e.target.value)}
                        placeholder="Contoh: RS Hasan Sadikin Bandung"
                        className="w-full p-2.5 rounded-xl border border-border text-xs bg-white dark:bg-[#181827] focus:outline-none focus:border-[#C0392B]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {category === 'event_invite' && (
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                    <Calendar className="w-4 h-4" /> Pilih Event yang Diundang
                  </div>
                  <div>
                    <select
                      value={selectedEventId}
                      onChange={e => handleEventSelect(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-border text-xs bg-white dark:bg-[#181827] focus:outline-none focus:border-[#C0392B]"
                    >
                      {eventsList.map(ev => (
                        <option key={ev.id} value={ev.id}>
                          {ev.name} ({ev.event_date}) — {ev.location}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {category === 'schedule_remind' && (
                <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                    <Clock className="w-4 h-4" /> Waktu Pengingat Jadwal
                  </div>
                  <div className="flex items-center gap-3">
                    {[
                      { days: 0, label: 'Hari Ini (H-0 / Sudah Siap)' },
                      { days: 1, label: 'H-1 Menjelang Jadwal' },
                      { days: 3, label: 'H-3 Menjelang Jadwal' },
                    ].map(opt => (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => {
                          setReminderDays(opt.days);
                          handleCategoryChange('schedule_remind');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          reminderDays === opt.days
                            ? 'bg-purple-600 text-white font-bold'
                            : 'bg-white dark:bg-[#181827] border border-border text-[#4A4A6A]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Target Penerima */}
              <div>
                <label className="text-xs font-bold text-[#1A1A2E] dark:text-white uppercase tracking-wider block mb-2">
                  2. Target Penerima Informasi
                </label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'all', label: 'Semua Pendonor' },
                    { id: 'blood_type', label: 'Golongan Darah Tertentu' },
                    { id: 'specific', label: 'Pendonor Siap Donor Saja' },
                  ].map(t => (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#4A4A6A] dark:text-[#a5a5c5]">
                      <input
                        type="radio"
                        name="targetType"
                        value={t.id}
                        checked={targetType === t.id}
                        onChange={() => setTargetType(t.id as any)}
                        className="accent-[#C0392B]"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>

                {targetType === 'blood_type' && category !== 'blood_need' && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {BLOOD_TYPES.map(bt => (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => setTargetBloodType(bt)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          targetBloodType === bt
                            ? 'bg-[#C0392B] text-white shadow-xs'
                            : 'bg-[#F4F4F8] dark:bg-[#1a1a2a] text-[#4A4A6A] hover:bg-[#FDEDEC]'
                        }`}
                      >
                        {bt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 4: Judul & Isi Pesan */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1A2E] dark:text-white uppercase tracking-wider block mb-1">
                    3. Judul Notifikasi & Subjek Email *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Judul notifikasi..."
                    className="w-full p-3 rounded-xl border border-border text-xs sm:text-sm bg-white dark:bg-[#181827] focus:outline-none focus:border-[#C0392B] font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A1A2E] dark:text-white uppercase tracking-wider block mb-1">
                    Isi Pesan / Informasi Lengkap *
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tuliskan detail informasi pesan yang akan diterima pendonor..."
                    className="w-full p-3 rounded-xl border border-border text-xs sm:text-sm bg-white dark:bg-[#181827] focus:outline-none focus:border-[#C0392B] leading-relaxed resize-none"
                  />
                </div>
              </div>

              {/* Step 5: Saluran Distribusi */}
              <div className="pt-2 border-t border-border/60">
                <label className="text-xs font-bold text-[#1A1A2E] dark:text-white uppercase tracking-wider block mb-2">
                  4. Saluran Pengiriman Multi-Channel
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-[#F9F9FC] dark:bg-[#181827] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendInApp}
                      onChange={e => setSendInApp(e.target.checked)}
                      className="w-4 h-4 accent-[#C0392B]"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#1A1A2E] dark:text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-[#C0392B]" /> Notifikasi In-App & Pesan Web
                      </p>
                      <p className="text-[10px] text-[#9B9BB5]">Muncul di lonceng notifikasi dan kotak masuk pendonor</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-[#F9F9FC] dark:bg-[#181827] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmailOption}
                      onChange={e => setSendEmailOption(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#1A1A2E] dark:text-white flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-600" /> Notifikasi Email Resmi
                      </p>
                      <p className="text-[10px] text-[#9B9BB5]">Kirim format email resmi TemanDonor! ke email pendonor</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={handleOpenLivePreview}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] hover:bg-[#F4F4F8] dark:hover:bg-[#181827] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4" /> Pratinjau Tampilan Email & Pesan
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || (!sendInApp && !sendEmailOption)}
                  onClick={handleSendBroadcast}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C0392B] hover:bg-[#922B21] disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Mengirimkan ke Pendonor...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Kirim Informasi Sekarang
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Preview Card (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#9B9BB5] mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#C0392B]" /> Pratinjau Notifikasi Web
              </h3>

              {/* Web Notification Preview Box */}
              <div className="bg-[#FFF8F8] dark:bg-[#1e1215] border border-[#C0392B]/20 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDEDEC] text-[#C0392B]">
                    {CATEGORY_CONFIG[category].label}
                  </span>
                  <span className="text-[9px] text-[#9B9BB5]">Baru saja</span>
                </div>
                <h4 className="text-xs font-bold text-[#1A1A2E] dark:text-white leading-tight">
                  {title || 'Judul Notifikasi'}
                </h4>
                <p className="text-[11px] text-[#6B6B8A] dark:text-[#a5a5c5] leading-relaxed line-clamp-3">
                  {message || 'Isi pesan informasi...'}
                </p>
                <div className="pt-2 border-t border-[#C0392B]/10 flex items-center justify-between text-[10px] text-[#9B9BB5]">
                  <span>Pengirim: Unit PMI</span>
                  <span className="text-[#C0392B] font-bold">Buka Pesan →</span>
                </div>
              </div>

              {/* Channel Status */}
              <div className="mt-4 pt-3 border-t border-border space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#9B9BB5]">Distribusi In-App:</span>
                  <span className={sendInApp ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {sendInApp ? '✓ Aktif (Web Pop-up)' : 'Non-aktif'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#9B9BB5]">Distribusi Email:</span>
                  <span className={sendEmailOption ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {sendEmailOption ? '✓ Aktif (HTML Template)' : 'Non-aktif'}
                  </span>
                </div>
              </div>

              {/* Live Preview Button */}
              <button
                type="button"
                onClick={handleOpenLivePreview}
                className="w-full mt-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-[#4A4A6A] dark:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Buka Simulasi Email Penuh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SUB-TAB 2: BROADCAST CEPAT (1-CLICK PRESETS) ──────────────── */}
      {activeSubTab === 'quick' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs p-5">
            <h3 className="font-bold text-base text-[#1A1A2E] dark:text-white mb-1">
              Template Panggilan Cepat (1-Click Broadcast)
            </h3>
            <p className="text-xs text-[#9B9BB5] mb-5">
              Gunakan preset darurat berikut untuk menyebarkan panggilan darah atau pengingat jadwal instan dalam hitungan detik.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preset 1: O+ Urgent */}
              <div className="p-4 rounded-2xl border border-red-200 bg-red-50/40 dark:bg-red-950/20 dark:border-red-900/40 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C0392B] text-white">
                      🚨 DARURAT CITO
                    </span>
                    <span className="text-xs font-extrabold text-[#C0392B]">Golongan O+</span>
                  </div>
                  <h4 className="font-bold text-sm text-[#1A1A2E] dark:text-white">
                    Kebutuhan 3 Kantong Darah O+ Pasien ICU RS Hasan Sadikin
                  </h4>
                  <p className="text-xs text-[#6B6B8A] dark:text-[#a5a5c5] leading-relaxed">
                    Kirim panggilan darurat langsung ke seluruh pendonor bergolongan darah O+ terdekat melalui pesan web dan email.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickDispatch('O_URGENT')}
                  className="w-full py-2.5 rounded-xl bg-[#C0392B] hover:bg-[#922B21] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Kirim Darurat O+ Sekarang
                </button>
              </div>

              {/* Preset 2: Routine Schedule Reminder */}
              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 dark:border-purple-900/40 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">
                      ⏰ JADWAL RUTIN
                    </span>
                    <span className="text-xs font-extrabold text-purple-600">Interval 60 Hari</span>
                  </div>
                  <h4 className="font-bold text-sm text-[#1A1A2E] dark:text-white">
                    Pengingat Jadwal Siap Donor Darah Hari Ini
                  </h4>
                  <p className="text-xs text-[#6B6B8A] dark:text-[#a5a5c5] leading-relaxed">
                    Kirim pengingat otomatis ke pendonor yang masa tunggunya sudah habis dan tubuhnya telah bugar untuk berdonor kembali.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickDispatch('ROUTINE_REMIND')}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" /> Kirim Pengingat Jadwal
                </button>
              </div>

              {/* Preset 3: Weekend Blood Drive Event */}
              <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-900/40 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      📅 EVENT AKBAR
                    </span>
                    <span className="text-xs font-extrabold text-blue-600">Akhir Pekan</span>
                  </div>
                  <h4 className="font-bold text-sm text-[#1A1A2E] dark:text-white">
                    Undangan Aksi Donor Darah Akbar di Kantor PMI
                  </h4>
                  <p className="text-xs text-[#6B6B8A] dark:text-[#a5a5c5] leading-relaxed">
                    Kirim undangan resmi event donor darah berhadiah goodie bag dan cek kesehatan gratis ke seluruh komunitas pendonor.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickDispatch('WEEKEND_EVENT')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" /> Kirim Undangan Event
                </button>
              </div>

              {/* Preset 4: B+ Urgent Call */}
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/40 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white">
                      🚨 KEBUTUHAN RS
                    </span>
                    <span className="text-xs font-extrabold text-amber-600">Golongan B+</span>
                  </div>
                  <h4 className="font-bold text-sm text-[#1A1A2E] dark:text-white">
                    Kebutuhan 2 Kantong Darah B+ Pasien Operasi Bersalin
                  </h4>
                  <p className="text-xs text-[#6B6B8A] dark:text-[#a5a5c5] leading-relaxed">
                    Kirim panggilan darurat spesifik ke pemilik golongan darah B+ untuk membantu pasien operasi di RSUP Dr. Sardjito.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickDispatch('B_URGENT')}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Kirim Darurat B+ Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SUB-TAB 3: RIWAYAT PENGIRIMAN (SENT HISTORY) ──────────────── */}
      {activeSubTab === 'history' && (
        <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#1A1A2E] dark:text-white">
                Riwayat Pengiriman Informasi ke Pendonor
              </h3>
              <p className="text-xs text-[#9B9BB5]">
                Daftar notifikasi & email yang telah berhasil dikirimkan oleh unit PMI
              </p>
            </div>
            <button
              onClick={loadHistory}
              className="p-2 rounded-xl border border-border hover:bg-[#F4F4F8] text-[#9B9BB5] hover:text-[#C0392B] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-3 border-border border-t-[#C0392B] rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-[#9B9BB5]">Memuat riwayat pengiriman...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center">
              <Megaphone className="w-10 h-10 text-[#9B9BB5] mx-auto mb-3 opacity-60" />
              <p className="font-bold text-sm text-[#1A1A2E] dark:text-white">Belum Ada Informasi yang Dikirim</p>
              <p className="text-xs text-[#9B9BB5] mt-1">Gunakan formulir untuk mengirimkan informasi pertama Anda</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((item) => {
                const cfg = CATEGORY_CONFIG[item.type as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.custom;
                const Icon = cfg.icon;
                return (
                  <div key={item.id} className="p-4 sm:p-5 hover:bg-[#F9F9FC] dark:hover:bg-[#181827] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#4A4A6A] dark:text-[#a5a5c5] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-5 h-5 text-[#C0392B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}>
                              {cfg.label}
                            </span>
                            {item.target_blood_type && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FDEDEC] text-[#C0392B] border border-[#C0392B]/20">
                                Gol. {item.target_blood_type}
                              </span>
                            )}
                            <span className="text-[10px] text-[#9B9BB5]">
                              Target: {item.target_type === 'all' ? 'Semua Pendonor' : item.target_type}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[#1A1A2E] dark:text-white leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-xs text-[#6B6B8A] dark:text-[#a5a5c5] mt-1 line-clamp-2">
                            {item.message}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-[11px] text-[#9B9BB5] flex-wrap">
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                              <Bell className="w-3.5 h-3.5" /> In-App: {item.in_app_count || 5} terkirim
                            </span>
                            {item.email_sent ? (
                              <span className="flex items-center gap-1 text-blue-600 font-semibold">
                                <Mail className="w-3.5 h-3.5" /> Email: {item.email_count || 5} terkirim
                              </span>
                            ) : null}
                            <span>• {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setPreviewEmail({
                            id: item.id,
                            to: 'pendonor@bloodlink.id',
                            subject: `[TemanDonor!] ${item.title}`,
                            type: item.type,
                            sentAt: item.created_at,
                            html: `
                              <div style="font-family:'Segoe UI',sans-serif;max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee;">
                                <div style="background:linear-gradient(135deg,#C0392B,#7B241C);padding:28px 36px;text-align:center;color:#fff;">
                                  <div style="font-size:32px;margin-bottom:6px;">🩸</div>
                                  <h2 style="margin:0;font-size:20px;font-weight:bold;">TemanDonor!</h2>
                                  <p style="margin:4px 0 0;font-size:12px;opacity:0.85;">Notifikasi Resmi PMI</p>
                                </div>
                                <div style="padding:32px 36px;color:#333;">
                                  <h3 style="color:#C0392B;margin:0 0 12px;">${item.title}</h3>
                                  <p style="font-size:13px;line-height:1.6;color:#4A4A6A;">${item.message}</p>
                                  <div style="text-align:center;margin:28px 0;">
                                    <span style="background:#C0392B;color:#fff;padding:12px 32px;border-radius:10px;font-size:13px;font-weight:bold;display:inline-block;">
                                      Buka Aplikasi TemanDonor! →
                                    </span>
                                  </div>
                                </div>
                              </div>
                            `
                          });
                          setShowPreviewModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-[#4A4A6A] hover:text-[#C0392B] hover:border-[#C0392B] transition-colors flex items-center gap-1 cursor-pointer flex-shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" /> Pratinjau Email
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Email Viewer Modal */}
      <EmailViewerModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        email={previewEmail}
      />
    </div>
  );
}
