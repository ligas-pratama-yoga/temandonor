import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, ReferenceLine, Cell, PieChart, Pie
} from 'recharts';
import { TrendingUp, BarChart3, Activity, PieChart as PieIcon, Filter, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedCounter } from '../ui/AnimatedCounter';

const btColors: Record<string, string> = {
  'A+': '#E74C3C',
  'A-': '#E74C3C',
  'B+': '#2980B9',
  'B-': '#2980B9',
  'AB+': '#8E44AD',
  'AB-': '#8E44AD',
  'O+': '#27AE60',
  'O-': '#27AE60',
};

export interface BloodStockItem {
  type: string;
  stock: number;
  target: number;
  status?: string;
  expiringSoon?: number;
}

// ─── Custom Animated Tooltip for Stock Chart ──────────────────
function CustomStockTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const stock = data.stock ?? 0;
    const target = data.target ?? 50;
    const pct = Math.round((stock / Math.max(1, target)) * 100);
    const color = btColors[label] || '#C0392B';

    let statusText = 'Aman';
    let statusBg = '#EAFAF1';
    let statusColor = '#1E8449';
    if (pct < 30) {
      statusText = 'Kritis';
      statusBg = '#FDEDEC';
      statusColor = '#C0392B';
    } else if (pct < 60) {
      statusText = 'Rendah';
      statusBg = '#FEF9E7';
      statusColor = '#E67E22';
    }

    return (
      <div className="bg-white/95 dark:bg-[#181827]/95 backdrop-blur-md border border-border shadow-xl rounded-2xl p-3.5 min-w-[190px] text-xs transition-all">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/70">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-bold text-sm text-[#1A1A2E] dark:text-white">Golongan {label}</span>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: statusBg, color: statusColor }}
          >
            {statusText}
          </span>
        </div>
        <div className="space-y-1.5 text-[#4A4A6A] dark:text-[#a5a5c5]">
          <div className="flex justify-between items-center">
            <span>Stok Tersedia:</span>
            <span className="font-bold text-[#1A1A2E] dark:text-white text-sm">{stock} <span className="text-[11px] font-normal text-[#9B9BB5]">kantong</span></span>
          </div>
          <div className="flex justify-between items-center">
            <span>Target Ideal:</span>
            <span className="font-semibold">{target} kantong</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Tingkat Keterisian:</span>
            <span className="font-bold" style={{ color }}>{pct}%</span>
          </div>
          {data.expiringSoon > 0 && (
            <div className="flex justify-between items-center pt-1 border-t border-border/40 text-[#E67E22] font-medium">
              <span>Mendekati ED:</span>
              <span>{data.expiringSoon} kantong</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

// ─── 1. Animated Stock Distribution Bar Chart ────────────────
export function StockDistributionChart({
  data,
  title = "Grafik Distribusi Stok per Golongan Darah",
}: {
  data: BloodStockItem[];
  title?: string;
}) {
  const [filter, setFilter] = useState<'all' | 'pos' | 'neg' | 'critical'>('all');

  const filteredData = data.filter((item) => {
    if (filter === 'pos') return item.type.includes('+');
    if (filter === 'neg') return item.type.includes('-');
    if (filter === 'critical') {
      const pct = (item.stock / Math.max(1, item.target)) * 100;
      return pct < 60;
    }
    return true;
  });

  const totalStock = data.reduce((acc, curr) => acc + curr.stock, 0);
  const criticalCount = data.filter(d => (d.stock / Math.max(1, d.target)) < 0.3).length;

  return (
    <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-sm p-5 transition-all hover:shadow-md">
      {/* Header with Title and Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FDEDEC] dark:bg-[#2a1218] flex items-center justify-center text-[#C0392B]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A2E] dark:text-white text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {title}
              </h3>
              <p className="text-xs text-[#9B9BB5]">
                Real-time inventori kantong darah vs kuota target ideal
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center bg-[#F4F4F8] dark:bg-[#1a1a2a] p-1 rounded-xl gap-1 text-xs font-semibold overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'pos', label: 'Rhesus (+)' },
            { id: 'neg', label: 'Rhesus (-)' },
            { id: 'critical', label: 'Perlu Isi' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                filter === btn.id
                  ? 'bg-white dark:bg-[#13131f] text-[#C0392B] shadow-xs font-bold'
                  : 'text-[#4A4A6A] dark:text-[#a5a5c5] hover:text-[#1A1A2E] dark:hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
            barSize={32}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
            <XAxis
              dataKey="type"
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB', opacity: 0.8 }}
              tick={{ fill: '#4A4A6A', fontSize: 12, fontWeight: 700 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#9B9BB5', fontSize: 11 }}
              domain={[0, (dataMax: number) => Math.max(dataMax + 10, 60)]}
            />
            <Tooltip content={<CustomStockTooltip />} cursor={{ fill: 'rgba(192, 57, 43, 0.05)', radius: 8 }} />
            <ReferenceLine
              y={50}
              stroke="#E67E22"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Target Standar (50)',
                fill: '#E67E22',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
            <Bar
              dataKey="stock"
              radius={[8, 8, 2, 2]}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
            >
              {filteredData.map((entry) => (
                <Cell
                  key={`cell-${entry.type}`}
                  fill={btColors[entry.type] || '#C0392B'}
                  className="hover:opacity-85 transition-opacity cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mini Legend & Summary */}
      <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between text-xs text-[#4A4A6A] dark:text-[#a5a5c5] gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E74C3C]" />
            <span>Gol. A</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2980B9]" />
            <span>Gol. B</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8E44AD]" />
            <span>Gol. AB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#27AE60]" />
            <span>Gol. O</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-medium">
          <span>
            Total Stok: <strong className="text-[#1A1A2E] dark:text-white"><AnimatedCounter value={totalStock} /></strong> kantong
          </span>
          {criticalCount > 0 && (
            <span className="text-[#C0392B] font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {criticalCount} Golongan Kritis
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 2. Animated Activity Trend (Masuk vs Keluar) Chart ───────
export function StockTrendsChart({
  title = "Grafik Tren Penyaluran & Penerimaan Darah",
}: {
  title?: string;
}) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d'>('7d');

  const trendData7d = [
    { name: 'Sen', masuk: 14, keluar: 8 },
    { name: 'Sel', masuk: 22, keluar: 15 },
    { name: 'Rab', masuk: 18, keluar: 19 },
    { name: 'Kam', masuk: 29, keluar: 12 },
    { name: 'Jum', masuk: 35, keluar: 24 },
    { name: 'Sab', masuk: 48, keluar: 31 },
    { name: 'Min', masuk: 32, keluar: 18 },
  ];

  const trendData30d = [
    { name: 'Mgg 1', masuk: 95, keluar: 72 },
    { name: 'Mgg 2', masuk: 120, keluar: 110 },
    { name: 'Mgg 3', masuk: 145, keluar: 88 },
    { name: 'Mgg 4', masuk: 160, keluar: 130 },
  ];

  const data = timeframe === '7d' ? trendData7d : trendData30d;

  return (
    <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-sm p-5 transition-all hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EAFAF1] dark:bg-[#0e2018] flex items-center justify-center text-[#27AE60]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-[#1A1A2E] dark:text-white text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {title}
            </h3>
            <p className="text-xs text-[#9B9BB5]">
              Perbandingan kantong darah masuk (donor) vs keluar (RS & pasien)
            </p>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center bg-[#F4F4F8] dark:bg-[#1a1a2a] p-1 rounded-xl gap-1 text-xs font-semibold">
          <button
            onClick={() => setTimeframe('7d')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
              timeframe === '7d'
                ? 'bg-white dark:bg-[#13131f] text-[#27AE60] shadow-xs font-bold'
                : 'text-[#4A4A6A] dark:text-[#a5a5c5]'
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => setTimeframe('30d')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
              timeframe === '30d'
                ? 'bg-white dark:bg-[#13131f] text-[#27AE60] shadow-xs font-bold'
                : 'text-[#4A4A6A] dark:text-[#a5a5c5]'
            }`}
          >
            Bulan Ini
          </button>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#27AE60" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#27AE60" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C0392B" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#C0392B" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB', opacity: 0.8 }}
              tick={{ fill: '#4A4A6A', fontSize: 12, fontWeight: 600 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#9B9BB5', fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white/95 dark:bg-[#181827]/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-3 text-xs space-y-1">
                      <p className="font-bold text-[#1A1A2E] dark:text-white mb-1.5">{label}</p>
                      <div className="flex items-center justify-between gap-4 text-[#27AE60]">
                        <span className="flex items-center gap-1 font-semibold">▲ Darah Masuk:</span>
                        <strong className="text-sm">{payload[0]?.value} ktg</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[#C0392B]">
                        <span className="flex items-center gap-1 font-semibold">▼ Darah Keluar:</span>
                        <strong className="text-sm">{payload[1]?.value} ktg</strong>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="masuk"
              name="Darah Masuk (Donor)"
              stroke="#27AE60"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorMasuk)"
              isAnimationActive={true}
              animationDuration={1300}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="keluar"
              name="Darah Keluar (Distribusi)"
              stroke="#C0392B"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorKeluar)"
              isAnimationActive={true}
              animationDuration={1300}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-[#4A4A6A] dark:text-[#a5a5c5]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-1.5 rounded-full bg-[#27AE60]" />
            <span>Masuk: <strong className="text-[#1E8449]">+{data.reduce((a, b) => a + b.masuk, 0)}</strong> ktg</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-1.5 rounded-full bg-[#C0392B]" />
            <span>Keluar: <strong className="text-[#C0392B]">-{data.reduce((a, b) => a + b.keluar, 0)}</strong> ktg</span>
          </div>
        </div>
        <span className="text-[11px] text-[#27AE60] bg-[#EAFAF1] dark:bg-[#0e2018] font-bold px-2.5 py-0.5 rounded-full">
          Neraca Surplus (+{data.reduce((a, b) => a + b.masuk, 0) - data.reduce((a, b) => a + b.keluar, 0)})
        </span>
      </div>
    </div>
  );
}

// ─── 3. Animated Donut Proportion Chart ───────────────────────
export function BloodDonutChart({
  data,
}: {
  data: BloodStockItem[];
}) {
  const chartData = [
    { name: 'Gol. A', value: data.filter(d => d.type.startsWith('A')).reduce((a, b) => a + b.stock, 0), color: '#E74C3C' },
    { name: 'Gol. B', value: data.filter(d => d.type.startsWith('B')).reduce((a, b) => a + b.stock, 0), color: '#2980B9' },
    { name: 'Gol. AB', value: data.filter(d => d.type.startsWith('AB')).reduce((a, b) => a + b.stock, 0), color: '#8E44AD' },
    { name: 'Gol. O', value: data.filter(d => d.type.startsWith('O')).reduce((a, b) => a + b.stock, 0), color: '#27AE60' },
  ].filter(d => d.value > 0);

  const total = chartData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-border shadow-sm p-5 transition-all hover:shadow-md flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-[#E8DAEF] dark:bg-[#1a1228] flex items-center justify-center text-[#8E44AD]">
          <PieIcon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-[#1A1A2E] dark:text-white text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Proporsi Stok Darah
          </h3>
          <p className="text-xs text-[#9B9BB5]">Distribusi kuota kantong per grup utama</p>
        </div>
      </div>

      <div className="h-56 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData.length ? chartData : [{ name: 'Empty', value: 1, color: '#E5E7EB' }]}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {(chartData.length ? chartData : [{ name: 'Empty', value: 1, color: '#E5E7EB' }]).map((entry, index) => (
                <Cell key={`slice-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  const pct = total ? Math.round((d.value / total) * 100) : 0;
                  return (
                    <div className="bg-white/95 dark:bg-[#181827]/95 border border-border shadow-lg rounded-xl p-2.5 text-xs">
                      <p className="font-bold text-[#1A1A2E] dark:text-white">{d.name}</p>
                      <p className="font-semibold" style={{ color: d.color }}>{d.value} kantong ({pct}%)</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-[#1A1A2E] dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <AnimatedCounter value={total} />
          </span>
          <span className="text-[10px] uppercase font-bold text-[#9B9BB5] tracking-wider">Kantong</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center justify-between p-1.5 rounded-lg bg-[#F9F9FC] dark:bg-[#181827]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="font-semibold text-[#4A4A6A] dark:text-[#a5a5c5]">{d.name}</span>
            </div>
            <span className="font-bold text-[#1A1A2E] dark:text-white">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
