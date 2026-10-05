import React from 'react';
import { 
  Users, RefreshCw, AlertTriangle, Database, Star, 
  ShieldAlert, Search, MapPin, CreditCard, Mail, 
  FileText, MessageCircle, ExternalLink, ChevronRight 
} from 'lucide-react';
import { formatIDR } from '../../utils';

export default function CustomersTab({
  customers,
  loadingCustomers,
  fetchCustomers,
  customerSource,
  customerSearch,
  setCustomerSearch,
  customerFilter,
  setCustomerFilter,
  onOpenCustomerModal,
  onOpenConnectionModal
}) {
  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 max-w-full">
      {/* Top Header & Overview KPI Cards */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Direktori & Manajemen Pelanggan</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola data penumpang, riwayat perjalanan, status VIP, no-show/blacklist, dan hubungi via WhatsApp langsung.
            </p>
          </div>
          <button
            onClick={fetchCustomers}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs flex items-center gap-2 transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCustomers ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Segarkan Data</span>
          </button>
        </div>

        {/* Fallback vs Supabase Live Banner Indicator */}
        {customerSource === 'fallback' ? (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs mb-3 sm:mb-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold">Indikator CRM: Menggunakan Response Fallback</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                    Mode Fallback Aktif
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Aplikasi saat ini membaca data dari riwayat tiket pesanan karena tabel <code>customers</code> belum dibuat di Supabase. Perubahan status VIP & catatan tetap tersimpan di penyimpanan browser ini.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenConnectionModal}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold shrink-0 transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Panduan Setup SQL Supabase</span>
            </button>
          </div>
        ) : customerSource === 'supabase' ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span>Indikator CRM: Terhubung ke Database Supabase Cloud (Tabel <code>customers</code> Aktif & Sinkron)</span>
            </div>
            <button
              onClick={onOpenConnectionModal}
              className="text-[11px] text-emerald-700 hover:text-emerald-900 underline font-semibold self-start sm:self-auto cursor-pointer"
            >
              Detail Koneksi Database
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold shadow-2xs mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
              <span>Indikator CRM: Terhubung ke Express API + Database SQLite Lokal</span>
            </div>
          </div>
        )}

        {/* CRM KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 min-w-0 max-w-full">
          <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl shadow-xs min-w-0 overflow-hidden">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Total Pelanggan
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
              {customers.length}
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">
              Penumpang terdaftar
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl shadow-xs min-w-0 overflow-hidden">
            <span className="text-[11px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider block flex items-center gap-1 truncate">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
              <span>Pelanggan VIP</span>
            </span>
            <p className="text-xl sm:text-2xl font-black text-amber-500 mt-1">
              {customers.filter((c) => c.is_vip).length}
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">
              Prioritas layanan istimewa
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl shadow-xs min-w-0 overflow-hidden">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider block truncate">
              Total Omzet (LTV)
            </span>
            <p className="text-lg sm:text-2xl font-black text-emerald-600 mt-1 truncate">
              {formatIDR(customers.reduce((acc, c) => acc + (Number(c.total_spent) || 0), 0))}
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">
              Akumulasi transaksi selesai
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl shadow-xs min-w-0 overflow-hidden">
            <span className="text-[11px] sm:text-xs font-bold text-red-600 uppercase tracking-wider block flex items-center gap-1 truncate">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>No-Show / Terblokir</span>
            </span>
            <p className="text-xl sm:text-2xl font-black text-red-600 mt-1">
              {customers.filter((c) => c.is_blacklisted).length}
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">
              Peringatan dispatcher
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 min-w-0 max-w-full">
        {/* Search Bar */}
        <div className="relative w-full md:w-96 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nama, WhatsApp, email, kota domisili, atau NIK..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-hidden focus:border-blue-500 focus:bg-white text-xs text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Segment Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto min-w-0 py-0.5">
          <button
            onClick={() => setCustomerFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
              customerFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Semua ({customers.length})
          </button>
          <button
            onClick={() => setCustomerFilter('vip')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1 ${
              customerFilter === 'vip'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>VIP Saja ({customers.filter((c) => c.is_vip).length})</span>
          </button>
          <button
            onClick={() => setCustomerFilter('cancelled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
              customerFilter === 'cancelled'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Pernah Batal ({customers.filter((c) => (c.cancelled_trips || 0) > 0).length})
          </button>
          <button
            onClick={() => setCustomerFilter('blacklisted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1 ${
              customerFilter === 'blacklisted'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Terblokir ({customers.filter((c) => c.is_blacklisted).length})</span>
          </button>
        </div>
      </div>

      {/* Customer List / Cards */}
      {loadingCustomers ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center gap-3 shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Memuat data pelanggan...</span>
        </div>
      ) : (() => {
        const filtered = customers.filter((c) => {
          if (customerFilter === 'vip' && !c.is_vip) return false;
          if (customerFilter === 'blacklisted' && !c.is_blacklisted) return false;
          if (customerFilter === 'cancelled' && !(c.cancelled_trips > 0)) return false;

          if (customerSearch.trim()) {
            const q = customerSearch.toLowerCase();
            const matchName = (c.name || '').toLowerCase().includes(q);
            const matchPhone = (c.phone || '').toLowerCase().includes(q);
            const matchEmail = (c.email || '').toLowerCase().includes(q);
            const matchCity = (c.city || '').toLowerCase().includes(q);
            const matchIdCard = (c.id_card || '').toLowerCase().includes(q);
            const matchNotes = (c.notes || '').toLowerCase().includes(q);
            if (!matchName && !matchPhone && !matchEmail && !matchCity && !matchIdCard && !matchNotes) return false;
          }
          return true;
        });

        if (filtered.length === 0) {
          return (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">Tidak ada pelanggan yang cocok dengan pencarian.</p>
              <p className="text-xs text-slate-500 mt-1">Coba gunakan kata kunci pencarian atau filter yang berbeda.</p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0 max-w-full">
            {filtered.map((c) => {
              const initials = c.name
                ? c.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                : 'PL';

              let cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
              if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
              const waGreeting = encodeURIComponent(`Halo Bapak/Ibu ${c.name}, kami dari tim operasional AntarPool Travel...`);
              const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waGreeting}` : null;

              return (
                <div
                  key={c.id || c.phone}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition hover:border-slate-300 shadow-xs min-w-0 ${
                    c.is_blacklisted 
                      ? 'border-red-300 bg-red-50/20' 
                      : c.is_vip 
                        ? 'border-amber-300 bg-amber-50/20' 
                        : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          c.is_blacklisted
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : c.is_vip
                              ? 'bg-amber-100 text-amber-800 border border-amber-200 shadow-xs'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
                            <span className="truncate">{c.name}</span>
                            {c.is_vip ? (
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" title="Pelanggan VIP" />
                            ) : null}
                          </h4>
                          <span className="text-xs text-slate-500 block mt-0.5 truncate">
                            {c.phone || 'Tanpa nomor HP'}
                          </span>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <div className="shrink-0">
                        {c.is_blacklisted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            No-Show
                          </span>
                        ) : c.is_vip ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            VIP
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Aktif
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Extra Profile Attributes (City, NIK, Email, Auth) */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {c.city && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
                          <MapPin className="w-2.5 h-2.5" />
                          {c.city}
                        </span>
                      )}
                      {c.id_card && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-medium border border-slate-200" title={`NIK: ${c.id_card}`}>
                          <CreditCard className="w-2.5 h-2.5 text-slate-500" />
                          NIK: {c.id_card}
                        </span>
                      )}
                      {c.email && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] truncate max-w-[170px] border border-slate-200" title={c.email}>
                          <Mail className="w-2.5 h-2.5 text-slate-400" />
                          <span className="truncate">{c.email}</span>
                        </span>
                      )}
                      {c.auth_method && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                          via {c.auth_method === 'google' ? 'Google' : c.auth_method === 'email' ? 'Email' : 'WA'}
                        </span>
                      )}
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Total Pesanan</span>
                        <span className="font-bold text-slate-800 mt-0.5 block truncate">
                          {c.total_trips || 0} trip
                          {c.cancelled_trips > 0 ? (
                            <span className="text-red-500 text-[10px] ml-1">({c.cancelled_trips} batal)</span>
                          ) : null}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Total Transaksi</span>
                        <span className="font-bold text-emerald-600 mt-0.5 block truncate">
                          {formatIDR(c.total_spent || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Notes snippet if exists */}
                    {c.notes && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-slate-700 flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{c.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition"
                        title="Kirim pesan WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ) : (
                      <div />
                    )}

                    <button
                      onClick={() => onOpenCustomerModal(c)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Kelola & Riwayat</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
