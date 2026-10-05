import React, { useState } from 'react';
import { Phone, Mail, Globe, User, ShieldCheck, X, MapPin, CreditCard } from 'lucide-react';
import { syncCustomerProfile } from '../api';

const COMMON_CITIES = ['Surabaya', 'Malang', 'Sidoarjo', 'Pasuruan', 'Gresik', 'Batu'];

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [method, setMethod] = useState('phone'); // 'phone', 'email', 'google'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [idCard, setIdCard] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('input'); // 'input' or 'verify'
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Harap masukkan nama lengkap Anda sesuai KTP.');
      return;
    }

    if (!phone.trim()) {
      setError('Nomor WhatsApp / HP wajib diisi agar tiket dan jadwal dapat dikonfirmasikan.');
      return;
    }

    if (method === 'email' && !email.trim()) {
      setError('Harap masukkan alamat email yang valid.');
      return;
    }

    if (idCard.trim() && idCard.trim().replace(/\D/g, '').length !== 16) {
      setError('Nomor KTP / NIK harus terdiri dari 16 digit angka.');
      return;
    }

    const userData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || (method === 'google' ? `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com` : ''),
      city: city.trim(),
      id_card: idCard.trim(),
      method: method
    };

    if (method === 'google') {
      // Direct login for Google
      localStorage.setItem('travel_user', JSON.stringify(userData));
      try {
        syncCustomerProfile(userData);
      } catch (err) {
        console.warn('Sync profile error:', err);
      }
      onLoginSuccess(userData);
      onClose();
      return;
    }

    // For phone and email, show verification OTP step
    if (step === 'input') {
      setStep('verify');
      return;
    }

    if (step === 'verify') {
      if (!otp || otp.length < 4) {
        setError('Harap masukkan kode OTP 4 digit (misal: 1234).');
        return;
      }

      localStorage.setItem('travel_user', JSON.stringify(userData));
      try {
        syncCustomerProfile(userData);
      } catch (err) {
        console.warn('Sync profile error:', err);
      }
      onLoginSuccess(userData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-5 sm:p-6 text-white relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 uppercase tracking-wider">
              Registrasi & Masuk Penumpang
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">Pendaftaran Penumpang</h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1">
            Lengkapi data diri Anda untuk pemesanan tiket travel pool-ke-pool secara instan.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {error && (
            <div className="p-3 text-xs sm:text-sm bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {step === 'input' && (
            <>
              {/* Method Picker Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setMethod('phone'); setError(''); }}
                  className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    method === 'phone' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  No. HP / WA
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod('email'); setError(''); }}
                  className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    method === 'email' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod('google'); setError(''); }}
                  className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    method === 'google' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Google
                </button>
              </div>

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
                    placeholder="Contoh: Budi Santoso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* 2. Nomor WhatsApp / HP */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                  Nomor WhatsApp / HP Aktif <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">E-tiket dan konfirmasi supir/pool akan dikirim ke nomor WhatsApp ini.</p>
              </div>

              {/* 3. Alamat Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                  Alamat Email {method === 'email' ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal">(Opsional)</span>}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required={method === 'email'}
                    placeholder="budi@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
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
                      placeholder="Surabaya / Malang"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    />
                  </div>
                  {/* Quick Select Chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {COMMON_CITIES.slice(0, 4).map((c) => (
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
                      placeholder="16 digit NIK"
                      value={idCard}
                      onChange={(e) => setIdCard(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Untuk asuransi perjalanan & verifikasi armada.</p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer text-sm mt-2"
              >
                {method === 'google' ? 'Lanjutkan Masuk dengan Google' : 'Lanjutkan Verifikasi'}
              </button>
            </>
          )}

          {step === 'verify' && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Verifikasi Kode Masuk</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Masukkan kode verifikasi 4-digit yang dikirimkan ke <br />
                  <strong className="text-slate-800">{phone}</strong>
                </p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  placeholder="1234"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full py-3 text-center tracking-[0.5em] text-2xl font-bold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-center text-slate-400 mt-1.5">
                  Tips Demo: Ketik 4 digit apa saja (misal: 1234)
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="w-1/3 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition cursor-pointer"
                >
                  Verifikasi & Masuk
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
