import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { syncCustomerProfile } from '../api';

const COMMON_CITIES = ['Surabaya', 'Malang', 'Sidoarjo', 'Pasuruan', 'Gresik', 'Batu'];

export default function ProfileModal({ isOpen, onClose, currentUser, onProfileUpdated }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [idCard, setIdCard] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');
      setCity(currentUser.city || '');
      setIdCard(currentUser.id_card || '');
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong.');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('Nomor WhatsApp / HP wajib diisi untuk koordinasi tiket.');
      return;
    }

    const cleanedIdCard = idCard.trim().replace(/\D/g, '');
    if (cleanedIdCard && cleanedIdCard.length !== 16) {
      setErrorMsg('Nomor KTP / NIK harus 16 digit angka.');
      return;
    }

    setSaving(true);
    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      id_card: cleanedIdCard
    };

    try {
      // 1. Save to localStorage
      localStorage.setItem('travel_user', JSON.stringify(updatedUser));

      // 2. Sync to cloud/backend database
      await syncCustomerProfile(updatedUser);

      // 3. Inform parent component
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      setSuccessMsg('Data profil Anda berhasil diperbarui!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setErrorMsg(err.message || 'Gagal menyimpan perubahan profil.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (name || currentUser.name || 'P')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-5 sm:p-6 text-white flex items-start justify-between relative shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-lg font-black text-white shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 uppercase tracking-wider">
                  Profil Penumpang
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Login via {currentUser.method === 'google' ? 'Google' : currentUser.method === 'email' ? 'Email' : 'WhatsApp'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold mt-1 text-white">Kelola & Ubah Data Diri</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          
          {errorMsg && (
            <div className="p-3 text-xs sm:text-sm bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 text-xs sm:text-sm bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* 1. Nama Lengkap */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Nama Lengkap Sesuai KTP <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap Anda"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* 2. Nomor WhatsApp / HP */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Nomor WhatsApp / HP <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081234567890"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Nomor aktif yang dapat dihubungi saat penjemputan dan pengiriman tiket.
            </p>
          </div>

          {/* 3. Alamat Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Alamat Email <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* 4. Kota Domisili & Nomor KTP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                Kota Domisili <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Surabaya / Malang"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCity(c)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                      city === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                No. KTP / NIK <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  maxLength={16}
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value.replace(/\D/g, ''))}
                  placeholder="16 digit NIK"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Data NIK digunakan untuk keperluan asuransi perjalanan Jasa Raharja.
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-800">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Perubahan profil akan otomatis disinkronkan ke sistem AntarPool sehingga pesanan tiket baru Anda tidak perlu mengisi ulang.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
