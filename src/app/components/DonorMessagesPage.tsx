import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Bell, Droplets, Calendar, Info, Megaphone, Trash2,
  CheckCheck, ChevronRight, Search, Filter, RefreshCw, X, Eye,
  ShieldCheck, Sparkles, Heart, Clock
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import EmailViewerModal, { EmailItem } from './EmailViewerModal';

interface DonorMessage {
  id: number;
  type: string;
  title: string;
  message: string;
  sender_name: string;
  sender_org: string;
  blood_type?: string;
  qty?: number;
  hospital?: string;
  urgency_note?: string;
  cta_url?: string;
  cta_label?: string;
  read_status: boolean | number;
  created_at: string;
}

const TYPE_CONFIG: Record<string, {
  label: string; icon: React.ElementType; iconColor: string; iconBg: string;
  badgeBg: string; badgeText: string;
}> = {
  event_invite: {
    label: 'Undangan Event', icon: Calendar,
    iconColor: 'text-[#2980B9]', iconBg: 'bg-[#EAF7FB] dark:bg-[#0e1e26]',
    badgeBg: '#EAF7FB', badgeText: '#2980B9',
  },
  blood_need: {
    label: 'Kebutuhan Darah', icon: Droplets,
    iconColor: 'text-[#C0392B]', iconBg: 'bg-[#FDEDEC] dark:bg-[#2a1218]',
    badgeBg: '#FDEDEC', badgeText: '#C0392B',
  },
  schedule_remind: {
    label: 'Pengingat Jadwal', icon: Bell,
    iconColor: 'text-[#8E44AD]', iconBg: 'bg-[#E8DAEF] dark:bg-[#1a1228]',
    badgeBg: '#E8DAEF', badgeText: '#8E44AD',
  },
  announcement: {
    label: 'Pengumuman', icon: Megaphone,
    iconColor: 'text-[#E67E22]', iconBg: 'bg-[#FEF9E7] dark:bg-[#221a08]',
    badgeBg: '#FEF9E7', badgeText: '#E67E22',
  },
  custom: {
    label: 'Pesan dari PMI', icon: Mail,
    iconColor: 'text-[#27AE60]', iconBg: 'bg-[#EAFAF1] dark:bg-[#0e2018]',
    badgeBg: '#EAFAF1', badgeText: '#27AE60',
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days} hari lalu`
    : new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DonorMessagesPage() {
  usePageTitle('Pesan & Notifikasi');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mainTab, setMainTab] = useState<'messages' | 'emails'>('messages');
  const [messages, setMessages] = useState<DonorMessage[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DonorMessage | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [msgRes, emailRes] = await Promise.allSettled([
        api.donorNotify.getMessages(),
        api.donorNotify.getSimulatedEmails()
      ]);

      if (msgRes.status === 'fulfilled') {
        const v = msgRes.value as any;
        setMessages(Array.isArray(v?.messages) ? v.messages : []);
      }
      if (emailRes.status === 'fulfilled') {
        const ev = emailRes.value as any;
        setEmails(Array.isArray(ev?.emails) ? ev.emails : []);
      }
    } catch {
      setMessages([]);
    }
    setLoading(false);
  }

  async function handleMarkRead(msg: DonorMessage) {
    if (msg.read_status) return;
    await api.donorNotify.markRead(msg.id).catch(() => {});
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read_status: 1 } : m));
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    await api.donorNotify.deleteMessage(id).catch(() => {});
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success('Pesan dihapus');
  }

  async function handleMarkAllRead() {
    await api.donorNotify.markAllRead().catch(() => {});
    setMessages(prev => prev.map(m => ({ ...m, read_status: 1 })));
    toast.success('Semua pesan ditandai dibaca');
  }

  const filteredMessages = messages.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase())
      || m.message.toLowerCase().includes(search.toLowerCase())
      || (m.sender_org || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || m.type === filterType;
    return matchSearch && matchType;
  });

  const filteredEmails = emails.filter(em => {
    return em.subject.toLowerCase().includes(search.toLowerCase())
      || em.to.toLowerCase().includes(search.toLowerCase());
  });

  const unreadCount = messages.filter(m => !m.read_status).length;

  const handleOpen = (msg: DonorMessage) => {
    setSelected(msg);
    handleMarkRead(msg);
  };

  return (
    <div className="min-h-screen bg-[#F7F7FB] dark:bg-[#0d0d15] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">
                Pusat Informasi Pendonor
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white flex items-center gap-3"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C0392B] to-[#7B241C] flex items-center justify-center text-white shadow-md">
                  <Mail className="w-5 h-5" />
                </div>
                Pesan & Notifikasi Pendonor
              </h1>
              <p className="text-xs text-[#9B9BB5] mt-1">
                Pantau jadwal donor darah Anda, undangan event akbar PMI, dan panggilan kebutuhan darah darurat
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && mainTab === 'messages' && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 text-xs text-[#C0392B] font-bold bg-[#FDEDEC] dark:bg-[#2a1218] px-3.5 py-2 rounded-xl hover:bg-[#C0392B] hover:text-white transition-all cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tandai Semua Dibaca ({unreadCount})
                </button>
              )}
              <button
                onClick={loadAll}
                className="p-2 rounded-xl bg-white dark:bg-[#13131f] border border-border text-[#9B9BB5] hover:text-[#C0392B] hover:border-[#C0392B] transition-all cursor-pointer shadow-xs"
                title="Segarkan data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Main Channels Tab Navigation */}
          <div className="flex items-center gap-2 mt-5 border-b border-border">
            <button
              onClick={() => setMainTab('messages')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                mainTab === 'messages'
                  ? 'border-[#C0392B] text-[#C0392B]'
                  : 'border-transparent text-[#9B9BB5] hover:text-[#4A4A6A]'
              }`}
            >
              <Bell className="w-4 h-4" />
              Kotak Pesan Web
              {unreadCount > 0 && (
                <span className="bg-[#C0392B] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} baru
                </span>
              )}
            </button>
            <button
              onClick={() => setMainTab('emails')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                mainTab === 'emails'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-[#9B9BB5] hover:text-[#4A4A6A]'
              }`}
            >
              <Mail className="w-4 h-4" />
              Kotak Email Masuk (Simulasi)
              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {emails.length} Email
              </span>
            </button>
          </div>
        </motion.div>

        {/* ─── TAB 1: KOTAK PESAN WEB ────────────────────────────────────── */}
        {mainTab === 'messages' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Message List */}
            <div className="flex-1 min-w-0">
              {/* Search + Filter */}
              <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs p-3 mb-4 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#9B9BB5] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari judul, isi, atau instansi pengirim..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-transparent rounded-xl focus:outline-none focus:border-[#C0392B] transition-colors"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Filter className="w-3.5 h-3.5 text-[#9B9BB5]" />
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'schedule_remind', label: 'Jadwal Donor' },
                    { id: 'event_invite', label: 'Event' },
                    { id: 'blood_need', label: 'Kebutuhan Darah' },
                    { id: 'custom', label: 'Pesan PMI' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilterType(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                        filterType === f.id
                          ? 'bg-[#C0392B] text-white shadow-xs'
                          : 'bg-[#F4F4F8] dark:bg-[#1a1a2a] text-[#4A4A6A] dark:text-[#a5a5c5] hover:bg-[#FDEDEC] hover:text-[#C0392B]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-48 bg-white dark:bg-[#13131f] rounded-2xl border border-border">
                  <div className="w-8 h-8 border-3 border-border border-t-[#C0392B] rounded-full animate-spin" />
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs p-12 text-center">
                  <div className="w-14 h-14 bg-[#F4F4F8] dark:bg-[#1a1a2a] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-[#9B9BB5]" />
                  </div>
                  <p className="font-bold text-[#1A1A2E] dark:text-white">Tidak ada pesan yang sesuai</p>
                  <p className="text-xs text-[#9B9BB5] mt-1">Belum ada pesan masuk untuk filter ini</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {filteredMessages.map((msg, idx) => {
                      const cfg = TYPE_CONFIG[msg.type] || TYPE_CONFIG.custom;
                      const Icon = cfg.icon;
                      const isActive = selected?.id === msg.id;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18, delay: idx * 0.02 }}
                          onClick={() => handleOpen(msg)}
                          className={`bg-white dark:bg-[#13131f] rounded-2xl border p-4 flex gap-3.5 cursor-pointer transition-all group ${
                            isActive
                              ? 'border-[#C0392B] shadow-md ring-1 ring-[#C0392B]'
                              : !msg.read_status
                              ? 'border-[#C0392B]/40 bg-[#FFF9F9] dark:bg-[#1c1114]'
                              : 'border-border hover:border-[#C0392B]/30 hover:shadow-sm'
                          }`}
                        >
                          <div className={`w-11 h-11 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs`}>
                            <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: cfg.badgeBg, color: cfg.badgeText }}
                                  >
                                    {cfg.label}
                                  </span>
                                  {msg.blood_type && (
                                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#FDEDEC] text-[#C0392B] border border-[#C0392B]/20">
                                      Golongan {msg.blood_type}
                                    </span>
                                  )}
                                  {!msg.read_status && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#C0392B] text-white rounded-full animate-pulse">
                                      BARU
                                    </span>
                                  )}
                                </div>
                                <p className={`text-sm font-bold mt-1.5 leading-snug truncate ${
                                  !msg.read_status ? 'text-[#1A1A2E] dark:text-white' : 'text-[#4A4A6A] dark:text-[#a5a5c5]'
                                }`}>
                                  {msg.title}
                                </p>
                              </div>
                              <button
                                onClick={(e) => handleDelete(msg.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-[#9B9BB5] hover:text-[#C0392B] transition-all flex-shrink-0 rounded-lg hover:bg-[#FDEDEC] cursor-pointer"
                                title="Hapus pesan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-[#6B6B8A] dark:text-[#a5a5c5] line-clamp-2 leading-relaxed">
                              {msg.message}
                            </p>
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40 text-[10px] text-[#9B9BB5]">
                              <span className="truncate">Dari: <b className="text-[#4A4A6A] dark:text-[#d0d0e5]">{msg.sender_org || msg.sender_name}</b></span>
                              <span className="flex-shrink-0 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {timeAgo(msg.created_at)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Right: Message Detail Reader */}
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  className="w-full lg:w-[420px] flex-shrink-0 bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-md overflow-hidden flex flex-col"
                >
                  {/* Detail Header */}
                  <div className="p-4 border-b border-border flex items-center justify-between bg-[#F9F9FC] dark:bg-[#181827]">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const cfg = TYPE_CONFIG[selected.type] || TYPE_CONFIG.custom;
                        const Icon = cfg.icon;
                        return (
                          <div className={`w-8 h-8 rounded-xl ${cfg.iconBg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                          </div>
                        );
                      })()}
                      <span className="text-xs font-bold text-[#1A1A2E] dark:text-white">
                        {TYPE_CONFIG[selected.type]?.label || 'Detail Pesan'}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="p-1.5 rounded-lg hover:bg-[#F4F4F8] text-[#9B9BB5] hover:text-[#C0392B] transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Detail Body */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div>
                      <h2 className="font-bold text-[#1A1A2E] dark:text-white text-base leading-snug"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {selected.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-[#9B9BB5]">
                        <span>Pengirim: <b className="text-[#4A4A6A] dark:text-white">{selected.sender_org || selected.sender_name}</b></span>
                        <span>•</span>
                        <span>{timeAgo(selected.created_at)}</span>
                      </div>
                    </div>

                    {/* Extra Parameter Card */}
                    {(selected.blood_type || selected.hospital || selected.qty) && (
                      <div className="bg-[#FDEDEC] dark:bg-[#2a1218] rounded-xl p-3.5 space-y-2 border border-[#C0392B]/20 text-xs">
                        {selected.blood_type && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#4A4A6A] dark:text-[#a5a5c5]">Golongan Darah:</span>
                            <span className="font-extrabold text-[#C0392B] px-2.5 py-0.5 bg-white dark:bg-[#13131f] rounded-lg shadow-xs">
                              {selected.blood_type}
                            </span>
                          </div>
                        )}
                        {selected.qty && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#4A4A6A] dark:text-[#a5a5c5]">Jumlah Dibutuhkan:</span>
                            <span className="font-bold text-[#1A1A2E] dark:text-white">{selected.qty} kantong</span>
                          </div>
                        )}
                        {selected.hospital && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#4A4A6A] dark:text-[#a5a5c5]">Lokasi/RS:</span>
                            <span className="font-semibold text-[#1A1A2E] dark:text-white truncate max-w-[200px]">{selected.hospital}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main Content */}
                    <div className="bg-[#F7F7FB] dark:bg-[#1a1a2a] rounded-xl p-4 text-xs sm:text-sm text-[#3A3A5A] dark:text-[#c0c0d8] leading-relaxed whitespace-pre-wrap border border-border/50">
                      {selected.message}
                    </div>

                    {selected.urgency_note && (
                      <div className="bg-[#FEF9E7] dark:bg-[#221a08] border border-[#E67E22]/30 rounded-xl p-3 text-xs text-[#E67E22] flex items-center gap-2">
                        ⚠️ <b>Catatan Urgensi:</b> {selected.urgency_note}
                      </div>
                    )}

                    {/* Action CTA Buttons */}
                    <div className="space-y-2 pt-2">
                      {selected.type === 'blood_need' && (
                        <button
                          onClick={() => {
                            toast.success('Terima kasih! Tim PMI telah diberi tahu bahwa Anda bersedia donor darah.');
                            navigate('/dashboard/donor');
                          }}
                          className="w-full bg-[#C0392B] hover:bg-[#922B21] text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
                        >
                          <Heart className="w-4 h-4 fill-white" /> Saya Siap Mendonorkan Darah
                        </button>
                      )}

                      {selected.type === 'event_invite' && (
                        <button
                          onClick={() => navigate('/events')}
                          className="w-full bg-[#2980B9] hover:bg-[#1F618D] text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
                        >
                          <Calendar className="w-4 h-4" /> Lihat & Daftar Event Ini
                        </button>
                      )}

                      {selected.type === 'schedule_remind' && (
                        <button
                          onClick={() => navigate('/events')}
                          className="w-full bg-[#8E44AD] hover:bg-[#732D91] text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
                        >
                          <Bell className="w-4 h-4" /> Cek Lokasi Unit Donor Terdekat
                        </button>
                      )}

                      {selected.cta_url && !['blood_need', 'event_invite', 'schedule_remind'].includes(selected.type) && (
                        <a
                          href={selected.cta_url}
                          className="w-full bg-[#C0392B] hover:bg-[#922B21] text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
                        >
                          {selected.cta_label || 'Buka Tautan'} <ChevronRight className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Detail Footer */}
                  <div className="p-3 border-t border-border flex gap-2 bg-[#F9F9FC] dark:bg-[#181827]">
                    <button
                      onClick={(e) => handleDelete(selected.id, e)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#C0392B] border border-[#C0392B]/30 px-3 py-2 rounded-xl hover:bg-[#FDEDEC] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Pesan Ini
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="hidden lg:flex lg:flex-col w-[380px] flex-shrink-0 bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs items-center justify-center p-8 text-center min-h-[350px]">
                  <div className="w-14 h-14 bg-[#F4F4F8] dark:bg-[#1a1a2a] rounded-2xl flex items-center justify-center mb-3">
                    <Mail className="w-7 h-7 text-[#9B9BB5]" />
                  </div>
                  <p className="font-bold text-[#4A4A6A] dark:text-[#a5a5c5] text-sm">Pilih Pesan untuk Membaca</p>
                  <p className="text-xs text-[#9B9BB5] mt-1 max-w-xs">
                    Klik salah satu pesan di daftar sebelah kiri untuk melihat informasi lengkap dan tindakan respons.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ─── TAB 2: KOTAK EMAIL MASUK (SIMULASI) ────────────────────────── */}
        {mainTab === 'emails' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1A1A2E] dark:text-white">
                    Simulasi Kotak Masuk Email Terdaftar
                  </h3>
                  <p className="text-xs text-[#4A4A6A] dark:text-[#a5a5c5]">
                    Menampilkan salinan email notifikasi resmi yang dikirimkan ke alamat email: <b>{user?.email || 'donor@bloodlink.id'}</b>
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-[#13131f] px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-xs">
                {emails.length} Email Diterima
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48 bg-white dark:bg-[#13131f] rounded-2xl border border-border">
                <div className="w-8 h-8 border-3 border-border border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs p-12 text-center">
                <div className="w-14 h-14 bg-[#F4F4F8] dark:bg-[#1a1a2a] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-[#9B9BB5]" />
                </div>
                <p className="font-bold text-[#1A1A2E] dark:text-white">Belum ada email masuk</p>
                <p className="text-xs text-[#9B9BB5] mt-1">Email notifikasi dari PMI akan otomatis tersimpan di sini</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEmails.map((em) => (
                  <motion.div
                    key={em.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-[#13131f] rounded-2xl border border-border hover:border-emerald-500/40 shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Email Terkirim
                          </span>
                          <span className="text-[11px] text-[#9B9BB5]">
                            Dari: TemanDonor! Notifikasi &lt;noreply@oneblood.id&gt;
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-[#1A1A2E] dark:text-white leading-snug truncate">
                          {em.subject}
                        </h4>
                        <p className="text-xs text-[#6B6B8A] dark:text-[#a5a5c5] mt-0.5">
                          Tujuan: <span className="font-mono text-[#1A1A2E] dark:text-white">{em.to}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                      <span className="text-[10px] text-[#9B9BB5] whitespace-nowrap">
                        {new Date(em.sentAt).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <button
                        onClick={() => setSelectedEmail(em)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" /> Buka Email
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal Email Viewer */}
      <EmailViewerModal
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        email={selectedEmail}
      />
    </div>
  );
}
