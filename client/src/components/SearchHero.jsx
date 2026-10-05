import React from 'react';
import { MapPin, Calendar, Car } from 'lucide-react';
import { formatDateID } from '../utils';

export default function SearchHero({
  spots,
  originSpotId,
  setOriginSpotId,
  destSpotId,
  setDestSpotId,
  travelDate,
  setTravelDate,
  originSpot,
  destSpot,
  onResetSelection
}) {
  return (
    <>
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
            Antar Pool ke Pool Nyaman & Pasti
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 leading-tight">
            Pesan Tiket Travel Mobil Antar Kota
          </h1>
          <p className="text-blue-100 text-sm mt-1.5">
            Pilih pool terdekat, tentukan jam berangkat dan kursi favorit Anda. Bayar aman saat tiba di pool keberangkatan!
          </p>
        </div>

        <div className="absolute right-4 -bottom-6 opacity-15 hidden md:block select-none">
          <Car className="w-56 h-56" />
        </div>
      </div>

      {/* Route & Date Picker Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Origin Pooling Spot */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Pool Keberangkatan (Asal)
            </label>
            <div className="relative">
              <MapPin className="w-5 h-5 text-blue-600 absolute left-3 top-3 pointer-events-none" />
              <select
                value={originSpotId}
                onChange={(e) => {
                  const newOrigin = e.target.value;
                  setOriginSpotId(newOrigin);
                  if (destSpotId === newOrigin) {
                    setDestSpotId('');
                    if (onResetSelection) onResetSelection();
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="">-- Pilih Pool Keberangkatan --</option>
                {spots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.city} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            {originSpot ? (
              <p className="text-[11px] text-slate-500 mt-1 truncate">{originSpot.address}</p>
            ) : (
              <p className="text-[11px] text-blue-600 mt-1 font-medium">Pilih titik awal keberangkatan Anda</p>
            )}
          </div>

          {/* Destination Pooling Spot */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Pool Kedatangan (Tujuan)</span>
              {!originSpotId && (
                <span className="text-[10px] text-amber-600 font-normal">Pilih asal dahulu</span>
              )}
            </label>
            <div className="relative">
              <MapPin className={`w-5 h-5 absolute left-3 top-3 pointer-events-none ${originSpotId ? 'text-indigo-600' : 'text-slate-300'}`} />
              <select
                value={destSpotId}
                disabled={!originSpotId}
                onChange={(e) => setDestSpotId(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-semibold border transition focus:outline-hidden ${
                  originSpotId
                    ? 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <option value="">
                  {originSpotId ? '-- Pilih Pool Tujuan --' : '-- Pilih Pool Asal Terlebih Dahulu --'}
                </option>
                {spots.map((s) => {
                  const isSameAsOrigin = String(s.id) === String(originSpotId);
                  return (
                    <option key={s.id} value={s.id} disabled={isSameAsOrigin}>
                      {s.city} - {s.name} {isSameAsOrigin ? '(Sama dengan asal)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            {destSpot ? (
              <p className="text-[11px] text-slate-500 mt-1 truncate">{destSpot.address}</p>
            ) : originSpotId ? (
              <p className="text-[11px] text-slate-400 mt-1">Pilih pool tujuan perjalanan Anda</p>
            ) : null}
          </div>

          {/* Departure Date */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Tanggal Keberangkatan
            </label>
            <div className="relative">
              <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="date"
                value={travelDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{formatDateID(travelDate)}</p>
          </div>
        </div>
      </div>
    </>
  );
}
