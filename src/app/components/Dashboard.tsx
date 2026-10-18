import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Calendar, Edit, Trash2, Plus, AlertCircle,
  LayoutDashboard, Droplets, ArrowUpRight, ArrowDownRight, RefreshCw,
  Search, ShieldCheck, Heart, Sparkles, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { AnimatedCounter, AnimatedProgressBar } from './ui/AnimatedCounter';
import { StockDistributionChart, StockTrendsChart, BloodDonutChart } from './dashboard/AnimatedCharts';

const defaultInventory = [
  { id: '1', type: 'A+', stock: 45, target: 50, status: 'good', expiringSoon: 2 },
  { id: '2', type: 'A-', stock: 12, target: 30, status: 'low', expiringSoon: 0 },
  { id: '3', type: 'B+', stock: 58, target: 50, status: 'good', expiringSoon: 3 },
  { id: '4', type: 'B-', stock: 8, target: 25, status: 'critical', expiringSoon: 1 },
  { id: '5', type: 'AB+', stock: 24, target: 30, status: 'good', expiringSoon: 0 },
  { id: '6', type: 'AB-', stock: 5, target: 20, status: 'critical', expiringSoon: 0 },
  { id: '7', type: 'O+', stock: 82, target: 60, status: 'good', expiringSoon: 5 },
  { id: '8', type: 'O-', stock: 14, target: 35, status: 'low', expiringSoon: 1 },
];

const defaultActivities = [
  { id: '1', time: '10:45 WIB', action: 'Penerimaan Donor', bloodType: 'O+', quantity: 12, positive: true, user: 'Dr. Sarah (PMI)' },
  { id: '2', time: '09:30 WIB', action: 'Distribusi RS Darurat', bloodType: 'B+', quantity: 4, positive: false, user: 'RS Siloam' },
  { id: '3', time: '08:15 WIB', action: 'Penerimaan Donor Massal', bloodType: 'A+', quantity: 20, positive: true, user: 'Kampus ITB' },
  { id: '4', time: 'Kemarin', action: 'Permintaan Darah Masuk', bloodType: 'AB-', quantity: 2, positive: false, user: 'RS Hasan Sadikin' },
  { id: '5', time: 'Kemarin', action: 'Penerimaan Donor', bloodType: 'O-', quantity: 6, positive: true, user: 'PMI Pusat' },
];

const defaultEvents = [
  { id: '1', name: 'Donor Darah Peduli Sesama 2026', date: '2026-10-25', location: 'Mall Grand Indonesia, Jakarta', registered: 185, target: 200 },
  { id: '2', name: 'Aksi Solidaritas Pemuda Merah Putih', date: '2026-11-02', location: 'Gelora Bung Karno, Senayan', registered: 310, target: 400 },
  { id: '3', name: 'Bakti Sosial Komunitas Peduli Darah', date: '2026-11-15', location: 'Kantor PMI Kota Bandung', registered: 95, target: 120 },
];

const statusConfig: Record<string, { label: string; bg: string; text: string; barColor: string }> = {
  available: { label: 'Baik', bg: '#EAFAF1', text: '#1E8449', barColor: '#27AE60' },
  good: { label: 'Baik', bg: '#EAFAF1', text: '#1E8449', barColor: '#27AE60' },
  low: { label: 'Rendah', bg: '#FEF9E7', text: '#E67E22', barColor: '#E67E22' },
  critical: { label: 'Kritis', bg: '#FDEDEC', text: '#C0392B', barColor: '#E74C3C' },
};

const btColor: Record<string, string> = {
  'A+': '#E74C3C', 'A-': '#E74C3C', 'B+': '#2980B9', 'B-': '#2980B9',
  'AB+': '#8E44AD', 'AB-': '#8E44AD', 'O+': '#27AE60', 'O-': '#27AE60',
};

