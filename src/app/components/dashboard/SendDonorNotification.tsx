/**
 * SendDonorNotification.tsx
 * Tab PMI: Kirim notifikasi + email ke pendonor
 * Mendukung: Event Invite, Blood Need Alert, Schedule Reminder, Custom Message
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Mail, Calendar, Droplets, Bell, Megaphone,
  Users, Clock, CheckCircle, RefreshCw, ChevronDown,
  AlertTriangle, Info, X, History
} from 'lucide-react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { AnimatedCounter } from '../ui/AnimatedCounter';

// ─── Types ────────────────────────────────────────────────────────────────────
type NotifMode = 'event_invite' | 'blood_need' | 'schedule_remind' | 'custom';

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

interface EventItem {
  id: number;
  name: string;
  event_date: string;
  location: string;
  status: string;
}

const BLOOD_TYPES = ['Semua', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const MODE_CONFIG: Record<NotifMode, {
  label: string; icon: React.ElementType; color: string;
  bg: string; description: string;
}> = {
  event_invite: {
    label: 'Undangan Event Donor',
    icon: Calendar,
    color: 'text-[#2980B9]',
    bg: 'bg-[#EAF7FB] dark:bg-[#0e1e26]',
    description: 'Undang donor untuk berpartisipasi dalam event donor darah',
  },
  blood_need: {
    label: 'Kebutuhan Darah Mendesak',
    icon: Droplets,
    color: 'text-[#C0392B]',
    bg: 'bg-[#FDEDEC] dark:bg-[#2a1218]',
    description: 'Beritahu donor tentang kebutuhan darah mendesak dari pasien',
  },
  schedule_remind: {
    label: 'Pengingat Jadwal Donor',
    icon: Bell,
    color: 'text-[#8E44AD]',
    bg: 'bg-[#E8DAEF] dark:bg-[#1a1228]',
    description: 'Ingatkan peserta event tentang jadwal donor yang akan datang',
  },
  custom: {
    label: 'Pesan & Pengumuman',
    icon: Megaphone,
    color: 'text-[#E67E22]',
    bg: 'bg-[#FEF9E7] dark:bg-[#221a08]',
    description: 'Kirim pesan atau pengumuman bebas ke semua donor atau golongan tertentu',
  },
};

function TypeHistory({ item }: { item: SentHistoryItem }) {
  const cfg = MODE_CONFIG[item.type as NotifMode] || MODE_CONFIG.custom;
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#1A1A2E] dark:text-white truncate">{item.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-[#9B9BB5]">
            {item.target_type === 'all' ? 'Semua Donor'
              : item.target_type === 'blood_type' ? `Gol. ${item.target_blood_type}` : 'Spesifik'}
          </span>
          <span className="text-[10px] text-[#27AE60] font-semibold">
            ✓ {item.in_app_count} in-app
          </span>
          {item.email_count > 0 && (
            <span className="text-[10px] text-[#2980B9] font-semibold">
              ✉ {item.email_count} email
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#9B9BB5] mt-0.5">
          {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default function SendDonorNotification() {
  const [mode, setMode] = useState<NotifMode>('custom');
  const [showHistory, setShowHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [sentHistory, setSentHistory] = useState<SentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form state per mode
  const [form, setForm] = useState({
    // Common
    target_blood_type: 'Semua',
    send_email: false,
    // Custom / Announcement
    title: '',
    message: '',
    cta_url: '',
    cta_label: '',
    // Blood Need
    blood_type: 'A+',
    qty: 1,
    patient_name: '',
    hospital: '',
    urgency_note: '',
    // Event
    event_id: '',
    days_before: 1,
  });

  const cfg = MODE_CONFIG[mode];

  useEffect(() => {
    loadEvents();
    loadHistory();
  }, []);

  async function loadEvents() {
    try {
      const res: any = await api.donorNotify.getEvents();
      setEvents(Array.isArray(res?.events) ? res.events : []);
    } catch {
      setEvents([]);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res: any = await api.donorNotify.getSentHistory();
      setSentHistory(Array.isArray(res?.history) ? res.history : []);
    } catch {}
    setHistoryLoading(false);
  }

  function updateForm(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSend() {
    setSuccess(null);
    setSending(true);
    try {
      let res: any;

      if (mode === 'event_invite') {
        if (!form.event_id) { toast.error('Pilih event terlebih dahulu'); setSending(false); return; }
        res = await api.donorNotify.sendEventInvite({
          event_id: Number(form.event_id),
          target_blood_type: form.target_blood_type !== 'Semua' ? form.target_blood_type : undefined,
          send_email: form.send_email,
        });
      } else if (mode === 'blood_need') {
        if (!form.blood_type) { toast.error('Pilih golongan darah'); setSending(false); return; }
        res = await api.donorNotify.sendBloodNeed({
          blood_type: form.blood_type,
          qty: form.qty,
          patient_name: form.patient_name || undefined,
          hospital: form.hospital || undefined,
          urgency_note: form.urgency_note || undefined,
          send_email: form.send_email,
        });
      } else if (mode === 'schedule_remind') {
        if (!form.event_id) { toast.error('Pilih event'); setSending(false); return; }
        res = await api.donorNotify.sendScheduleRemind({
          event_id: Number(form.event_id),
          days_before: form.days_before,
          send_email: form.send_email,
        });
      } else {
        if (!form.title.trim() || !form.message.trim()) {
          toast.error('Judul dan isi pesan wajib diisi');
          setSending(false); return;
        }
        res = await api.donorNotify.send({
          target_type: form.target_blood_type === 'Semua' ? 'all' : 'blood_type',
          target_blood_type: form.target_blood_type !== 'Semua' ? form.target_blood_type : undefined,
          title: form.title,
          message: form.message,
          type: 'custom',
          send_email: form.send_email,
          cta_url: form.cta_url || undefined,
          cta_label: form.cta_label || undefined,
        });
      }

      setSuccess(res);
      toast.success(`✅ Notifikasi berhasil dikirim ke ${res?.donors_targeted || res?.participants_notified || 0} donor!`);
      loadHistory();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengirim notifikasi');
    }
    setSending(false);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#1A1A2E] dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Kirim Notifikasi ke Pendonor
          </h3>
          <p className="text-xs text-[#9B9BB5] mt-0.5">
            Kirim notifikasi in-app dan email ke pendonor terdaftar
          </p>
        </div>
        <button
          onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}
          className="flex items-center gap-1.5 text-xs font-bold text-[#C0392B] bg-[#FDEDEC] dark:bg-[#2a1218] px-3.5 py-2 rounded-xl hover:bg-[#C0392B] hover:text-white transition-all"
        >
          <History className="w-3.5 h-3.5" />
          Riwayat Pengiriman
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-5">

          {/* Mode Selector */}
          <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs p-5">
            <p className="text-xs font-bold text-[#9B9BB5] uppercase tracking-wider mb-3">Pilih Jenis Notifikasi</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.entries(MODE_CONFIG) as [NotifMode, typeof MODE_CONFIG[NotifMode]][]).map(([key, c]) => {
                const Icon = c.icon;
                return (
                  <button
                    key={key}
                    onClick={() => { setMode(key); setSuccess(null); }}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                      mode === key
                        ? 'border-[#C0392B] bg-[#FFF8F8] dark:bg-[#1e1215]'
                        : 'border-border hover:border-[#C0392B]/40 hover:bg-[#FDEDEC]/30'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${c.color}`} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${mode === key ? 'text-[#C0392B]' : 'text-[#1A1A2E] dark:text-white'}`}>
                        {c.label}
                      </p>
                      <p className="text-[10px] text-[#9B9BB5] mt-0.5 leading-relaxed">{c.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Form */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs p-5 space-y-4"
            >
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                {(() => { const Icon = cfg.icon; return <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${cfg.color}`} /></div>; })()}
                <div>
                  <p className="font-bold text-sm text-[#1A1A2E] dark:text-white">{cfg.label}</p>
                  <p className="text-[10px] text-[#9B9BB5]">{cfg.description}</p>
                </div>
              </div>

              {/* ── Event Invite & Schedule Remind: pilih event ── */}
              {(mode === 'event_invite' || mode === 'schedule_remind') && (
                <div>
                  <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">
                    Pilih Event <span className="text-[#C0392B]">*</span>
                  </label>
                  <select
                    value={form.event_id}
                    onChange={e => updateForm('event_id', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl focus:outline-none focus:border-[#C0392B] transition-colors"
                  >
                    <option value="">-- Pilih Event --</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({new Date(ev.event_date).toLocaleDateString('id-ID')}) — {ev.location}
                      </option>
                    ))}
                  </select>
                  {events.length === 0 && (
                    <p className="text-[10px] text-[#9B9BB5] mt-1">Tidak ada event aktif. Buat event di tab "Event Donor" terlebih dahulu.</p>
                  )}
                </div>
              )}

              {/* ── Schedule Remind: berapa hari sebelum ── */}
              {mode === 'schedule_remind' && (
                <div>
                  <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">Kirim Pengingat</label>
                  <div className="flex items-center gap-2">
                    {[
                      { val: 3, label: 'H-3' }, { val: 2, label: 'H-2' },
                      { val: 1, label: 'H-1' }, { val: 0, label: 'Hari-H' }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => updateForm('days_before', opt.val)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                          form.days_before === opt.val
                            ? 'border-[#C0392B] bg-[#FDEDEC] text-[#C0392B]'
                            : 'border-border text-[#4A4A6A] hover:border-[#C0392B]/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Blood Need: detail darah ── */}
              {mode === 'blood_need' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">
                        Golongan Darah <span className="text-[#C0392B]">*</span>
                      </label>
                      <select
                        value={form.blood_type}
                        onChange={e => updateForm('blood_type', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl focus:outline-none focus:border-[#C0392B] transition-colors"
                      >
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt}>{bt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">Jumlah (kantong)</label>
                      <input
                        type="number" min={1} value={form.qty}
                        onChange={e => updateForm('qty', Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-sm bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl focus:outline-none focus:border-[#C0392B] transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">Nama Pasien (opsional)</label>
                    <input
                      type="text" placeholder="Contoh: Budi Santoso" value={form.patient_name}
                      onChange={e => updateForm('patient_name', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl focus:outline-none focus:border-[#C0392B] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">Rumah Sakit / Lokasi</label>
                    <input
                      type="text" placeholder="Contoh: RSUD dr. Hasan Sadikin Bandung" value={form.hospital}
                      onChange={e => updateForm('hospital', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl focus:outline-none focus:border-[#C0392B] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">Catatan Urgensi (opsional)</label>
                    <input
                      type="text" placeholder="Contoh: Pasien menjalani operasi darurat" value={form.urgency_note}
                      onChange={e => updateForm('urgency_note', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl focus:outline-none focus:border-[#C0392B] transition-colors"
                    />
                  </div>
                </>
              )}

              {/* ── Custom Message: judul + isi pesan ── */}
              {mode === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">
                      Judul Pesan <span className="text-[#C0392B]">*</span>
                    </label>
                    <input
                      type="text" placeholder="Contoh: Undangan Kampanye Donor Darah" value={form.title}
                      onChange={e => updateForm('title', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl focus:outline-none focus:border-[#C0392B] transition-colors"
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">
                      Isi Pesan <span className="text-[#C0392B]">*</span>
                    </label>
                    <textarea
                      rows={4} placeholder="Tulis pesan yang akan diterima donor..." value={form.message}
                      onChange={e => updateForm('message', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl focus:outline-none focus:border-[#C0392B] transition-colors resize-none"
                      maxLength={1000}
                    />
                    <p className="text-[10px] text-[#9B9BB5] mt-1 text-right">{form.message.length}/1000</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">URL Tombol (opsional)</label>
                      <input
                        type="url" placeholder="https://..." value={form.cta_url}
                        onChange={e => updateForm('cta_url', e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl focus:outline-none focus:border-[#C0392B] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">Label Tombol</label>
                      <input
                        type="text" placeholder="Contoh: Daftar Sekarang" value={form.cta_label}
                        onChange={e => updateForm('cta_label', e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl focus:outline-none focus:border-[#C0392B] transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── Target Golongan Darah (untuk event & custom) ── */}
              {(mode === 'event_invite' || mode === 'custom') && (
                <div>
                  <label className="block text-xs font-bold text-[#4A4A6A] dark:text-[#a5a5c5] mb-1.5">
                    Target Penerima
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOOD_TYPES.map(bt => (
                      <button
                        key={bt}
                        onClick={() => updateForm('target_blood_type', bt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          form.target_blood_type === bt
                            ? 'bg-[#C0392B] text-white border-[#C0392B]'
                            : 'border-border text-[#4A4A6A] dark:text-[#a5a5c5] hover:border-[#C0392B]/40 bg-white dark:bg-[#1a1a2a]'
                        }`}
                      >
                        {bt === 'Semua' ? '👥 Semua Donor' : bt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Toggle Kirim Email ── */}
              <div className="flex items-center justify-between p-3.5 bg-[#F7F7FB] dark:bg-[#1a1a2a] rounded-xl border border-border">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#4A4A6A] dark:text-[#a5a5c5]" />
                  <div>
                    <p className="text-xs font-bold text-[#1A1A2E] dark:text-white">Juga kirim via Email</p>
                    <p className="text-[10px] text-[#9B9BB5]">Memerlukan konfigurasi SMTP di .env backend</p>
                  </div>
                </div>
                <button
                  onClick={() => updateForm('send_email', !form.send_email)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.send_email ? 'bg-[#27AE60]' : 'bg-[#D9D9E3]'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.send_email ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* ── Tombol Kirim ── */}
              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full bg-[#C0392B] hover:bg-[#922B21] disabled:opacity-60 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm text-sm"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Kirim Notifikasi
                    {mode === 'blood_need' && form.send_email && (
                      <span className="text-xs opacity-80">+ Email</span>
                    )}
                  </>
                )}
              </button>
            </motion.div>
          </AnimatePresence>

          {/* Success Result */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-[#EAFAF1] dark:bg-[#0e2018] border border-[#27AE60]/30 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-[#27AE60]" />
                  <p className="font-bold text-sm text-[#1E8449]">Notifikasi Berhasil Dikirim!</p>
                  <button onClick={() => setSuccess(null)} className="ml-auto text-[#9B9BB5] hover:text-[#C0392B]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Donor Ditarget', val: success.donors_targeted ?? success.participants_notified ?? 0, color: '#1A1A2E' },
                    { label: 'In-App Terkirim', val: success.in_app_sent ?? 0, color: '#27AE60' },
                    { label: 'Email Terkirim', val: success.email_sent ?? 0, color: '#2980B9' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-[#13131f] rounded-xl p-3 text-center">
                      <p className="text-2xl font-black" style={{ color: stat.color }}>
                        <AnimatedCounter value={stat.val} />
                      </p>
                      <p className="text-[10px] text-[#9B9BB5] mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Panduan + Riwayat */}
        <div className="space-y-4">

          {/* Panduan Cepat */}
          <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-[#2980B9]" />
              <p className="font-bold text-sm text-[#1A1A2E] dark:text-white">Panduan Pengiriman</p>
            </div>
            <div className="space-y-2.5 text-xs text-[#4A4A6A] dark:text-[#a5a5c5]">
              {[
                { icon: Calendar, text: 'Event Invite: Undang semua donor atau golongan tertentu ke event donor.' },
                { icon: Droplets, text: 'Blood Need: Notifikasi darurat ke donor yang golongan darahnya cocok.' },
                { icon: Bell, text: 'Schedule Remind: Pengingat otomatis ke peserta yang sudah booking event.' },
                { icon: Megaphone, text: 'Custom: Kirim pengumuman, info, atau pesan bebas ke donor.' },
                { icon: Mail, text: 'Email: Aktifkan toggle email + isi EMAIL_USER & EMAIL_PASS di backend/.env.' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex gap-2">
                    <Icon className="w-3.5 h-3.5 text-[#C0392B] flex-shrink-0 mt-0.5" />
                    <span>{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Warning SMTP */}
          <div className="bg-[#FEF9E7] dark:bg-[#221a08] border border-[#E67E22]/20 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#E67E22] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-[#E67E22]">Konfigurasi Email</p>
                <p className="text-[10px] text-[#4A4A6A] dark:text-[#a5a5c5] mt-1 leading-relaxed">
                  Untuk mengirim email, isi <code className="bg-white dark:bg-[#1a1a2a] px-1 py-0.5 rounded text-[9px]">EMAIL_USER</code> dan{' '}
                  <code className="bg-white dark:bg-[#1a1a2a] px-1 py-0.5 rounded text-[9px]">EMAIL_PASS</code>{' '}
                  di file <code className="bg-white dark:bg-[#1a1a2a] px-1 py-0.5 rounded text-[9px]">backend/.env</code>.
                  Gunakan Gmail App Password atau layanan SMTP lain.
                </p>
              </div>
            </div>
          </div>

          {/* Riwayat Terbaru */}
          <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#C0392B]" />
                <p className="font-bold text-sm text-[#1A1A2E] dark:text-white">Riwayat Terbaru</p>
              </div>
              <button onClick={loadHistory} className="text-[#9B9BB5] hover:text-[#C0392B] transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="px-4 divide-y divide-border/50 max-h-80 overflow-y-auto">
              {historyLoading ? (
                <div className="py-6 flex justify-center">
                  <div className="w-5 h-5 border-2 border-border border-t-[#C0392B] rounded-full animate-spin" />
                </div>
              ) : sentHistory.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#9B9BB5]">Belum ada riwayat pengiriman</p>
              ) : (
                sentHistory.slice(0, 8).map(item => <TypeHistory key={item.id} item={item} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
