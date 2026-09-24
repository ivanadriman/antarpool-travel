import React from 'react';
import { Check, ShieldAlert, Car } from 'lucide-react';
import { formatIDR } from '../utils';

// Fallback layout if none provided
const DEFAULT_HIACE_LAYOUT = [
  [
    { type: 'driver', label: 'Supir' },
    { type: 'empty', label: '' },
    { type: 'seat', label: '1A' }
  ],
  [
    { type: 'seat', label: '2A' },
    { type: 'aisle', label: 'Lorong' },
    { type: 'seat', label: '2B' }
  ],
  [
    { type: 'seat', label: '3A' },
    { type: 'aisle', label: 'Lorong' },
    { type: 'seat', label: '3B' }
  ],
  [
    { type: 'seat', label: '4A' },
    { type: 'seat', label: '4B' },
    { type: 'seat', label: '4C' }
  ]
];

export default function InteractiveSeatMap({
  bookedSeats = [],
  selectedSeats = [],
  onToggleSeat,
  pricePerSeat = 0,
  vehicleModel = 'Toyota HiAce Premio',
  vehicleLayout = null
}) {
  // Parse dynamic vehicle layout if provided as JSON string or array
  let layoutGrid = DEFAULT_HIACE_LAYOUT;
  if (vehicleLayout) {
    try {
      const parsed = typeof vehicleLayout === 'string' ? JSON.parse(vehicleLayout) : vehicleLayout;
      if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
        layoutGrid = parsed;
      }
    } catch (e) {
      layoutGrid = DEFAULT_HIACE_LAYOUT;
    }
  }

  const isSeatBooked = (seatId) => bookedSeats.includes(seatId);
  const isSeatSelected = (seatId) => selectedSeats.includes(seatId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-base">Pilih Kursi Penumpang</h3>
          <p className="text-xs text-slate-500">{vehicleModel} (Kabin Nyaman & Ber-AC)</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500">Tarif per Kursi</span>
          <p className="text-base font-bold text-blue-600">{formatIDR(pricePerSeat)}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600 mb-6 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white shadow-xs"></div>
          <span>Tersedia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
            ✓
          </div>
          <span>Dipilih Anda</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-slate-300 border border-slate-400 opacity-60"></div>
          <span>Sudah Dipesan</span>
        </div>
      </div>

      {/* Vehicle Body Visual Container */}
      <div className="max-w-xs mx-auto bg-slate-100/90 rounded-3xl p-5 border-2 border-slate-300 shadow-inner relative">
        {/* Windshield */}
        <div className="w-40 h-7 mx-auto bg-gradient-to-b from-sky-200 to-sky-100 rounded-t-2xl border-t-2 border-l-2 border-r-2 border-slate-400 mb-4 flex items-center justify-center">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kaca Depan</span>
        </div>

        {/* Dynamic Seat Grid Rows */}
        <div className="space-y-3">
          {layoutGrid.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-center items-center gap-2">
              {row.map((cell, cIdx) => {
                if (cell.type === 'aisle') {
                  return <div key={cIdx} className="w-10"></div>;
                }

                if (cell.type === 'empty') {
                  return <div key={cIdx} className="w-12 h-12"></div>;
                }

                if (cell.type === 'driver') {
                  return (
                    <div
                      key={cIdx}
                      className="w-12 h-12 rounded-xl bg-slate-300/80 border border-slate-400 text-slate-600 flex flex-col items-center justify-center text-[10px] font-bold shadow-xs select-none"
                    >
                      <Car className="w-4 h-4 text-slate-500 mb-0.5" />
                      <span>Supir</span>
                    </div>
                  );
                }

                const seatId = cell.label || `${rIdx + 1}-${cIdx + 1}`;
                const booked = isSeatBooked(seatId);
                const selected = isSeatSelected(seatId);

                return (
                  <button
                    key={cIdx}
                    type="button"
                    disabled={booked}
                    onClick={() => onToggleSeat(seatId)}
                    className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition-all relative cursor-pointer ${
                      booked
                        ? 'bg-slate-200 border border-slate-300 text-slate-400 cursor-not-allowed opacity-60'
                        : selected
                        ? 'bg-blue-600 border-2 border-blue-700 text-white shadow-md scale-105'
                        : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 shadow-xs'
                    }`}
                  >
                    <span>{seatId}</span>
                    {selected && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs">
                        ✓
                      </span>
                    )}
                    {booked && (
                      <span className="text-[8px] uppercase tracking-tighter text-slate-400">Penuh</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Vehicle Back bumper */}
        <div className="w-32 h-2 mx-auto bg-slate-300 rounded-b-full mt-4 border-b border-slate-400"></div>
      </div>

      {/* Selected Summary */}
      <div className="mt-5 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-xs text-blue-900 font-medium">Kursi yang Anda pilih:</span>
          <div className="flex gap-1.5 mt-0.5">
            {selectedSeats.length > 0 ? (
              selectedSeats.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-blue-600 text-white font-bold text-xs rounded-md shadow-xs">
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">Belum ada kursi dipilih</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500">Total Pembayaran</span>
          <p className="text-lg font-extrabold text-blue-700">
            {formatIDR(selectedSeats.length * pricePerSeat)}
          </p>
        </div>
      </div>
    </div>
  );
}
