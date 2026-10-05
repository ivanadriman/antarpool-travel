import React from 'react';
import { 
  Calendar, RefreshCw, Bell, ChevronRight, 
  Clock, Users, CheckCircle, XCircle 
} from 'lucide-react';
import { formatIDR, formatDateID } from '../../utils';

export default function OrdersTab({
  bookings,
  loadingBookings,
  orderFilterDate,
  setOrderFilterDate,
  orderFilterStatus,
  setOrderFilterStatus,
  orderFilterBookingStatus,
  setOrderFilterBookingStatus,
  newOrderIds,
  handleOrderHover,
  fetchBookings,
  handleUpdateStatus
}) {
  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={orderFilterDate}
              onChange={(e) => setOrderFilterDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            />
            {orderFilterDate && (
              <button
                onClick={() => setOrderFilterDate('')}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Status Bayar:</span>
            <select
              value={orderFilterStatus}
              onChange={(e) => setOrderFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="">Semua Bayar</option>
              <option value="PENDING">Menunggu Bayar</option>
              <option value="PAID">Sudah Lunas</option>
              <option value="CANCELLED">Batal Bayar</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Status Perjalanan:</span>
            <select
              value={orderFilterBookingStatus}
              onChange={(e) => setOrderFilterBookingStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="">Semua Status</option>
              <option value="CONFIRMED">Terkonfirmasi (Aktif)</option>
              <option value="COMPLETED">Selesai (Check-in)</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchBookings}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Segarkan Data
        </button>
      </div>

      {/* Bookings List */}
      {loadingBookings ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-slate-500">Memuat data pesanan...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700">Belum Ada Pesanan</h3>
          <p className="text-xs text-slate-400 mt-1">
            Pesanan yang dibuat oleh penumpang akan muncul di sini secara langsung dengan notifikasi suara.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const isNew = newOrderIds.has(b.id);
            return (
              <div
                key={b.id}
                onMouseEnter={() => handleOrderHover(b.id)}
                className={`rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden ${
                  isNew
                    ? 'bg-gradient-to-r from-emerald-50/80 via-white to-white border-2 border-emerald-500 shadow-emerald-500/10 ring-4 ring-emerald-500/20'
                    : 'bg-white border border-slate-200'
                }`}
              >
                {/* New Order Ribbon / Badge */}
                {isNew && (
                  <div className="absolute -top-1 -right-1">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-bl-xl shadow-xs animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      Pesanan Baru
                    </span>
                  </div>
                )}

                {/* Left details */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black tracking-wider px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                      {b.booking_code}
                    </span>

                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        b.payment_status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : b.payment_status === 'CANCELLED'
                          ? 'bg-slate-100 text-slate-500 border border-slate-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {b.payment_status === 'PAID'
                        ? 'Sudah Bayar di Pool'
                        : b.payment_status === 'CANCELLED'
                        ? 'Batal Bayar'
                        : 'Menunggu Bayar di Pool'}
                    </span>

                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        b.booking_status === 'CONFIRMED'
                          ? 'bg-blue-100 text-blue-800'
                          : b.booking_status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800 font-semibold'
                      }`}
                    >
                      {b.booking_status === 'CONFIRMED'
                        ? 'Terkonfirmasi'
                        : b.booking_status === 'COMPLETED'
                        ? 'Selesai'
                        : 'Dibatalkan'}
                    </span>
                  </div>

                  {/* Route & Passenger */}
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <span className={b.booking_status === 'CANCELLED' ? 'line-through text-slate-400' : ''}>{b.origin_name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <span className={b.booking_status === 'CANCELLED' ? 'line-through text-slate-400' : ''}>{b.destination_name}</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pemesan: <strong className="text-slate-800">{b.customer_name}</strong> • Telp: {b.customer_phone || '-'}
                    </p>
                  </div>

                  {/* Schedule info */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDateID(b.travel_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Pukul {b.departure_time} WIB
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      {b.seats_count} Kursi: <strong className={`font-bold ${b.booking_status === 'CANCELLED' ? 'line-through text-slate-400' : 'text-blue-700'}`}>{Array.isArray(b.seat_numbers) ? b.seat_numbers.join(', ') : b.seat_numbers}</strong>
                    </span>
                  </div>
                </div>

                {/* Right action & price */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  <div className="text-left lg:text-right">
                    <span className="text-[11px] text-slate-400">Total Tagihan (IDR)</span>
                    <p className={`text-xl font-black ${b.booking_status === 'CANCELLED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {formatIDR(b.total_price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {b.booking_status === 'CANCELLED' ? (
                      <span className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        Pesanan Dibatalkan
                      </span>
                    ) : (
                      <>
                        {b.payment_status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, 'PAID', 'CONFIRMED')}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Terima Bayar di Pool
                          </button>
                        )}

                        {b.booking_status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, b.payment_status, 'COMPLETED')}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                          >
                            Check-in Armada
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm(`Batalkan pesanan ${b.booking_code} (${b.customer_name})? Kursi akan dilepaskan kembali untuk dipesan penumpang lain.`)) {
                              handleUpdateStatus(b.id, 'CANCELLED', 'CANCELLED');
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                          title="Batalkan Pesanan"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
