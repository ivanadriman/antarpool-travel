import React, { useState, useEffect } from 'react';
import { X, Clock, DollarSign, Users, Car, MapPin, AlertCircle } from 'lucide-react';
import { formatIDR } from '../utils';

export default function ScheduleModal({ 
  isOpen, 
  onClose, 
  spots = [], 
  armadas = [], 
  onSave, 
  editingSchedule = null 
}) {
  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [departureTime, setDepartureTime] = useState('08:00');
  const [price, setPrice] = useState(125000);
  const [selectedArmadaId, setSelectedArmadaId] = useState('');
  const [totalSeats, setTotalSeats] = useState(10);
  const [vehicleModel, setVehicleModel] = useState('Toyota HiAce Premio');
  const [vehicleLayout, setVehicleLayout] = useState('');
  const [isActive, setIsActive] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync state whenever modal opens or editingSchedule changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSaving(false);
      if (editingSchedule) {
        setOriginId(String(editingSchedule.origin_spot_id));
        setDestId(String(editingSchedule.destination_spot_id));
        setDepartureTime(editingSchedule.departure_time || '08:00');
        setPrice(editingSchedule.price || 125000);
        setSelectedArmadaId(editingSchedule.armada_id ? String(editingSchedule.armada_id) : '');
        setTotalSeats(editingSchedule.total_seats || 10);
        setVehicleModel(editingSchedule.vehicle_model || 'Toyota HiAce Premio');
        setVehicleLayout(editingSchedule.vehicle_layout || '');
        setIsActive(editingSchedule.is_active ?? 1);
      } else {
        // New schedule defaults
        const defaultOrigin = spots[0]?.id ? String(spots[0].id) : '';
        const defaultDest = spots.length > 1 ? String(spots[1].id) : '';
        const defaultArmada = armadas[0] || null;

        setOriginId(defaultOrigin);
        setDestId(defaultDest);
        setDepartureTime('08:00');
        setPrice(125000);
        if (defaultArmada) {
          setSelectedArmadaId(String(defaultArmada.id));
          setTotalSeats(defaultArmada.total_seats);
          setVehicleModel(defaultArmada.name);
          setVehicleLayout(defaultArmada.layout_json);
        } else {
          setSelectedArmadaId('');
          setTotalSeats(10);
          setVehicleModel('Toyota HiAce Premio');
          setVehicleLayout('hiace_10');
        }
        setIsActive(1);
      }
    }
  }, [isOpen, editingSchedule, spots, armadas]);

  // Handle Armada selection change
  const handleArmadaChange = (armadaId) => {
    setSelectedArmadaId(armadaId);
    const chosen = armadas.find((a) => String(a.id) === String(armadaId));
    if (chosen) {
      setVehicleModel(chosen.name);
      setTotalSeats(chosen.total_seats);
      setVehicleLayout(chosen.layout_json);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!originId) {
      setErrorMessage('Harap pilih Pool Asal');
      return;
    }

    if (!destId) {
      setErrorMessage('Harap pilih Pool Tujuan');
      return;
    }

    if (String(originId) === String(destId)) {
      setErrorMessage('Pool Asal dan Pool Tujuan tidak boleh sama');
      return;
    }

    if (!departureTime) {
      setErrorMessage('Harap masukkan Jam Berangkat');
      return;
    }

    if (!price || Number(price) <= 0) {
      setErrorMessage('Harga tiket harus lebih besar dari 0');
      return;
    }

    setSaving(true);
    try {
      const result = await onSave({
        id: editingSchedule?.id,
        origin_spot_id: Number(originId),
        destination_spot_id: Number(destId),
        departure_time: departureTime.trim(),
        price: Number(price),
        armada_id: selectedArmadaId ? Number(selectedArmadaId) : null,
        total_seats: Number(totalSeats),
        vehicle_model: vehicleModel.trim() || 'Toyota HiAce Premio',
        vehicle_layout: vehicleLayout || 'hiace_10',
        is_active: Number(isActive)
      });

      if (result && result.success === false) {
        setErrorMessage(result.error || 'Gagal menyimpan jadwal');
        setSaving(false);
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan saat menyimpan jadwal');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {editingSchedule ? 'Ubah Jadwal & Tarif' : 'Tambah Jadwal Baru'}
            </h2>
            <p className="text-slate-300 text-xs mt-0.5">
              Pilih rute, armada mobil, jam keberangkatan, dan harga tiket
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Route Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pool Asal
              </label>
              <select
                value={originId}
                disabled={!!editingSchedule}
                onChange={(e) => setOriginId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              >
                {spots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.city} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Pool Tujuan
              </label>
              <select
                value={destId}
                disabled={!!editingSchedule}
                onChange={(e) => setDestId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              >
                {spots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.city} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Armada Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-blue-600" /> Pilih Armada Mobil
            </label>
            <select
              value={selectedArmadaId}
              onChange={(e) => handleArmadaChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
            >
              {armadas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.total_seats} Kursi) {a.license_plate ? `- Plat: ${a.license_plate}` : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Denah kursi dan kapasitas akan mengikuti konfigurasi armada yang dipilih.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Jam Berangkat (WIB)
              </label>
              <input
                type="text"
                required
                placeholder="08:00"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Harga Tiket (IDR)
              </label>
              <input
                type="number"
                required
                step="5000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" /> Total Kapasitas Kursi
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={totalSeats}
              onChange={(e) => setTotalSeats(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold bg-slate-50"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Jumlah kapasitas kursi otomatis terisi sesuai armada yang Anda pilih di atas.
            </p>
          </div>

          {editingSchedule && (
            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive === 1}
                  onChange={(e) => setIsActive(e.target.checked ? 1 : 0)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span>Jadwal Aktif (Bisa dipesan penumpang)</span>
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-1/2 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
