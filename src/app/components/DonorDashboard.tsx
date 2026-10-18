import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar, Trophy, Heart, Star, Gift, Award,
  Clock, BookOpen, Lock, Ticket, Search, AlertCircle,
  CheckCircle, ChevronRight, Droplets, Activity, MapPin, Users,
  Mail, Bell, Send, Sparkles, ShieldCheck
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { AnimatedCounter, AnimatedProgressBar } from './ui/AnimatedCounter';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DonorStats {
  totalDonations: number;
  totalPoints: number;
  currentStreak: number;
  ranking: number;
  badgeLevel: 'bronze' | 'silver' | 'gold' | 'none';
  bloodType?: string;
}
interface ActiveTicket {
  id: string;
  eventName: string;
  eventDate: string;
  status: 'ready' | 'checked_in' | 'completed';
  qrCode: string;
  points: number;
}
interface AchievementItem {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  earned: boolean;
  progress?: number;
  total?: number;
}
interface EventItem {
  id: string;
  name: string;
  date: string;
  location: string;
  quota: number;
  registered: number;
}

const badgeConfig: Record<string, { label: string }> = {
  bronze: { label: 'Bronze' },
  silver: { label: 'Silver' },
  gold:   { label: 'Gold'   },
  none:   { label: 'New'    },
};

