import React, { useState } from 'react';
import { 
  History, Clock, Calendar, Search, Filter, RefreshCw,
  CheckCircle2, XCircle, ShoppingBag, CreditCard, UserCheck,
  ArrowRight, ShieldCheck, MapPin, User, AlertCircle
} from 'lucide-react';
import { formatIDR, formatDateID } from '../utils';

export default function OrderTimeline({ events = [], loading = false, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEventType, setFilterEventType] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Format timestamp helper
  const formatDateTimeID = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/\./g, ':');
    } catch (e) {
      return dateStr;
    }
  };

  // Filter events locally by search, type, and date
  const filteredEvents = events.filter((ev) => {
    if (filterEventType && ev.event_type !== filterEventType) return false;
    if (filterDate) {
      const evDate = (ev.created_at || '').substring(0, 10);
      if (evDate !== filterDate) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = (ev.booking_code || '').toLowerCase().includes(q);
      const nameMatch = (ev.customer_name || '').toLowerCase().includes(q);
      const descMatch = (ev.description || '').toLowerCase().includes(q);
      const phoneMatch = (ev.customer_phone || '').toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !descMatch && !phoneMatch) return false;
    }
    return true;
  });

  // Event visual configuration reflecting order status (cancelled, completed, etc.)
  const getEventBadge = (type, currentBookingStatus, currentPaymentStatus) => {
    // 1. When the order is cancelled
    if (currentBookingStatus === 'CANCELLED') {
      let title = 'Pesanan Dibatalkan';
      if (type === 'PAYMENT_RECEIVED') title = 'Pembayaran Dibatalkan';
      if (type === 'PASSENGER_CHECKED_IN') title = 'Check-in Dibatalkan';

      return {
        title,
        icon: XCircle,
        color: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-600',
        ring: 'ring-red-100'
      };
    }

    // 2. When the order is completed
    if (currentBookingStatus === 'COMPLETED') {
      let title = 'Pesanan Selesai';
      if (type === 'PASSENGER_CHECKED_IN') title = 'Check-in Armada';
      if (type === 'PAYMENT_RECEIVED') title = 'Pembayaran Diterima';

      return {
        title,
        icon: CheckCircle2,
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-600',
        ring: 'ring-emerald-100'
      };
    }

    switch (type) {
      case 'ORDER_PLACED':
        return {
          title: 'Pesanan Masuk',
          icon: ShoppingBag,
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-600',
          ring: 'ring-blue-100'
        };
      case 'PAYMENT_RECEIVED':
        return {
          title: 'Pembayaran Diterima',
          icon: CreditCard,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-600',
          ring: 'ring-emerald-100'
        };
      case 'PASSENGER_CHECKED_IN':
        return {
          title: 'Check-in Armada',
          icon: UserCheck,
          color: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-600',
          ring: 'ring-purple-100'
        };
      case 'ORDER_CANCELLED':
        return {
          title: 'Pesanan Dibatalkan',
          icon: XCircle,
          color: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-600',
          ring: 'ring-red-100'
        };
      default:
        return {
          title: 'Aktivitas Pesanan',
          icon: Clock,
          color: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-600',
          ring: 'ring-slate-100'
        };
    }
  };

  const getActorBadge = (role) => {
    switch (role) {
      case 'CUSTOMER':
        return { label: 'Pelanggan', bg: 'bg-blue-100 text-blue-800' };
      case 'OPERATOR':
        return { label: 'Operator Pool', bg: 'bg-amber-100 text-amber-800' };
      case 'SYSTEM':
        return { label: 'Sistem', bg: 'bg-slate-100 text-slate-700' };
      default:
        return { label: role, bg: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Timeline & Alur Waktu Pesanan
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Kronologi real-time setiap siklus pesanan: saat pesanan dibuat, konfirmasi pembayaran di pool, check-in, hingga pembatalan tiket.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari kode booking / nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Event Type Filter */}
          <select
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-blue-500"
          >
            <option value="">Semua Peristiwa</option>
            <option value="ORDER_PLACED">Pesanan Masuk</option>
            <option value="PAYMENT_RECEIVED">Pembayaran Diterima</option>
            <option value="PASSENGER_CHECKED_IN">Check-in Armada</option>
            <option value="ORDER_CANCELLED">Pesanan Dibatalkan</option>
          </select>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-blue-500"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-xs text-slate-400 hover:text-slate-600 px-1"
                title="Reset Tanggal"
              >
                ✕
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      {loading && events.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-slate-500">Memuat kronologi aktivitas pesanan...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700">Belum Ada Riwayat Peristiwa</h3>
          <p className="text-xs text-slate-400 mt-1">
            Setiap ada pesanan baru, pembayaran di pool, atau pembatalan tiket, urutan waktunya akan tercatat di sini.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="space-y-6">
            {filteredEvents.map((ev, idx) => {
              const meta = getEventBadge(ev.event_type, ev.current_booking_status, ev.current_payment_status);
              const actor = getActorBadge(ev.actor_role);
              const IconComp = meta.icon;
              const isLast = idx === filteredEvents.length - 1;

              return (
                <div key={ev.id} className="flex items-start gap-4 sm:gap-6">
                  {/* Left Column: Timeline Bullet + Connecting Line */}
                  <div className="flex flex-col items-center shrink-0 self-stretch">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ${meta.ring} ${meta.dot} text-white shadow-xs shrink-0`}
                    >
                      <IconComp className="w-4 h-4 shrink-0" />
                    </div>
                    {!isLast && <div className="w-0.5 bg-slate-200 grow my-2" />}
                  </div>

                  {/* Right Column: Event Card Content */}
                  <div className="grow bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.color}`}>
                          {meta.title}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {ev.booking_code}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${actor.bg}`}>
                          Aktor: {actor.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTimeID(ev.created_at)}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {ev.description}
                    </p>

                    {/* Order Details Context Banner */}
                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">{ev.customer_name}</span>
                          {ev.customer_phone && (
                            <span className="text-slate-400 text-[11px]">({ev.customer_phone})</span>
                          )}
                        </div>

                        <span className="text-slate-300">•</span>

                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className={`font-medium ${ev.current_booking_status === 'CANCELLED' ? 'line-through text-slate-400' : ''}`}>
                            {ev.origin_name} → {ev.destination_name}
                          </span>
                        </div>

                        <span className="text-slate-300">•</span>

                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {formatDateID(ev.travel_date)} ({ev.departure_time} WIB)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Total:</span>
                        <span className={`font-bold ${ev.current_booking_status === 'CANCELLED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {formatIDR(ev.total_price)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            ev.current_booking_status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700'
                              : ev.current_booking_status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : ev.current_payment_status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          Status Saat Ini: {
                            ev.current_booking_status === 'CANCELLED'
                              ? 'Batal'
                              : ev.current_booking_status === 'COMPLETED'
                              ? 'Selesai'
                              : ev.current_payment_status === 'PAID'
                              ? 'Lunas'
                              : 'Menunggu Bayar'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
