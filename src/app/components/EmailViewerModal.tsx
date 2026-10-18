import React from 'react';
import { X, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface EmailItem {
  id: string | number;
  to: string;
  donorName?: string;
  subject: string;
  type: string;
  sentAt: string;
  html: string;
}

interface EmailViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: EmailItem | null;
}

export default function EmailViewerModal({ isOpen, onClose, email }: EmailViewerModalProps) {
  if (!isOpen || !email) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#13131f] w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Email Client Header */}
          <div className="px-5 py-3.5 bg-[#F9F9FC] dark:bg-[#181827] border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FDEDEC] dark:bg-[#2a1218] flex items-center justify-center text-[#C0392B]">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#1A1A2E] dark:text-white flex items-center gap-1.5">
                  Kotak Email Pendonor
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3" /> Email Resmi Terverifikasi
                  </span>
                </span>
                <p className="text-[10px] text-[#9B9BB5]">Pratinjau email notifikasi yang dikirimkan ke alamat email Anda</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#9B9BB5] hover:text-[#C0392B] hover:bg-[#F4F4F8] dark:hover:bg-[#1a1a2a] transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Email Meta Bar */}
          <div className="px-5 py-3 border-b border-border bg-white dark:bg-[#13131f] space-y-1.5 text-xs">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-bold text-sm text-[#1A1A2E] dark:text-white leading-snug">
                {email.subject}
              </h2>
              <span className="text-[10px] text-[#9B9BB5] whitespace-nowrap">
                {new Date(email.sentAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#4A4A6A] dark:text-[#a5a5c5]">
              <span><strong>Dari:</strong> TemanDonor! Notifikasi &lt;noreply@oneblood.id&gt;</span>
              <span><strong>Kepada:</strong> {email.to}</span>
            </div>
          </div>

          {/* Email HTML Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F4F4F8] dark:bg-[#0e0e17]">
            <div
              className="bg-white rounded-xl shadow-xs overflow-hidden border border-border"
              dangerouslySetInnerHTML={{ __html: email.html }}
            />
          </div>

          {/* Footer Action */}
          <div className="px-5 py-3 bg-[#F9F9FC] dark:bg-[#181827] border-t border-border flex items-center justify-between">
            <span className="text-[11px] text-[#9B9BB5] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Terkirim ke inbox email pendonor
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#C0392B] text-white text-xs font-bold hover:bg-[#922B21] transition-all"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
