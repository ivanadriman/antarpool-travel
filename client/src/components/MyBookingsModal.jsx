import React from 'react';
import { XCircle } from 'lucide-react';
import { formatIDR, formatDateID } from '../utils';

export default function MyBookingsModal({
  isOpen,
  onClose,
  currentUser,
  myBookings,
  onSelectTicket,
  onCancelBooking
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Tiket Perjalanan Saya</h3>
            <p className="text-xs text-slate-500">Nomor: {currentUser?.phone || currentUser?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-sm px-2 py-1 rounded-lg cursor-pointer"
          >
            Tutup
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {myBookings.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Belum ada riwayat pesanan.
            </div>
          ) : (
            myBookings.map((b) => (
              <div
                key={b.id}
                onClick={() => onSelectTicket(b)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED'
                    ? 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                    : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50/40'
                }`}
              >
                <div>
                  <span className={`text-xs font-bold ${
                    b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED' ? 'text-slate-400' : 'text-blue-600'
                  }`}>{b.booking_code}</span>
                  <p className={`font-bold text-sm mt-0.5 ${
                    b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED' ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}>
                    {b.origin_name} → {b.destination_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateID(b.travel_date)} • {b.departure_time} WIB
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-xs font-bold ${
                      b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED' ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}>{formatIDR(b.total_price)}</span>
                    <span
                      className={`block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                        b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED'
                          ? 'bg-red-100 text-red-700'
                          : b.payment_status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED'
                        ? 'Dibatalkan'
                        : b.payment_status === 'PAID'
                        ? 'Sudah Lunas'
                        : 'Menunggu Bayar di Pool'}
                    </span>
                  </div>

                  {/* Batalkan Tiket Button */}
                  {b.booking_status !== 'CANCELLED' && b.payment_status !== 'CANCELLED' && b.booking_status !== 'COMPLETED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelBooking(b.id, b.booking_code);
                      }}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                      title="Batalkan Tiket"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Batalkan</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
