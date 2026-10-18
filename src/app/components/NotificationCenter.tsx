import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell, Mail, BellOff, CheckCheck, Trash2, X, Calendar, Droplets,
  Info, Megaphone, ChevronRight, Inbox, Eye, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import EmailViewerModal, { EmailItem } from './EmailViewerModal';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read_status: boolean | number;
  created_at: string;
}

interface DonorMessage {
  id: number;
  type: string;
  title: string;
  message: string;
  sender_name: string;
  sender_org: string;
  blood_type?: string;
  hospital?: string;
  urgency_note?: string;
  event_id?: number;
  cta_url?: string;
  cta_label?: string;
  read_status: boolean | number;
  created_at: string;
}

const typeIcon: Record<string, { icon: React.ElementType; color: string; bg: string; badge: string }> = {
  event_invite: { icon: Calendar, color: 'text-[#2980B9]', bg: 'bg-[#EAF7FB] dark:bg-[#0e1e26]', badge: 'Event' },
  blood_need: { icon: Droplets, color: 'text-[#C0392B]', bg: 'bg-[#FDEDEC] dark:bg-[#2a1218]', badge: 'Kebutuhan Darah' },
  schedule_remind: { icon: Bell, color: 'text-[#8E44AD]', bg: 'bg-[#E8DAEF] dark:bg-[#1a1228]', badge: 'Jadwal Donor' },
  announcement: { icon: Megaphone, color: 'text-[#E67E22]', bg: 'bg-[#FEF9E7] dark:bg-[#221a08]', badge: 'Pengumuman' },
  custom: { icon: Mail, color: 'text-[#27AE60]', bg: 'bg-[#EAFAF1] dark:bg-[#0e2018]', badge: 'Pesan PMI' },
  info: { icon: Info, color: 'text-[#9B9BB5]', bg: 'bg-[#F4F4F8] dark:bg-[#1a1a2a]', badge: 'Informasi' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notif' | 'messages' | 'emails'>('notif');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<DonorMessage[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadNotif = notifications.filter(n => !n.read_status).length;
  const unreadMsg = messages.filter(m => !m.read_status).length;
  const totalUnread = unreadNotif + unreadMsg;

  // Tutup saat klik di luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load data saat buka atau setiap 30 detik
  useEffect(() => {
    if (!user) return;
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const [notifData, msgData, emailData] = await Promise.allSettled([
        api.notifications.getAll([]),
        user?.role === 'donor' ? api.donorNotify.getMessages() : Promise.resolve({ messages: [] }),
        user?.role === 'donor' ? api.donorNotify.getSimulatedEmails() : Promise.resolve({ emails: [] }),
      ]);
      if (notifData.status === 'fulfilled' && Array.isArray(notifData.value)) {
        setNotifications(notifData.value);
      }
      if (msgData.status === 'fulfilled') {
        const v = msgData.value as any;
        setMessages(Array.isArray(v?.messages) ? v.messages : []);
      }
      if (emailData.status === 'fulfilled') {
        const ev = emailData.value as any;
        setEmails(Array.isArray(ev?.emails) ? ev.emails : []);
      }
    } catch {}
    setLoading(false);
  }

  async function markNotifRead(id: string) {
    await api.notifications.markRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_status: true } : n));
  }

  async function markAllNotifRead() {
    await api.notifications.markAllRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
  }

  async function deleteNotif(id: string) {
    await api.notifications.delete(id).catch(() => {});
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  async function markMsgRead(id: number) {
    await api.donorNotify.markRead(id).catch(() => {});
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read_status: 1 } : m));
  }

  async function markAllMsgRead() {
    await api.donorNotify.markAllRead().catch(() => {});
    setMessages(prev => prev.map(m => ({ ...m, read_status: 1 })));
  }

  async function deleteMsg(id: number) {
    await api.donorNotify.deleteMessage(id).catch(() => {});
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  const isDonor = user?.role === 'donor';

  return (
    <>
      <div className="relative" ref={ref}>
        {/* Bell Button */}
        <button
          id="notification-bell-btn"
          onClick={() => { setOpen(o => !o); if (!open) loadData(); }}
          className="relative p-2 rounded-xl hover:bg-[#FDEDEC] dark:hover:bg-[#2a1218] transition-colors group cursor-pointer"
          title="Notifikasi & Pesan"
          aria-label="Pusat Notifikasi"
        >
          <Bell className="w-5 h-5 text-[#4A4A6A] dark:text-[#a5a5c5] group-hover:text-[#C0392B] transition-colors" />
          {totalUnread > 0 && (
            <motion.span
              key={totalUnread}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#C0392B] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </motion.span>
          )}
        </button>

        {/* Dropdown Panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-12 w-[390px] max-w-[calc(100vw-16px)] bg-white dark:bg-[#13131f] border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-[#F9F9FC] dark:bg-[#181827]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#FDEDEC] dark:bg-[#2a1218] flex items-center justify-center text-[#C0392B]">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[#1A1A2E] dark:text-white leading-tight block">
                      Notifikasi & Pesan Pendonor
                    </span>
                    <span className="text-[10px] text-[#9B9BB5]">Jadwal, Event & Kebutuhan Darah</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={loadData}
                    className="p-1.5 rounded-lg hover:bg-[#F4F4F8] dark:hover:bg-[#1a1a2a] text-[#9B9BB5] hover:text-[#C0392B] transition-colors"
                    title="Segarkan"
                  >
                    <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-[#F4F4F8] dark:hover:bg-[#1a1a2a] text-[#9B9BB5] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border bg-white dark:bg-[#13131f]">
                <button
                  onClick={() => setActiveTab('notif')}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === 'notif'
                      ? 'text-[#C0392B] border-b-2 border-[#C0392B]'
                      : 'text-[#9B9BB5] hover:text-[#4A4A6A]'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Notifikasi
                  {unreadNotif > 0 && (
                    <span className="bg-[#C0392B] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                      {unreadNotif}
                    </span>
                  )}
                </button>
                {isDonor && (
                  <>
                    <button
                      onClick={() => setActiveTab('messages')}
                      className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                        activeTab === 'messages'
                          ? 'text-[#C0392B] border-b-2 border-[#C0392B]'
                          : 'text-[#9B9BB5] hover:text-[#4A4A6A]'
                      }`}
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      Pesan Web
                      {unreadMsg > 0 && (
                        <span className="bg-[#C0392B] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                          {unreadMsg}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('emails')}
                      className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                        activeTab === 'emails'
                          ? 'text-[#C0392B] border-b-2 border-[#C0392B]'
                          : 'text-[#9B9BB5] hover:text-[#4A4A6A]'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email Masuk
                      {emails.length > 0 && (
                        <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                          {emails.length}
                        </span>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Content Panel */}
              <div className="max-h-[380px] overflow-y-auto">
                {/* 1. Tab Notifikasi */}
                {activeTab === 'notif' && (
                  <>
                    {notifications.length === 0 ? (
                      <EmptyState icon={BellOff} text="Belum ada notifikasi baru" />
                    ) : (
                      <>
                        <div className="px-3 py-2 flex items-center justify-between bg-[#F9F9FC]/50 dark:bg-[#181827]/50 border-b border-border/40">
                          <span className="text-[10px] text-[#9B9BB5] font-semibold uppercase tracking-wider">
                            {notifications.length} Notifikasi
                          </span>
                          {unreadNotif > 0 && (
                            <button
                              onClick={markAllNotifRead}
                              className="text-[10px] text-[#C0392B] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCheck className="w-3 h-3" /> Tandai semua dibaca
                            </button>
                          )}
                        </div>
                        <div className="divide-y divide-border/50">
                          {notifications.map((notif) => {
                            const cfg = typeIcon[notif.type] || typeIcon.info;
                            const Icon = cfg.icon;
                            return (
                              <motion.div
                                key={notif.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`px-4 py-3 flex gap-3 hover:bg-[#F9F9FC] dark:hover:bg-[#181827] transition-colors group cursor-pointer ${
                                  !notif.read_status ? 'bg-[#FFF8F8] dark:bg-[#1e1215]' : ''
                                }`}
                                onClick={() => markNotifRead(notif.id)}
                              >
                                <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className={`text-xs font-bold leading-tight ${
                                        !notif.read_status ? 'text-[#1A1A2E] dark:text-white' : 'text-[#4A4A6A] dark:text-[#a5a5c5]'
                                      }`}>
                                        {notif.title}
                                        {!notif.read_status && (
                                          <span className="inline-block w-1.5 h-1.5 bg-[#C0392B] rounded-full ml-1.5 align-middle animate-pulse" />
                                        )}
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 text-[#9B9BB5] hover:text-[#C0392B] transition-all flex-shrink-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-[#9B9BB5] mt-1 line-clamp-2 leading-relaxed">
                                    {notif.message}
                                  </p>
                                  <p className="text-[9px] text-[#9B9BB5] mt-1 font-medium">
                                    {timeAgo(notif.created_at)}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* 2. Tab Pesan PMI */}
                {activeTab === 'messages' && isDonor && (
                  <>
                    {messages.length === 0 ? (
                      <EmptyState icon={Inbox} text="Belum ada pesan dari PMI" />
                    ) : (
                      <>
                        <div className="px-3 py-2 flex items-center justify-between bg-[#F9F9FC]/50 dark:bg-[#181827]/50 border-b border-border/40">
                          <span className="text-[10px] text-[#9B9BB5] font-semibold uppercase tracking-wider">
                            {messages.length} Pesan Masuk
                          </span>
                          {unreadMsg > 0 && (
                            <button
                              onClick={markAllMsgRead}
                              className="text-[10px] text-[#C0392B] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCheck className="w-3 h-3" /> Tandai semua dibaca
                            </button>
                          )}
                        </div>
                        <div className="divide-y divide-border/50">
                          {messages.map((msg) => {
                            const cfg = typeIcon[msg.type] || typeIcon.custom;
                            const Icon = cfg.icon;
                            return (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`px-4 py-3 flex gap-3 hover:bg-[#F9F9FC] dark:hover:bg-[#181827] transition-colors group cursor-pointer ${
                                  !msg.read_status ? 'bg-[#FFF8F8] dark:bg-[#1e1215]' : ''
                                }`}
                                onClick={() => markMsgRead(msg.id)}
                              >
                                <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#4A4A6A] dark:text-[#a5a5c5] mr-1.5">
                                        {cfg.badge}
                                      </span>
                                      <p className={`text-xs font-bold leading-tight inline ${
                                        !msg.read_status ? 'text-[#1A1A2E] dark:text-white' : 'text-[#4A4A6A] dark:text-[#a5a5c5]'
                                      }`}>
                                        {msg.title}
                                        {!msg.read_status && (
                                          <span className="inline-block w-1.5 h-1.5 bg-[#C0392B] rounded-full ml-1.5 align-middle" />
                                        )}
                                      </p>
                                      <p className="text-[10px] text-[#9B9BB5] mt-0.5">{msg.sender_org || msg.sender_name}</p>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteMsg(msg.id); }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 text-[#9B9BB5] hover:text-[#C0392B] transition-all flex-shrink-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-[#9B9BB5] mt-1 line-clamp-2 leading-relaxed">
                                    {msg.message}
                                  </p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[9px] text-[#9B9BB5]">{timeAgo(msg.created_at)}</span>
                                    {msg.cta_url && (
                                      <a
                                        href={msg.cta_url}
                                        onClick={e => { e.stopPropagation(); setOpen(false); }}
                                        className="text-[10px] text-[#C0392B] font-bold flex items-center gap-0.5 hover:underline"
                                      >
                                        {msg.cta_label || 'Buka'} <ChevronRight className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* 3. Tab Email Masuk (Simulasi Email) */}
                {activeTab === 'emails' && isDonor && (
                  <>
                    {emails.length === 0 ? (
                      <EmptyState icon={Mail} text="Belum ada email notifikasi masuk" />
                    ) : (
                      <>
                        <div className="px-3 py-2 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-border/40">
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> {emails.length} Email Notifikasi Diterima
                          </span>
                        </div>
                        <div className="divide-y divide-border/50">
                          {emails.map((em) => (
                            <div
                              key={em.id}
                              onClick={() => setSelectedEmail(em)}
                              className="px-4 py-3 flex gap-3 hover:bg-[#F9F9FC] dark:hover:bg-[#181827] transition-colors cursor-pointer group"
                            >
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Mail className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#1A1A2E] dark:text-white leading-tight truncate group-hover:text-[#C0392B] transition-colors">
                                  {em.subject}
                                </p>
                                <p className="text-[10px] text-[#9B9BB5] mt-0.5">Kepada: {em.to}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[9px] text-[#9B9BB5]">{timeAgo(em.sentAt)}</span>
                                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                                    <Eye className="w-3 h-3" /> Baca Email
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border bg-[#F9F9FC] dark:bg-[#181827] flex items-center justify-between">
                {isDonor ? (
                  <button
                    onClick={() => { setOpen(false); navigate('/donor/messages'); }}
                    className="w-full text-center text-xs text-[#C0392B] font-bold hover:underline flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Buka Kotak Masuk Pesan Lengkap <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await api.notifications.markAllRead().catch(() => {});
                      setNotifications(p => p.map(n => ({ ...n, read_status: true })));
                    }}
                    className="w-full text-center text-xs text-[#C0392B] font-bold hover:underline cursor-pointer"
                  >
                    Tandai semua sebagai sudah dibaca
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Viewer Email */}
      <EmailViewerModal
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        email={selectedEmail}
      />
    </>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 bg-[#F4F4F8] dark:bg-[#1a1a2a] rounded-2xl flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-[#9B9BB5]" />
      </div>
      <p className="text-sm font-semibold text-[#4A4A6A] dark:text-[#a5a5c5]">{text}</p>
      <p className="text-xs text-[#9B9BB5] mt-1">Semua update terkini akan muncul di sini</p>
    </div>
  );
}
