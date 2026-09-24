import React from 'react';
import { QrCode, MapPin, Calendar, Clock, User, CheckCircle2, AlertCircle, ArrowRight, XCircle } from 'lucide-react';
import { formatIDR, formatDateID } from '../utils';

export default function TicketPass({ booking, onClose, onCancel }) {
  if (!booking) return null;

  const isCancelled = booking.booking_status === 'CANCELLED' || booking.payment_status === 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-6 border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Ticket Header */}
        <div
          className={`p-6 text-white text-center relative ${
            isCancelled
              ? 'bg-gradient-to-r from-red-600 to-rose-700'
              : 'bg-gradient-to-r from-blue-700 to-indigo-800'
          }`}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            {isCancelled ? (
              <>
                <XCircle className="w-3.5 h-3.5 text-red-200" />
                Pesanan Dibatalkan
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                Pemesanan Berhasil
              </>
            )}
          </div>
          <h2 className="text-xl font-bold">
            {isCancelled ? 'Tiket Dibatalkan' : 'Tiket Perjalanan Travel'}
          </h2>
          <p className="text-white/80 text-xs mt-0.5">
            {isCancelled
              ? 'Pesanan tiket ini telah dibatalkan dan kursi telah dilepaskan'
              : 'Tunjukkan tiket ini kepada petugas di pool keberangkatan'}
          </p>
        </div>

        {/* Notice Banner */}
        {isCancelled ? (
          <div className="bg-red-50 border-b border-red-200 p-3.5 px-6 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 leading-relaxed">
              <strong className="font-bold text-red-900">Pesanan Telah Dibatalkan:</strong>
              <br />
              Tiket ini tidak berlaku untuk perjalanan. Anda tidak perlu melakukan pembayaran di pool keberangkatan.
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border-b border-amber-200 p-3.5 px-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong className="font-bold text-amber-900">Pembayaran di Lokasi:</strong>
              <br />
              Silakan bayar tunai / QRIS sejumlah <span className="font-bold text-blue-700">{formatIDR(booking.total_price)}</span> saat tiba di pool keberangkatan sebelum jadwal berangkat.
            </div>
          </div>
        )}

        {/* Ticket Body */}
        <div className="p-6 space-y-5">
          {/* Booking Code Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              KODE BOOKING
            </span>
            <div className={`text-2xl font-black tracking-wider my-1 ${isCancelled ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {booking.booking_code}
            </div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap mt-1">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isCancelled
                    ? 'bg-red-100 text-red-800'
                    : booking.payment_status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                Status: {isCancelled ? 'Dibatalkan' : booking.payment_status === 'PAID' ? 'Sudah Lunas' : 'Menunggu Pembayaran di Pool'}
              </span>
            </div>
          </div>

          {/* Route Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Pool Keberangkatan</span>
                <p className="text-sm font-bold text-slate-800">{booking.origin_name || 'Pool Asal'}</p>
                <p className="text-xs text-slate-500">{booking.origin_address || booking.origin_city}</p>
              </div>
            </div>

            <div className="border-l-2 border-dashed border-slate-200 ml-4 h-4"></div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-1">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Pool Tujuan</span>
                <p className="text-sm font-bold text-slate-800">{booking.destination_name || 'Pool Tujuan'}</p>
                <p className="text-xs text-slate-500">{booking.destination_address || booking.destination_city}</p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Tanggal
              </span>
              <p className="font-bold text-slate-800 mt-1">{formatDateID(booking.travel_date)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Jam Berangkat
              </span>
              <p className="font-bold text-slate-800 mt-1">{booking.departure_time || '-'} WIB</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Penumpang
              </span>
              <p className="font-bold text-slate-800 mt-1 truncate">{booking.customer_name}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 font-medium">Nomor Kursi</span>
              <div className="flex gap-1 mt-1 flex-wrap">
                {(() => {
                  let seats = booking.seat_numbers;
                  if (typeof seats === 'string') {
                    try {
                      seats = JSON.parse(seats);
                    } catch (e) {
                      seats = [seats];
                    }
                  }
                  if (!Array.isArray(seats)) seats = seats ? [seats] : [];
                  return seats.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded-md text-xs">
                      {s}
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Simulated QR Code for On-site check-in */}
          <div className="p-4 bg-slate-100 rounded-2xl flex flex-col items-center justify-center border border-slate-200">
            <div className={`w-32 h-32 bg-white p-2 rounded-xl shadow-xs flex items-center justify-center relative ${isCancelled ? 'opacity-40 grayscale' : ''}`}>
              {/* SVG QR Code placeholder */}
              <svg className="w-full h-full text-slate-800" viewBox="0 0 100 100" fill="currentColor">
                <rect x="10" y="10" width="25" height="25" fill="black" />
                <rect x="15" y="15" width="15" height="15" fill="white" />
                <rect x="18" y="18" width="9" height="9" fill="black" />

                <rect x="65" y="10" width="25" height="25" fill="black" />
                <rect x="70" y="15" width="15" height="15" fill="white" />
                <rect x="73" y="18" width="9" height="9" fill="black" />

                <rect x="10" y="65" width="25" height="25" fill="black" />
                <rect x="15" y="70" width="15" height="15" fill="white" />
                <rect x="18" y="73" width="9" height="9" fill="black" />

                <rect x="42" y="15" width="8" height="8" fill="black" />
                <rect x="42" y="30" width="8" height="15" fill="black" />
                <rect x="55" y="42" width="12" height="12" fill="black" />
                <rect x="42" y="60" width="15" height="8" fill="black" />
                <rect x="68" y="65" width="18" height="18" fill="black" />
              </svg>
              {isCancelled && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
                  <span className="text-[10px] font-black tracking-wider uppercase text-red-600 border border-red-300 px-1.5 py-0.5 rounded bg-red-50">
                    Batal
                  </span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {isCancelled ? 'QR tidak aktif (Pesanan Dibatalkan)' : 'Pindai QR saat tiba di loket pool'}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            {!isCancelled && booking.booking_status !== 'COMPLETED' && onCancel && (
              <button
                onClick={() => onCancel(booking.id, booking.booking_code)}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs border border-red-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Batalkan Tiket Ini
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
            >
              Selesai / Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
