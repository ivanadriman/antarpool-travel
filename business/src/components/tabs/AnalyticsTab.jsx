import React from 'react';
import { MapPin, Clock } from 'lucide-react';
import { formatIDR } from '../../utils';

export default function AnalyticsTab({ analytics, loadingAnalytics }) {
  if (loadingAnalytics && !analytics) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-slate-500">Menghitung statistik...</p>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Pendapatan Lunas (PAID)
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {formatIDR(analytics.paid_revenue)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Sudah dibayar saat tiba di pool
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tagihan Tertunda (PENDING)
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {formatIDR(analytics.pending_revenue)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Akan dibayar oleh penumpang di lokasi
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Pesanan
          </span>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {analytics.total_bookings}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Pesanan terkonfirmasi
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Penumpang
          </span>
          <p className="text-2xl font-black text-indigo-600 mt-1">
            {analytics.total_passengers} Kursi
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Akumulasi kursi terisi
          </span>
        </div>
      </div>

      {/* Top Routes & Time Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Routes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-600" /> Rute Paling Populer
          </h4>
          <div className="space-y-3">
            {analytics.top_routes?.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div>
                  <span className="text-xs font-bold text-slate-800">{r.route_name}</span>
                  <span className="block text-[11px] text-slate-500">
                    {r.booking_count} kali dipesan
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-600">
                  {formatIDR(r.total_amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Departure Times Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-600" /> Distribusi Jam Keberangkatan
          </h4>
          <div className="space-y-3">
            {analytics.time_distribution?.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-black rounded-md text-xs">
                    {t.departure_time} WIB
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    {t.booking_count} transaksi
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {t.seats_booked} kursi terisi
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
