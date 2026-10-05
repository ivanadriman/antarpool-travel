import React from 'react';
import { Car, Ticket, User, LogOut } from 'lucide-react';

export default function ClientHeader({
  currentUser,
  onOpenMyBookings,
  onOpenProfile,
  onOpenAuth,
  onLogout
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">AntarPool</span>
            <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              Travel
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={onOpenMyBookings}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Tiket Saya</span>
              </button>

              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-xs transition cursor-pointer text-slate-800"
                title="Klik untuk melihat dan mengubah profil Anda"
              >
                <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-bold max-w-[90px] sm:max-w-[130px] truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-100/70 px-1.5 py-0.5 rounded-md hidden xs:inline">
                  Profil
                </span>
              </button>

              <button
                onClick={onLogout}
                title="Keluar"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <User className="w-4 h-4" />
              Masuk / Daftar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
