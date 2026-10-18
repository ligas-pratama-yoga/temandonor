import React, { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 900,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const target = Number(value) || 0;
    const initial = count;

    if (initial === target) return;

    let frameId: number;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(initial + (target - initial) * ease);

      setCount(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {count.toLocaleString('id-ID')}
      {suffix}
    </span>
  );
}

interface AnimatedProgressBarProps {
  value: number; // percentage 0 - 100
  max?: number;
  barColor?: string;
  height?: string;
  className?: string;
  showGlow?: boolean;
}

export function AnimatedProgressBar({
  value,
  max = 100,
  barColor = '#C0392B',
  height = 'h-2',
  className = '',
  showGlow = false,
}: AnimatedProgressBarProps) {
  const [width, setWidth] = useState(0);
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(percentage);
    }, 60);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={`w-full bg-[#F4F4F8] dark:bg-[#1A1A2A] rounded-full overflow-hidden relative ${height} ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out relative"
        style={{
          width: `${width}%`,
          backgroundColor: barColor,
          boxShadow: showGlow ? `0 0 10px ${barColor}80` : undefined,
        }}
      >
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
      </div>
    </div>
  );
}
