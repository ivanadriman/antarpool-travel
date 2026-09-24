import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Car, Grid, Check, Shield } from 'lucide-react';

// Cell types:
// 'seat': Passenger seat (bookable)
// 'driver': Driver's seat (not bookable)
// 'aisle': Walkway / aisle space
// 'empty': Empty space (no seat)

export default function ArmadaModal({ isOpen, onClose, onSave, editingArmada = null }) {
  const [name, setName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(3);
  const [grid, setGrid] = useState(() => createDefaultGrid(4, 3));
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Helper to construct grid
  function createDefaultGrid(r, c) {
    const newGrid = [];
    const alphabet = 'ABCD';

    for (let i = 0; i < r; i++) {
      const row = [];
      for (let j = 0; j < c; j++) {
        if (i === 0 && j === 0) {
          row.push({ type: 'driver', label: 'Supir' });
        } else if (i === 0 && j < c - 1) {
          row.push({ type: 'empty', label: '' });
        } else if (j === 1 && i > 0 && i < r - 1 && c >= 3) {
          row.push({ type: 'aisle', label: 'Lorong' });
        } else {
          const colLetter = alphabet[j] || `${j + 1}`;
          row.push({ type: 'seat', label: `${i + 1}${colLetter}` });
        }
      }
      newGrid.push(row);
    }
    return newGrid;
  }

  // Synchronize state when modal opens or editingArmada changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSaving(false);
      if (editingArmada) {
        setName(editingArmada.name || '');
        setLicensePlate(editingArmada.license_plate || '');
        setRows(editingArmada.rows_count || 4);
        setCols(editingArmada.cols_count || 3);
        let parsedGrid = [];
        try {
          parsedGrid = typeof editingArmada.layout_json === 'string'
            ? JSON.parse(editingArmada.layout_json)
            : editingArmada.layout_json;
        } catch (e) {}

        if (Array.isArray(parsedGrid) && parsedGrid.length > 0) {
          setGrid(parsedGrid);
        } else {
          setGrid(createDefaultGrid(editingArmada.rows_count || 4, editingArmada.cols_count || 3));
        }
      } else {
        setName('');
        setLicensePlate('');
        setRows(4);
        setCols(3);
        setGrid(createDefaultGrid(4, 3));
      }
    }
  }, [isOpen, editingArmada]);

  // Handle dimensions change
  const handleDimensionChange = (newR, newC) => {
    const r = Math.max(2, Math.min(8, Number(newR)));
    const c = Math.max(2, Math.min(5, Number(newC)));
    setRows(r);
    setCols(c);
    setGrid(createDefaultGrid(r, c));
  };

  // Cycle cell type when clicked: seat -> aisle -> empty -> driver -> seat
  const handleCellClick = (rIdx, cIdx) => {
    setGrid((prevGrid) => {
      const nextGrid = prevGrid.map((row) => row.map((cell) => ({ ...cell })));
      const current = nextGrid[rIdx][cIdx];

      let nextType = 'seat';
      if (current.type === 'seat') nextType = 'aisle';
      else if (current.type === 'aisle') nextType = 'empty';
      else if (current.type === 'empty') nextType = 'driver';
      else if (current.type === 'driver') nextType = 'seat';

      // Auto label
      let nextLabel = '';
      if (nextType === 'driver') nextLabel = 'Supir';
      else if (nextType === 'aisle') nextLabel = 'Lorong';
      else if (nextType === 'empty') nextLabel = '';
      else if (nextType === 'seat') {
        const alphabet = 'ABCD';
        nextLabel = `${rIdx + 1}${alphabet[cIdx] || cIdx + 1}`;
      }

      nextGrid[rIdx][cIdx] = { type: nextType, label: nextLabel };
      return nextGrid;
    });
  };

  // Calculate total passenger seats
  const totalPassengerSeats = grid.reduce(
    (total, row) => total + row.filter((cell) => cell.type === 'seat').length,
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Nama armada wajib diisi (contoh: Toyota HiAce Premio).');
      return;
    }

    if (totalPassengerSeats === 0) {
      setErrorMessage('Armada harus memiliki minimal 1 kursi penumpang.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingArmada?.id,
        name: name.trim(),
        license_plate: licensePlate.trim(),
        rows_count: rows,
        cols_count: cols,
        layout_json: grid,
        total_seats: totalPassengerSeats
      };

      const res = await onSave(payload);
      if (res && res.success === false) {
        setErrorMessage(res.error || 'Gagal menyimpan armada');
        setSaving(false);
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan saat menyimpan armada');
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {editingArmada ? 'Ubah Data & Denah Armada' : 'Tambah Armada & Atur Denah Kursi'}
              </h2>
              <p className="text-slate-300 text-xs mt-0.5">
                Tentukan jumlah baris & kolom, lalu klik kotak untuk mengatur denah kabin mobil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Vehicle Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nama Model Mobil / Armada
              </label>
              <input
                type="text"
                required
                placeholder="misal: Toyota HiAce Commuter / Innova Zenix"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nomor Plat Polisi (Opsional)
              </label>
              <input
                type="text"
                placeholder="misal: L 1234 XY"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Grid Dimensions Row & Col Picker */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Grid className="w-4 h-4 text-blue-600" />
              Ukuran Denah Mobil (Baris & Kolom)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Jumlah Baris (Row)</label>
                <select
                  value={rows}
                  onChange={(e) => handleDimensionChange(e.target.value, cols)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  {[2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n} Baris
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Jumlah Kolom (Col)</label>
                <select
                  value={cols}
                  onChange={(e) => handleDimensionChange(rows, e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  {[2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} Kolom
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 flex items-center justify-between bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl">
                <div>
                  <span className="text-slate-500 text-[11px] block">Kapasitas Penumpang:</span>
                  <span className="text-lg font-black text-blue-700">
                    {totalPassengerSeats} Kursi
                  </span>
                </div>
                <div className="text-[11px] text-blue-600/80 font-medium">
                  Klik tiap kotak di bawah untuk ubah tipe
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Layout Builder Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Editor Denah Kabin Mobil:
              </span>
              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-blue-600"></span> Kursi
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-500"></span> Supir
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></span> Lorong
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-slate-50 border border-dashed border-slate-300"></span> Kosong
                </span>
              </div>
            </div>

            {/* Car body container */}
            <div className="max-w-md mx-auto bg-slate-100 p-5 rounded-3xl border-2 border-slate-300 shadow-inner">
              {/* Front windshield */}
              <div className="w-44 h-6 mx-auto bg-sky-200/80 rounded-t-xl border-t-2 border-l-2 border-r-2 border-slate-400 mb-4 flex items-center justify-center">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  Depan Mobil (Kaca)
                </span>
              </div>

              {/* Grid rows */}
              <div className="space-y-2.5">
                {grid.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 w-4 text-right">
                      {rIdx + 1}
                    </span>

                    {row.map((cell, cIdx) => {
                      let cellStyle = 'bg-white border-2 border-blue-500 text-blue-700 shadow-xs';
                      if (cell.type === 'driver') cellStyle = 'bg-amber-500 border-2 border-amber-600 text-white font-bold';
                      else if (cell.type === 'aisle') cellStyle = 'bg-slate-200/80 border border-slate-300 text-slate-400';
                      else if (cell.type === 'empty') cellStyle = 'bg-slate-50 border border-dashed border-slate-300 text-slate-300';

                      return (
                        <div key={cIdx} className="relative group">
                          <button
                            type="button"
                            onClick={() => handleCellClick(rIdx, cIdx)}
                            title="Klik untuk ganti: Kursi -> Lorong -> Kosong -> Supir"
                            className={`w-14 h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition hover:scale-105 cursor-pointer select-none ${cellStyle}`}
                          >
                            <span className="text-[11px] leading-tight">{cell.label || '—'}</span>
                            <span className="text-[8px] uppercase tracking-tighter opacity-80 mt-0.5 font-medium">
                              {cell.type === 'seat' ? 'Kursi' : cell.type}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Rear bumper */}
              <div className="w-36 h-2 mx-auto bg-slate-300 rounded-b-full mt-4 border-b border-slate-400"></div>
            </div>

            <p className="text-center text-[11px] text-slate-400 mt-2">
              💡 Tip: Klik pada salah satu kotak di atas untuk berganti antara <strong>Kursi</strong>, <strong>Lorong</strong>, <strong>Kosong</strong>, dan <strong>Supir</strong>.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-1/2 py-3 border border-slate-300 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-1/2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : (editingArmada ? 'Simpan Perubahan' : 'Simpan Armada')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
