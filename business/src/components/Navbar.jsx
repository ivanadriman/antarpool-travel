import React from 'react';
import { 
  Car, Info, Volume2, VolumeX, LogOut, 
  Bell, Clock, Users, History, TrendingUp 
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  wsConnected,
  customerSource,
  currentBackend,
  voiceEnabled,
  onToggleVoice,
  onTestVoice,
  onLogout,
  onOpenConnectionModal,
  bookingsCount = 0,
  newOrdersCount = 0,
  armadasCount = 0,
  customersCount = 0,
  timelineCount = 0
}) {
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">AntarPool</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0">
                Operator Bisnis
              </span>
            </div>
            <button
              onClick={onOpenConnectionModal}
              className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-slate-700/80 transition cursor-pointer mt-0.5 truncate group"
              title="Klik untuk melihat detail status koneksi & database backend"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                !wsConnected 
                  ? 'bg-red-400' 
                  : customerSource === 'fallback' && currentBackend === 'supabase'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-emerald-400 animate-pulse'
              }`}></span>
              <span className="truncate font-semibold">
                {!wsConnected
                  ? 'Terputus...'
                  : customerSource === 'fallback' && currentBackend === 'supabase'
                  ? 'Supabase (Mode Fallback)'
                  : currentBackend === 'supabase'
                  ? 'Supabase Cloud Live'
                  : 'Live WebSocket'}
              </span>
              <Info className="w-3 h-3 text-slate-400 group-hover:text-blue-400 shrink-0 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Voice Notification Controls & Operator Session */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={onTestVoice}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Uji Notifikasi Suara"
          >
            <Volume2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-blue-400" />
            <span className="hidden md:inline">Uji Notifikasi</span>
          </button>

          <button
            onClick={onToggleVoice}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              voiceEnabled
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                : 'bg-red-600/20 border-red-500/40 text-red-300 hover:bg-red-600/30'
            }`}
            title={voiceEnabled ? 'Suara aktif' : 'Suara dibisukan'}
          >
            {voiceEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline">Suara: Aktif</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-red-400" />
                <span className="hidden md:inline">Suara: Bisukan</span>
              </>
            )}
          </button>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-xs font-semibold text-red-300 transition flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Keluar dari sesi operator"
          >
            <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden md:inline">Keluar</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex gap-3 sm:gap-6 text-xs sm:text-sm font-semibold border-t border-slate-800 overflow-x-auto no-scrollbar w-full">
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3 sm:py-3.5 border-b-2 transition flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'orders'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Pesanan Masuk</span>
          {newOrdersCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500 text-white font-black shadow-xs animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              +{newOrdersCount}
            </span>
          )}
          {bookingsCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-600 text-white font-bold">
              {bookingsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          className={`py-3 sm:py-3.5 border-b-2 transition flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'schedules'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Jadwal & Tarif</span>
        </button>

        {/* TAB: ARMADA */}
        <button
          onClick={() => setActiveTab('armadas')}
          className={`py-3 sm:py-3.5 border-b-2 transition flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'armadas'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Manajemen Armada</span>
          {armadasCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
              {armadasCount}
            </span>
          )}
        </button>

        {/* TAB: PELANGGAN (USERS CRM) */}
        <button
          onClick={() => setActiveTab('customers')}
          className={`py-3 sm:py-3.5 border-b-2 transition flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'customers'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pelanggan</span>
          {customersCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-600/80 text-white font-bold">
              {customersCount}
            </span>
          )}
        </button>

        {/* TAB: TIMELINE DAN ALUR WAKTU PESANAN */}
        <button
          onClick={() => setActiveTab('timeline')}
          className={`py-3 sm:py-3.5 border-b-2 transition flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'timeline'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Timeline</span>
          {timelineCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-600/80 text-white font-bold">
              {timelineCount}
            </span>
          )}
        </button>

        {/* TAB: ANALYTICS / STATISTIK */}
        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-3 sm:py-3.5 border-b-2 transition flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Statistik</span>
        </button>
      </div>
    </header>
  );
}