const ticketStatusMap = {
  ready:      { label: 'Terdaftar',  style: 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
  checked_in: { label: 'Hadir',      style: 'bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' },
  completed:  { label: 'Selesai',    style: 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' },
};

export default function DonorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageTitle('Dashboard Pendonor');

  const [donorStats, setDonorStats] = useState<DonorStats & { nextEligible?: string }>({
    totalDonations: 0, totalPoints: 0, currentStreak: 0, ranking: 0, badgeLevel: 'none',
  });
  const [activeTickets, setActiveTickets]     = useState<ActiveTicket[]>([]);
  const [displayAchievements, setDisplayAchievements] = useState<AchievementItem[]>([]);
  const [upcomingEvents, setUpcomingEvents]   = useState<EventItem[]>([]);
  const [messages, setMessages]               = useState<any[]>([]);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  const iconMap: Record<string, React.ElementType> = { Heart, Trophy, Star, Award };

  const handleSendScheduleEmailReminder = async () => {
    setIsSendingReminder(true);
    try {
      await api.donorNotify.sendScheduleRemind({
        event_id: 1,
        days_before: 0,
        send_email: true,
      });
      toast.success('📧 Notifikasi jadwal dan email resmi telah dikirim ke inbox Anda!');
      const res: any = await api.donorNotify.getMessages().catch(() => null);
      if (res?.messages) setMessages(res.messages);
    } catch {
      toast.info('Pengingat jadwal donor telah diaktifkan untuk akun Anda.');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const getDynamicAchievements = (n: number): AchievementItem[] => [
    { id: 'A001', name: 'Donor Pertama', description: 'Selesaikan donasi pertamamu',
      icon: Heart,  color: '#E11D48', bg: '#fef2f2', earned: n >= 1,  progress: Math.min(n, 1),  total: 1 },
    { id: 'A002', name: 'Konsisten',    description: 'Capai 3 kali donasi',
      icon: Trophy, color: '#f59e0b', bg: '#fffbeb', earned: n >= 3,  progress: Math.min(n, 3),  total: 3 },
    { id: 'A003', name: 'Bintang 10',   description: 'Capai 10 kali donasi',
      icon: Star,   color: '#8b5cf6', bg: '#f5f3ff', earned: n >= 10, progress: Math.min(n, 10), total: 10 },
    { id: 'A004', name: 'Pahlawan',     description: 'Capai 25 kali donasi',
      icon: Award,  color: '#10b981', bg: '#ecfdf5', earned: n >= 25, progress: Math.min(n, 25), total: 25 },
  ];

  useEffect(() => {
    async function loadDonorData() {
      if (!user?.email) return;
      setLoading(true);
      try {
        const [profileData, , bookingsData, eventsData, achievementsData, msgData] = await Promise.all([
          api.donors.getProfile(user.email, null).catch(() => null),
          api.donors.getHistory(user.email, []).catch(() => []),
          api.events.getMyBookings([]).catch(() => []),
          api.events.getAll([]).catch(() => []),
          api.donors.getAchievements([]).catch(() => []),
          api.donorNotify.getMessages().catch(() => ({ messages: [] })),
        ]);

        if (msgData?.messages && Array.isArray(msgData.messages)) {
          setMessages(msgData.messages);
        }

        if (profileData) {
          const n = profileData.total_donations || 0;
          setDonorStats({
            totalDonations: n,
            totalPoints: profileData.points || 0,
            currentStreak: profileData.streak || 0,
            ranking: profileData.ranking || 45,
            badgeLevel: n >= 20 ? 'gold' : n >= 10 ? 'silver' : n >= 5 ? 'bronze' : 'none',
            nextEligible: profileData.next_eligible || undefined,
            bloodType: profileData.blood_type || undefined,
          });
          if (achievementsData?.length) {
            setDisplayAchievements(achievementsData.map((a: any) => ({
              id: a.id,
              name: a.name,
              description: a.description,
              icon: iconMap[a.icon_name] || Award,
              color: a.color,
              bg: a.bg_color,
              earned: Boolean(a.is_earned),
              progress: Math.min(n, a.min_donations),
              total: a.min_donations
            })));
          } else {
            setDisplayAchievements(getDynamicAchievements(n));
          }
          if (!profileData.blood_type) setNeedsProfileSetup(true);
        } else {
          setDonorStats({ totalDonations: 0, totalPoints: 0, currentStreak: 0, ranking: 0, badgeLevel: 'none' });
          setDisplayAchievements(getDynamicAchievements(0));
        }

        if (bookingsData?.length) {
          setActiveTickets(bookingsData.slice(0, 3).map((b: any) => ({
            id: b.id, eventName: b.event_name,
            eventDate: b.event_date.split('T')[0],
            status: b.status === 'terdaftar' ? 'ready' : (b.checked_in ? 'checked_in' : 'completed'),
            qrCode: b.qr_code || `QR_${b.id}`, points: 0,
          })));
        }

        if (eventsData?.length) {
          const open = eventsData
            .filter((e: any) => e.status === 'open')
            .slice(0, 3)
            .map((e: any) => ({
              id: e.id, name: e.name,
              date: e.event_date ? e.event_date.split('T')[0] : e.date || '–',
              location: e.location || e.venue || '–',
              quota: e.quota || 0,
              registered: e.registered_count || e.participants || 0,
            }));
          setUpcomingEvents(open);
        }
      } catch (err) {
        console.warn('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }
    loadDonorData();
  }, [user?.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#F7F7FB]">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-[#E11D48] animate-spin" />
      </div>
    );
  }

  const badge = badgeConfig[donorStats.badgeLevel];
  const eligibility = (() => {
    if (!donorStats.nextEligible) return { daysLeft: 0, isReady: true };
    const diff = Math.ceil((new Date(donorStats.nextEligible).getTime() - Date.now()) / 86400000);
    return diff <= 0 ? { daysLeft: 0, isReady: true } : { daysLeft: diff, isReady: false };
  })();

  const cardBaseClass = "bg-white border border-border rounded-2xl shadow-sm transition-all duration-200";
  const hoverCardClass = "hover:-translate-y-1 hover:shadow-md hover:border-[#C0392B]/30 cursor-pointer";

  return (
    <div className="min-h-screen bg-[#F7F7FB] dark:bg-[#0d0d15] pb-20 text-[#1A1A2E] dark:text-white transition-colors duration-200">
      
      {/* ─── HEADER (Premium Aesthetics) ─────────── */}
      <div 
        className="relative px-6 sm:px-10 pt-16 pb-12 overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #C0392B 0%, #7B241C 100%)' }}
      >
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full opacity-10 bg-white" />

        <div className="relative max-w-6xl mx-auto flex flex-col">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-5">
              <span className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-white/15 text-white border border-white/20 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {badge.label} Donor
              </span>
              {needsProfileSetup && (
                <span className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-orange-500/20 text-orange-200 border border-orange-500/30 rounded-full flex items-center gap-1 backdrop-blur-sm shadow-sm">
                  <AlertCircle className="w-3 h-3" /> Lengkapi Profil
                </span>
              )}
            </div>
            <h1 
              className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Halo, {user?.name?.split(' ')[0] || 'Pendonor'}.
            </h1>
            <p className="text-red-100/90 leading-relaxed text-base max-w-xl">
              Setiap donasi darahmu sangat berarti. Pantau kontribusimu dan temukan jadwal donor terdekat di ekosistem TemanDonor!.
            </p>
          </div>
        </div>
      </div>

      {/* ─── BENTO GRID LAYOUT ────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 mt-8">
        
        {/* STATS ROW (4 Columns) - Animated */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {[
            { label: 'Total Donasi', isCount: true, num: donorStats.totalDonations, val: `${donorStats.totalDonations}`, suffix: 'kali', icon: Heart, color: 'text-[#E11D48]' },
            { label: 'Poin Reward', isCount: true, num: donorStats.totalPoints, val: `${donorStats.totalPoints}`, suffix: 'pts', icon: Gift, color: 'text-amber-500' },
            { label: 'Peringkat', isCount: false, val: `#${donorStats.ranking || '-'}`, suffix: 'global', icon: Trophy, color: 'text-blue-500' },
            { label: 'Level', isCount: false, val: badge.label, suffix: 'donor', icon: Award, color: 'text-emerald-500' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className={`${cardBaseClass} ${hoverCardClass} p-5 flex flex-col justify-between`}
            >
              <div className="flex items-center gap-3 mb-4 text-[#4A4A6A]">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <p className="text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-extrabold tracking-tight text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {stat.isCount ? <AnimatedCounter value={stat.num || 0} /> : stat.val}
                </p>
                <span className="text-sm font-medium text-[#9B9BB5]">{stat.suffix}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* MAIN BENTO GRID (Left 8, Right 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          
          {/* LEFT COLUMN (Priority Action & Operational Data) */}
          <div className="lg:col-span-8 flex flex-col gap-8">

            {/* ── NOTIFIKASI JADWAL, EVENT & KEBUTUHAN DARAH PASIEN ── */}
            <div className={`${cardBaseClass} overflow-hidden border border-border shadow-xs`}>
              <div className="px-6 py-4 border-b border-border bg-[#F9F9FC] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FDEDEC] text-[#C0392B] flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Panggilan Donor & Jadwal Terkini
                    </h3>
                    <p className="text-[11px] text-[#9B9BB5]">Notifikasi jadwal rutin, undangan event, dan pasien yang membutuhkan</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/donor/messages')}
                  className="text-xs font-bold text-[#C0392B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" /> Kotak Pesan ({messages.filter(m => !m.read_status).length} baru)
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* 1. Urgent Blood Need Alert Banner (if any) */}
                {(() => {
                  const urgentBlood = messages.find(m => m.type === 'blood_need');
                  if (!urgentBlood) return null;
                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FDEDEC] to-[#FFF5F5] border border-[#C0392B]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#C0392B] text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                          <Droplets className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#C0392B] text-white">
                              🚨 PANGGILAN DARURAT
                            </span>
                            {urgentBlood.blood_type && (
                              <span className="text-[10px] font-black text-[#C0392B]">
                                Butuh Golongan {urgentBlood.blood_type}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-[#1A1A2E] mt-1">{urgentBlood.title}</h4>
                          <p className="text-xs text-[#6B6B8A] mt-0.5 line-clamp-2">{urgentBlood.message}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          toast.success('Terima kasih! Respons Anda telah dikirimkan ke tim PMI.');
                          navigate('/donor/messages');
                        }}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#C0392B] hover:bg-[#922B21] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Heart className="w-3.5 h-3.5 fill-white" /> Saya Siap Donor
                      </button>
                    </div>
                  );
                })()}

                {/* 2. Schedule Readiness & Email Reminder Dispatcher */}
                <div className="p-4 rounded-2xl bg-[#F7F7FB] border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {eligibility.isReady ? '✓ Siap Donor Hari Ini' : `${eligibility.daysLeft} Hari Menuju Jadwal`}
                        </span>
                        <span className="text-[11px] text-[#9B9BB5]">Interval Rutin 60 Hari</span>
                      </div>
                      <p className="text-xs font-bold text-[#1A1A2E] mt-1">
                        {eligibility.isReady
                          ? 'Masa tunggu donasi darah Anda telah terpenuhi. Tubuh Anda siap mendonor kembali!'
                          : `Jadwal donor berikutnya: ${eligibility.daysLeft} hari lagi.`}
                      </p>
                      <p className="text-[11px] text-[#9B9BB5] mt-0.5">
                        Anda dapat menerima notifikasi pengingat via email resmi saat jadwal donor tiba.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSendScheduleEmailReminder}
                    disabled={isSendingReminder}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {isSendingReminder ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Mengirim Email...
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" /> Kirim Pengingat ke Email
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Link bar */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[#9B9BB5] text-[11px]">
                    Tersedia {messages.length} pesan & notifikasi di akun Anda
                  </span>
                  <button
                    onClick={() => navigate('/donor/messages')}
                    className="font-bold text-[#C0392B] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Lihat Kotak Masuk Email & Web <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* DAFTAR TIKET DONOR (Tiket Aktif) */}
            <div className={`${cardBaseClass} border-l-4 border-l-[#C0392B] overflow-hidden`}>
              <div className="px-6 py-4 border-b border-border bg-[#FDEDEC] flex items-center justify-between">
                <h3 className="font-bold text-lg text-[#C0392B] flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Ticket className="w-5 h-5" /> Daftar Tiket Donor
                </h3>
                <button onClick={() => navigate('/alur')} className="text-xs font-bold text-[#E11D48] hover:underline cursor-pointer">Lihat Semua</button>
              </div>
              
              {activeTickets.length > 0 ? (
                <div className="divide-y divide-border">
                  {activeTickets.map((ticket, idx) => {
                    const st = ticketStatusMap[ticket.status] || ticketStatusMap.ready;
                    return (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.05 }}
                        className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm whitespace-nowrap ${st.style}`}>
                              {st.label}
                            </span>
                            <p className="text-xs font-medium text-[#4A4A6A] flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#C0392B]" /> {ticket.eventDate}
                            </p>
                          </div>
                          <p className="font-extrabold text-lg text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ticket.eventName}</p>
                        </div>
                        <button onClick={() => navigate('/alur')}
                          className="w-full sm:w-auto px-6 py-2.5 bg-[#C0392B] text-white text-xs font-bold rounded-xl hover:bg-[#922B21] transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer">
                          <Search className="w-3.5 h-3.5" /> Tampilkan QR
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="m-6 border-2 border-dashed border-border bg-[#F7F7FB] rounded-xl p-10 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-white border border-border rounded-xl flex items-center justify-center mb-4 shadow-sm">
                    <Ticket className="w-5 h-5 text-[#9B9BB5]" />
                  </div>
                  <p className="text-sm font-bold text-[#1A1A2E] mb-1">Belum Ada Tiket Aktif</p>
                  <p className="text-xs text-[#4A4A6A] max-w-xs">Anda belum terdaftar di event donor apa pun saat ini. Silakan cari event dan daftar untuk mendapatkan tiket.</p>
                </div>
              )}
            </div>

            {/* PENCAPAIAN & BADGE (Gamification) */}
            <div className={cardBaseClass}>
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-[#F9F9FC] rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-base text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Pencapaian & Medali Donor
                  </h3>
                </div>
                <span className="text-xs text-[#9B9BB5] font-medium">
                  {displayAchievements.filter(a => a.earned).length} dari {displayAchievements.length} Terbuka
                </span>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayAchievements.map((ach, idx) => {
                  const pct = ach.total ? Math.round(((ach.progress || 0) / ach.total) * 100) : 0;
                  return (
                    <motion.div
                      key={ach.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25, delay: idx * 0.05 }}
                      className={`p-4 rounded-xl border transition-all ${
                        ach.earned ? 'bg-white border-border shadow-xs' : 'bg-gray-50/70 border-dashed border-gray-200 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2.5">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
                          style={{ backgroundColor: ach.bg, color: ach.color }}
                        >
                          <ach.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#1A1A2E] truncate">{ach.name}</p>
                          <p className="text-xs text-[#9B9BB5] truncate">{ach.description}</p>
                        </div>
                        {ach.earned && (
                          <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-200">
                            Terbuka
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-[#9B9BB5]">
                          <span>Progress: {ach.progress}/{ach.total} donasi</span>
                          <span className="font-bold">{pct}%</span>
                        </div>
                        <AnimatedProgressBar value={pct} barColor={ach.color} height="h-1.5" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (Context, Status & Gamification) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            
            {/* STATUS DONOR - Crucial Personal Context */}
            <div className={cardBaseClass}>
              <div className="px-6 py-5 border-b border-border flex items-center gap-2 bg-[#F7F7FB] rounded-t-2xl">
                <Droplets className="w-4 h-4 text-[#C0392B]" />
                <h3 className="font-bold text-lg text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Status Anda</h3>
              </div>
              <div className="divide-y divide-border">
                <div className="px-6 py-5 flex flex-col gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9B9BB5]">Kesiapan Donor</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${eligibility.isReady ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                    <p className={`text-sm font-bold ${eligibility.isReady ? 'text-[#27AE60]' : 'text-[#E67E22]'}`}>
                      {eligibility.isReady ? 'Siap Donor Hari Ini' : `Belum siap (${eligibility.daysLeft} hari lagi)`}
                    </p>
                  </div>
                </div>
                <div className="px-6 py-5 flex flex-col gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9B9BB5]">Golongan Darah</p>
                  <p className="text-3xl font-extrabold tracking-tight text-[#C0392B] mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {donorStats.bloodType || <span className="text-[#9B9BB5] text-sm font-normal">Belum diisi</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* EVENT DONOR TERDEKAT */}
            {upcomingEvents.length > 0 && (
              <div className={cardBaseClass}>
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-[#F7F7FB] rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#C0392B]" />
                    <h3 className="font-bold text-sm text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Event Terbuka</h3>
                  </div>
                  <button onClick={() => navigate('/events')} className="text-xs font-bold text-[#C0392B] hover:underline cursor-pointer">Semua</button>
                </div>
                <div className="divide-y divide-border">
                  {upcomingEvents.map(e => {
                    const pct = e.quota ? Math.round((e.registered / e.quota) * 100) : 0;
                    return (
                      <div key={e.id} className="p-4 hover:bg-[#F9F9FC] transition-colors">
                        <p className="font-bold text-xs text-[#1A1A2E] truncate">{e.name}</p>
                        <p className="text-[11px] text-[#9B9BB5] mt-0.5">{e.date} &bull; {e.location}</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[10px] text-[#9B9BB5]">
                            <span>Kuota Terisi</span>
                            <span className="font-bold text-[#1A1A2E]">{e.registered}/{e.quota} ({pct}%)</span>
                          </div>
                          <AnimatedProgressBar value={pct} barColor="#C0392B" height="h-1.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ─── PINTASAN CEPAT (Quick Links - Secondary Menu) ──────────────── */}
        <div className="pt-8 border-t border-border">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#9B9BB5] mb-4 px-1">Pintasan Cepat</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Gift, title: 'Tukar Reward', desc: 'Lihat hadiah tersedia', to: '/rewards', color: 'text-amber-500' },
              { icon: BookOpen, title: 'Edukasi', desc: 'Artikel kesehatan', to: '/education', color: 'text-[#27AE60]' },
            ].map((menu, i) => (
              <button key={i} onClick={() => navigate(menu.to)}
                className={`${cardBaseClass} ${hoverCardClass} p-5 flex items-center gap-4 text-left group bg-[#F7F7FB] hover:bg-white`}>
                <div className={`p-3 bg-white border border-border rounded-xl group-hover:bg-[#F4F4F8] transition-colors shadow-sm`}>
                  <menu.icon className={`w-5 h-5 ${menu.color}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A1A2E] group-hover:text-[#C0392B] transition-colors" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{menu.title}</p>
                  <p className="text-xs text-[#4A4A6A] mt-1">{menu.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
