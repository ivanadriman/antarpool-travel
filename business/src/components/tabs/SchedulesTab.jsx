import React from 'react';
import { Calendar, Plus, Car, Trash2 } from 'lucide-react';
import { formatIDR } from '../../utils';

export default function SchedulesTab({
  schedules,
  loadingSchedules,
  scheduleFilterDate,
  setScheduleFilterDate,
  onOpenAddSchedule,
  onOpenEditSchedule,
  handleDeleteSchedule
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Manajemen Jadwal & Tarif</h3>
          <p className="text-xs text-slate-500">
            Ubah jam keberangkatan, harga tiket, dan pantau ketersediaan kursi per tanggal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker for live seat availability */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-600">Tanggal:</span>
            <input
              type="date"
              value={scheduleFilterDate}
              onChange={(e) => setScheduleFilterDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={onOpenAddSchedule}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Jadwal Baru
          </button>
        </div>
      </div>

      {loadingSchedules ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-slate-500">Memuat daftar jadwal...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Rute (Asal → Tujuan)</th>
                  <th className="py-3 px-4">Jam Berangkat</th>
                  <th className="py-3 px-4">Harga Tiket (IDR)</th>
                  <th className="py-3 px-4">Armada Mobil</th>
                  <th className="py-3 px-4">Kapasitas (Sisa Kursi)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {s.origin_name} <span className="text-slate-400">→</span> {s.destination_name}
                      <span className="block text-[11px] font-normal text-slate-400">
                        {s.origin_city} ke {s.destination_city}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-blue-600 text-sm">
                      {s.departure_time} WIB
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {formatIDR(s.price)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-blue-600" />
                        <span>{s.armada_name || s.vehicle_model}</span>
                      </div>
                      {s.armada_plate && (
                        <span className="text-[10px] text-slate-400 block font-mono">{s.armada_plate}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md">
                          {s.total_seats} Kursi
                        </span>
                        <span
                          className={`px-2 py-0.5 font-bold rounded-md text-[11px] ${
                            (s.remaining_seats ?? s.total_seats) === 0
                              ? 'bg-red-100 text-red-700'
                              : (s.remaining_seats ?? s.total_seats) <= 2
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          (Sisa {s.remaining_seats ?? s.total_seats})
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {s.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOpenEditSchedule(s)}
                          className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold transition cursor-pointer"
                        >
                          Ubah
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(s.id)}
                          className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg font-semibold transition cursor-pointer inline-flex items-center gap-1"
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
