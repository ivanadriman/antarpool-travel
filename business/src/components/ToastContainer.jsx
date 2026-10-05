import React from 'react';
import { AlertCircle, Volume2, XCircle } from 'lucide-react';

export default function ToastContainer({
  appAlert,
  onCloseAlert,
  latestVoiceToast,
  onCloseVoiceToast
}) {
  return (
    <div className="fixed top-4 right-3 left-3 sm:left-auto sm:right-6 z-[70] flex flex-col gap-2.5 max-w-md pointer-events-none">
      {/* App Alert Banner (Error / Warning / Success) */}
      {appAlert && (
        <div
          className={`pointer-events-auto p-4 rounded-2xl shadow-xl flex items-start justify-between border backdrop-blur-md transition-all animate-in slide-in-from-top-3 duration-200 ${
            appAlert.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-900 shadow-red-900/10'
              : appAlert.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-900/10'
              : 'bg-blue-50/95 border-blue-200 text-blue-900 shadow-blue-900/10'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                appAlert.type === 'error'
                  ? 'bg-red-100 text-red-600'
                  : appAlert.type === 'success'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-blue-100 text-blue-600'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">{appAlert.title}</p>
              <p className="text-xs mt-0.5 leading-relaxed opacity-90">{appAlert.message}</p>
            </div>
          </div>
          <button
            onClick={onCloseAlert}
            className="text-xs px-2.5 py-1 rounded-lg font-semibold border border-current opacity-70 hover:opacity-100 transition cursor-pointer shrink-0 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Voice Notification Toast Banner (New Booking / Cancellation) */}
      {latestVoiceToast && (
        <div
          className={`pointer-events-auto p-3.5 px-4 rounded-2xl shadow-xl border backdrop-blur-md flex items-center justify-between animate-in slide-in-from-top-3 duration-200 ${
            latestVoiceToast.isCancelled
              ? 'bg-slate-900/95 text-white border-red-500/50 shadow-red-950/20'
              : 'bg-slate-900/95 text-white border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                latestVoiceToast.isCancelled
                  ? 'bg-red-600/30 text-red-400'
                  : 'bg-blue-600/30 text-blue-400'
              }`}
            >
              {latestVoiceToast.isCancelled ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  latestVoiceToast.isCancelled ? 'text-red-400' : 'text-blue-400'
                }`}
              >
                {latestVoiceToast.isCancelled ? 'Pesanan Dibatalkan' : 'Panggilan Suara Baru'}
              </p>
              <p className="text-xs font-medium text-slate-200">{latestVoiceToast.text}</p>
            </div>
          </div>
          <button
            onClick={onCloseVoiceToast}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-md hover:bg-white/10 transition cursor-pointer shrink-0 ml-2"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
