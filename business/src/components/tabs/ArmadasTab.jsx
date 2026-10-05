import React from 'react';
import { Plus, Car, Edit2, Trash2 } from 'lucide-react';

export default function ArmadasTab({
  armadas,
  loadingArmadas,
  onOpenAddArmada,
  onOpenEditArmada,
  handleDeleteArmada
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Manajemen Armada & Denah Kursi Mobil</h3>
          <p className="text-xs text-slate-500">
            Buat tipe mobil baru, atur jumlah baris & kolom, dan sesuaikan tata letak kabin
          </p>
        </div>

        <button
          onClick={onOpenAddArmada}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Armada Baru
        </button>
      </div>

      {loadingArmadas ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-slate-500">Memuat data armada...</p>
        </div>
      ) : armadas.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h4 className="font-bold text-slate-700">Belum Ada Armada</h4>
          <p className="text-xs text-slate-400 mt-1">
            Klik tombol di atas untuk menambahkan tipe mobil pertama Anda dengan denah kursi kustom.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {armadas.map((armada) => {
            let layoutGrid = [];
            try {
              layoutGrid = typeof armada.layout_json === 'string' ? JSON.parse(armada.layout_json) : armada.layout_json;
            } catch (e) {}

            return (
              <div
                key={armada.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{armada.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {armada.license_plate || 'Plat belum didaftarkan'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                      {armada.total_seats} Kursi
                    </span>
                  </div>

                  {/* Layout mini preview */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Denah ({armada.rows_count} Baris × {armada.cols_count} Kolom):
                    </span>
                    <div className="space-y-1.5 max-w-[200px] mx-auto">
                      {Array.isArray(layoutGrid) && layoutGrid.map((row, rIdx) => (
                        <div key={rIdx} className="flex justify-center gap-1">
                          {row.map((cell, cIdx) => {
                            let bg = 'bg-blue-600 text-white';
                            if (cell.type === 'driver') bg = 'bg-amber-500 text-white';
                            else if (cell.type === 'aisle') bg = 'bg-slate-200 text-slate-400';
                            else if (cell.type === 'empty') bg = 'bg-transparent border border-dashed border-slate-200';

                            return (
                              <div
                                key={cIdx}
                                className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold ${bg}`}
                                title={`${cell.label || cell.type}`}
                              >
                                {cell.type === 'driver' ? 'S' : (cell.label || '')}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                  <span className="text-[11px] text-slate-400">
                    ID: #{armada.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenEditArmada(armada)}
                      className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Ubah
                    </button>
                    <button
                      onClick={() => handleDeleteArmada(armada.id)}
                      className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
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
