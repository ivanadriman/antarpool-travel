import React, { useState } from 'react';
import { Phone, Mail, Globe, User, ShieldCheck, X } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [method, setMethod] = useState('phone'); // 'phone', 'email', 'google'
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('input'); // 'input' or 'verify'
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Harap masukkan nama lengkap Anda.');
      return;
    }

    if (!contact.trim()) {
      setError(method === 'phone' ? 'Harap masukkan nomor WhatsApp / HP.' : 'Harap masukkan email.');
      return;
    }

    if (method === 'google') {
      // Direct login for Google
      const userData = {
        name: name.trim(),
        email: contact.trim().includes('@') ? contact.trim() : `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        phone: '+62 812-3456-7890',
        method: 'google'
      };
      localStorage.setItem('travel_user', JSON.stringify(userData));
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

      const userData = {
        name: name.trim(),
        phone: method === 'phone' ? contact.trim() : '',
        email: method === 'email' ? contact.trim() : '',
        method: method
      };

      localStorage.setItem('travel_user', JSON.stringify(userData));
      onLoginSuccess(userData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-white/20 uppercase tracking-wider">
              Autentikasi Penumpang
            </span>
          </div>
          <h2 className="text-2xl font-bold">Masuk atau Daftar</h2>
          <p className="text-blue-100 text-sm mt-1">
            Pesan tiket travel antar pool dengan mudah dan cepat.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
              <span className="font-medium">{error}</span>
            </div>
          )}

          {step === 'input' && (
            <>
              {/* Method Picker Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setMethod('phone'); setError(''); }}
                  className={`py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition ${
                    method === 'phone' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  No. HP
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod('email'); setError(''); }}
                  className={`py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition ${
                    method === 'email' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod('google'); setError(''); }}
                  className={`py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition ${
                    method === 'google' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Google
                </button>
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Nama Lengkap Sesuai KTP
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Contact Field based on method */}
              {method === 'phone' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                    Nomor WhatsApp / HP
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="081234567890"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Kode booking tiket akan dikonfirmasi ke nomor ini.</p>
                </div>
              )}

              {method === 'email' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="nama@email.com"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              )}

              {method === 'google' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                  <div className="w-10 h-10 bg-white shadow-xs rounded-full flex items-center justify-center mx-auto text-blue-600 font-bold">
                    G
                  </div>
                  <p className="text-xs text-slate-600">
                    Masuk instan menggunakan Akun Google Anda
                  </p>
                  <input
                    type="email"
                    placeholder="nama@gmail.com (opsional)"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 text-center"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                {method === 'google' ? 'Lanjutkan dengan Google' : 'Lanjutkan'}
              </button>
            </>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800">Verifikasi Kode</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Masukkan kode verifikasi 4-digit yang dikirim ke <br />
                  <strong className="text-slate-800">{contact}</strong>
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
                <p className="text-[11px] text-center text-slate-400 mt-1">
                  Tips Demo: Ketik 4 digit apa saja (misal: 1234)
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="w-1/3 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md transition"
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
