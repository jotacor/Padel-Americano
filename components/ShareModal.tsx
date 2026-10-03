import React, { useState } from 'react';
import { Check, Copy, Monitor, RefreshCw, Share2, Trophy, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.tsx';
import type { Share, SyncStatus } from '../hooks/useShareSync.ts';

interface Props {
  share: Share;
  status: SyncStatus;
  lastSynced: Date | null;
  onClose: () => void;
  onStop: () => void;
  onRetry: () => void;
  primaryClass: string; // theme button background
  primaryText: string; // theme icon color
}

const CopyField: React.FC<{ label: string; icon: React.ReactNode; value: string; primaryClass: string }> = ({ label, icon, value, primaryClass }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-1.5">
        {icon} {label}
      </label>
      <div className="flex gap-2">
        <input type="text" readOnly value={value} className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700" />
        <button onClick={copy} className={`px-4 rounded-xl font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : `${primaryClass} text-white`}`}>
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

const ShareModal: React.FC<Props> = ({ share, status, lastSynced, onClose, onStop, onRetry, primaryClass, primaryText }) => {
  const { t, locale } = useI18n();
  const dot = status === 'retrying' ? 'bg-amber-400' : status === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400';
  const label = status === 'retrying' ? t('share.retrying') : status === 'syncing' ? t('share.syncing') : t('share.synced');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Share2 className={`w-5 h-5 ${primaryText}`} /> {t('share.title')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <CopyField label={t('share.viewerLink')} icon={<Monitor className="w-3 h-3" />} value={share.shareUrl} primaryClass={primaryClass} />
          <CopyField label={t('share.displayLink')} icon={<Trophy className="w-3 h-3" />} value={`${window.location.origin}/display/${share.shareId}`} primaryClass={primaryClass} />

          <p className="text-[10px] text-slate-400">{t('share.disclaimer')}</p>

          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-sm font-bold text-slate-600">{label}</span>
            </div>
            {status === 'retrying' ? (
              <button onClick={onRetry} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> {t('share.retry')}
              </button>
            ) : lastSynced && (
              <span className="text-[10px] text-slate-400">{t('share.last', { time: lastSynced.toLocaleTimeString(locale) })}</span>
            )}
          </div>

          <button onClick={onStop} className="w-full py-3 text-rose-500 hover:bg-rose-50 rounded-xl font-bold text-sm transition-colors">
            {t('share.stop')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