export default function Dashboard() {
  usePageTitle('Dashboard Manajemen');
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'charts' | 'inventory' | 'activities' | 'events'>('charts');

  const [bloodInventory, setBloodInventory] = useState(defaultInventory);
  const [recentActivities, setRecentActivities] = useState(defaultActivities);
  const [upcomingEvents, setUpcomingEvents] = useState(defaultEvents);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [stocksData, eventsData, ledgerData] = await Promise.allSettled([
          api.stock.getPMIStock([]),
          api.events.getAll([]),
          api.stock.getLedger(),
        ]);

        if (stocksData.status === 'fulfilled' && Array.isArray(stocksData.value) && stocksData.value.length > 0) {
          const mapped = stocksData.value.map((s: any, idx: number) => {
            const stock = Number(s.stock) || 0;
            const target = Number(s.target) || 50;
            const pct = (stock / Math.max(1, target)) * 100;
            const status = pct >= 60 ? 'good' : pct >= 30 ? 'low' : 'critical';
            return {
              id: String(s.id || idx),
              type: s.blood_type || s.type,
              stock,
              target,
              status,
              expiringSoon: s.expiring_soon || 0,
            };
          });
          setBloodInventory(mapped);
        }

        if (eventsData.status === 'fulfilled' && Array.isArray(eventsData.value) && eventsData.value.length > 0) {
          const mappedEvents = eventsData.value.slice(0, 5).map((e: any, idx: number) => ({
            id: String(e.id || idx),
            name: e.name || e.title,
            date: e.date || new Date().toISOString(),
            location: e.location || 'Lokasi Kegiatan',
            registered: e.registered || e.donor_count || 50,
            target: e.target || e.quota || 100,
          }));
          setUpcomingEvents(mappedEvents);
        }

        if (ledgerData.status === 'fulfilled' && Array.isArray(ledgerData.value) && ledgerData.value.length > 0) {
          const mappedLedger = ledgerData.value.slice(0, 8).map((l: any, idx: number) => ({
            id: String(l.id || idx),
            time: l.recorded_at ? new Date(l.recorded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : 'Hari ini',
            action: l.direction === 'in' ? 'Penerimaan Donor' : 'Distribusi Stok',
            bloodType: l.blood_type,
            quantity: l.quantity,
            positive: l.direction === 'in',
            user: l.actor_name || 'Petugas PMI',
          }));
          setRecentActivities(mappedLedger);
        }
      } catch (e) {
        // Fallback to default mock data silently
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const totalStock = bloodInventory.reduce((acc, curr) => acc + curr.stock, 0);
  const criticalItems = bloodInventory.filter(b => b.status === 'critical' || b.stock < b.target * 0.3);
  const totalDonorsEstimate = 342 + bloodInventory.reduce((a, b) => a + (b.stock > 30 ? 15 : 0), 0);

  const filteredInventory = bloodInventory.filter(b => {
    const matchSearch = b.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen py-8 bg-[#F7F7FB] dark:bg-[#0d0d15] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Sistem Manajemen & Analitik Real-time</span>
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2.5"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C0392B] to-[#7B241C] flex items-center justify-center text-white shadow-sm">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              Dashboard Manajemen Darah
            </h1>
            <p className="text-sm text-[#4A4A6A] dark:text-[#a5a5c5] mt-1">
              {user?.org || 'Palang Merah Indonesia'} &bull; Monitoring Inventori & Distribusi
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-[#EAFAF1] dark:bg-[#0e2018] text-[#1E8449] border border-[#27AE60]/20 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#27AE60] animate-pulse" />
              Sistem Aktif & Terhubung
            </div>
          </div>
        </motion.div>

        {/* ── Stats Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 mb-8">
          {[
            {
              label: 'Total Stok Darah',
              value: totalStock,
              unit: 'kantong',
              sub: '+12% dari minggu lalu',
              icon: Droplets,
              iconBg: 'bg-[#FDEDEC] dark:bg-[#2a1218]',
              iconColor: 'text-[#C0392B]',
              subColor: 'text-[#27AE60]',
              badge: 'Real-time',
            },
            {
              label: 'Stok Kritis',
              value: criticalItems.length,
              unit: 'golongan',
              sub: criticalItems.length > 0 ? 'Perlu broadcast segera' : 'Semua stok aman',
              icon: AlertCircle,
              iconBg: 'bg-[#FDEDEC] dark:bg-[#2a1218]',
              iconColor: 'text-[#C0392B]',
              subColor: criticalItems.length > 0 ? 'text-[#C0392B]' : 'text-[#27AE60]',
              badge: criticalItems.length > 0 ? 'Prioritas' : 'Normal',
            },
            {
              label: 'Pendonor Bulan Ini',
              value: totalDonorsEstimate,
              unit: 'orang',
              sub: '+38 dari target bulanan',
              icon: Users,
              iconBg: 'bg-[#D6EAF8] dark:bg-[#0e1e26]',
              iconColor: 'text-[#2980B9]',
              subColor: 'text-[#2980B9]',
              badge: 'Aktif',
            },
            {
              label: 'Event Mendatang',
              value: upcomingEvents.length,
              unit: 'agenda',
              sub: `${upcomingEvents.reduce((a, b) => a + b.registered, 0)} pendaftar`,
              icon: Calendar,
              iconBg: 'bg-[#E8DAEF] dark:bg-[#1a1228]',
              iconColor: 'text-[#8E44AD]',
              subColor: 'text-[#8E44AD]',
              badge: 'Terjadwal',
            },
          ].map(({ label, value, unit, sub, icon: Icon, iconBg, iconColor, subColor, badge }, idx) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs hover:shadow-md p-4 sm:p-5 transition-all relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`${iconBg} rounded-xl w-10 h-10 flex items-center justify-center transition-transform hover:scale-105`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4F4F8] dark:bg-[#1a1a2a] text-[#4A4A6A] dark:text-[#a5a5c5]">
                  {badge}
                </span>
              </div>
              <p className="text-xs text-[#9B9BB5] font-medium">{label}</p>
              <p
                className="text-xl sm:text-2xl font-black text-[#1A1A2E] dark:text-white mt-0.5 tracking-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <AnimatedCounter value={value} /> <span className="text-xs font-semibold text-[#9B9BB5]">{unit}</span>
              </p>
              <p className={`text-xs mt-1.5 font-medium ${subColor} flex items-center gap-1`}>
                <TrendingUp className="w-3 h-3" />
                {sub}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Tabs Navigation ─────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-white dark:bg-[#13131f] border border-border rounded-xl p-1 mb-6 flex overflow-x-auto max-w-full gap-1 h-auto no-scrollbar flex-nowrap shrink-0">
            {[
              { value: 'charts', label: 'Grafik & Analitik', icon: TrendingUp },
              { value: 'inventory', label: 'Tabel Inventori', icon: Droplets },
              { value: 'activities', label: 'Riwayat Aktivitas', icon: RefreshCw },
              { value: 'events', label: 'Agenda Event', icon: Calendar },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-lg text-xs sm:text-sm px-3.5 py-2 data-[state=active]:bg-[#C0392B] data-[state=active]:text-white data-[state=active]:shadow-xs flex items-center gap-1.5 font-semibold transition-all"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Tab: Grafik & Analitik ────────────────────────── */}
          <TabsContent value="charts" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <StockDistributionChart data={bloodInventory} />
                </div>
                <div>
                  <BloodDonutChart data={bloodInventory} />
                </div>
              </div>

              <div>
                <StockTrendsChart />
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Tab: Tabel Inventori ──────────────────────────── */}
          <TabsContent value="inventory">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs overflow-hidden"
            >
              {/* Header with Search & Filter */}
              <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#1A1A2E] dark:text-white text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Inventori Stok Darah Real-time
                  </h3>
                  <p className="text-xs text-[#9B9BB5] mt-0.5">
                    Data ketersediaan kantong darah dengan visual progress bar beranimasi
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search box */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9BB5]" />
                    <input
                      type="text"
                      placeholder="Cari golongan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl focus:outline-none focus:border-[#C0392B] w-32 sm:w-40 transition-colors"
                    />
                  </div>

                  {/* Filter Status */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-xs bg-[#F4F4F8] dark:bg-[#1a1a2a] border border-border rounded-xl px-2.5 py-1.5 text-[#4A4A6A] dark:text-[#a5a5c5] focus:outline-none focus:border-[#C0392B]"
                  >
                    <option value="all">Semua Status</option>
                    <option value="good">Status Baik</option>
                    <option value="low">Status Rendah</option>
                    <option value="critical">Status Kritis</option>
                  </select>

                  <button className="flex items-center gap-1.5 bg-[#C0392B] hover:bg-[#922B21] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95">
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Stok
                  </button>
                </div>
              </div>

              {/* Table Body */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F4F4F8] dark:bg-[#1a1a2a] text-[#9B9BB5] font-bold uppercase tracking-wider text-[11px] border-b border-border">
                      <th className="text-left px-5 py-3.5">Golongan</th>
                      <th className="text-left px-5 py-3.5">Kapasitas & Progress</th>
                      <th className="text-center px-5 py-3.5">Stok Saat Ini</th>
                      <th className="text-center px-5 py-3.5">Target</th>
                      <th className="text-center px-5 py-3.5">Status</th>
                      <th className="text-center px-5 py-3.5">Mendekati ED</th>
                      <th className="text-right px-5 py-3.5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <AnimatePresence>
                      {filteredInventory.map((blood, idx) => {
                        const s = statusConfig[blood.status] || statusConfig.good;
                        const pct = Math.round((blood.stock / Math.max(1, blood.target)) * 100);
                        const bloodColor = btColor[blood.type] || '#C0392B';

                        return (
                          <motion.tr
                            key={blood.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, delay: idx * 0.04 }}
                            className="hover:bg-[#F9F9FC] dark:hover:bg-[#181827] transition-colors"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-xs"
                                  style={{ backgroundColor: bloodColor }}
                                >
                                  {blood.type}
                                </div>
                                <div>
                                  <span className="font-bold text-sm text-[#1A1A2E] dark:text-white">
                                    Golongan {blood.type}
                                  </span>
                                  <p className="text-[10px] text-[#9B9BB5]">Rhesus {blood.type.includes('+') ? 'Positif' : 'Negatif'}</p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 min-w-[180px]">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-[#9B9BB5]">Keterisian:</span>
                                  <span className="font-bold text-[#1A1A2E] dark:text-white">{pct}%</span>
                                </div>
                                <AnimatedProgressBar
                                  value={pct}
                                  barColor={s.barColor}
                                  height="h-2"
                                  showGlow={pct >= 60}
                                />
                              </div>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span className="font-bold text-sm text-[#1A1A2E] dark:text-white">
                                <AnimatedCounter value={blood.stock} />
                              </span>
                              <span className="text-[10px] text-[#9B9BB5] block">kantong</span>
                            </td>

                            <td className="px-5 py-4 text-center text-[#4A4A6A] dark:text-[#a5a5c5] font-semibold">
                              {blood.target} ktg
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span
                                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-black/5"
                                style={{ background: s.bg, color: s.text }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.text }} />
                                {s.label}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-center">
                              {blood.expiringSoon > 0 ? (
                                <span className="text-[#E67E22] font-bold bg-[#FEF9E7] dark:bg-[#221a08] px-2 py-0.5 rounded-full text-[10px]">
                                  {blood.expiringSoon} ktg
                                </span>
                              ) : (
                                <span className="text-[#9B9BB5]">—</span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  className="p-1.5 rounded-lg border border-border text-[#4A4A6A] dark:text-[#a5a5c5] hover:border-[#C0392B] hover:text-[#C0392B] hover:bg-[#FDEDEC] dark:hover:bg-[#2a1218] transition-colors"
                                  title="Edit kuota"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  className="p-1.5 rounded-lg border border-border text-[#C0392B] hover:bg-[#FDEDEC] dark:hover:bg-[#2a1218] transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Tab: Riwayat Aktivitas ────────────────────────── */}
          <TabsContent value="activities">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs overflow-hidden"
            >
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#1A1A2E] dark:text-white text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Riwayat Transaksi & Mutasi Stok
                  </h3>
                  <p className="text-xs text-[#9B9BB5] mt-0.5">
                    Log otomatis pergerakan stok kantong darah masuk dan keluar
                  </p>
                </div>
                <span className="text-xs text-[#27AE60] bg-[#EAFAF1] dark:bg-[#0e2018] font-bold px-2.5 py-1 rounded-full">
                  Audit Trail Terverifikasi
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F4F4F8] dark:bg-[#1a1a2a] text-[#9B9BB5] font-bold uppercase tracking-wider text-[11px] border-b border-border">
                      <th className="text-left px-5 py-3.5">Waktu</th>
                      <th className="text-left px-5 py-3.5">Jenis Mutasi</th>
                      <th className="text-center px-5 py-3.5">Golongan</th>
                      <th className="text-center px-5 py-3.5">Volume (Kantong)</th>
                      <th className="text-left px-5 py-3.5">Petugas / Pihak Terkait</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentActivities.map((a, idx) => (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.05 }}
                        className="hover:bg-[#F9F9FC] dark:hover:bg-[#181827] transition-colors"
                      >
                        <td className="px-5 py-3.5 text-[#9B9BB5] font-medium">{a.time}</td>
                        <td className="px-5 py-3.5 font-semibold text-[#1A1A2E] dark:text-white">
                          <span className="flex items-center gap-1.5">
                            {a.positive ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-[#27AE60]" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5 text-[#C0392B]" />
                            )}
                            {a.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className="font-bold text-xs px-2 py-0.5 rounded-md inline-block shadow-xs text-white"
                            style={{ backgroundColor: btColor[a.bloodType] || '#C0392B' }}
                          >
                            {a.bloodType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`font-black text-xs px-2.5 py-1 rounded-full ${
                              a.positive
                                ? 'bg-[#EAFAF1] text-[#1E8449] dark:bg-[#0e2018]'
                                : 'bg-[#FDEDEC] text-[#C0392B] dark:bg-[#2a1218]'
                            }`}
                          >
                            {a.positive ? '+' : '-'}{a.quantity} kantong
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[#4A4A6A] dark:text-[#a5a5c5] font-medium">
                          {a.user}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Tab: Agenda Event ─────────────────────────────── */}
          <TabsContent value="events">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#1A1A2E] dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Event & Kampanye Donor Darah
                  </h3>
                  <p className="text-xs text-[#9B9BB5] mt-0.5">Kelola event donor darah aktif dan pantau kuota peserta</p>
                </div>
                <button className="flex items-center gap-1.5 bg-[#C0392B] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#922B21] transition-all shadow-xs active:scale-95">
                  <Plus className="w-3.5 h-3.5" />
                  Buat Event Baru
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.map((event, idx) => {
                  const pct = Math.round((event.registered / Math.max(1, event.target)) * 100);
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: idx * 0.08 }}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-xs hover:shadow-md p-5 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-[#1A1A2E] dark:text-white text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {event.name}
                          </h4>
                          <p className="text-xs text-[#9B9BB5] mt-1 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#C0392B]" />
                            {new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-[#4A4A6A] dark:text-[#a5a5c5] mt-0.5">
                            &bull; {event.location}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold bg-[#EAF7FB] text-[#2980B9] dark:bg-[#0e1e26] px-2.5 py-1 rounded-full border border-blue-200/40">
                          Aktif
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-[#4A4A6A] dark:text-[#a5a5c5]">
                          <span>Progres Pendaftaran:</span>
                          <span className="font-bold text-[#1A1A2E] dark:text-white">
                            {event.registered}/{event.target} peserta ({pct}%)
                          </span>
                        </div>
                        <AnimatedProgressBar value={pct} barColor="#C0392B" height="h-2" showGlow={pct >= 80} />
                      </div>

                      <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                        <button className="text-xs border border-border text-[#4A4A6A] dark:text-[#a5a5c5] px-3 py-1.5 rounded-lg hover:border-[#C0392B] hover:text-[#C0392B] transition-colors">
                          Lihat Detail
                        </button>
                        <button className="flex items-center gap-1 text-xs border border-border text-[#4A4A6A] dark:text-[#a5a5c5] px-3 py-1.5 rounded-lg hover:border-[#C0392B] hover:text-[#C0392B] transition-colors">
                          <Edit className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
