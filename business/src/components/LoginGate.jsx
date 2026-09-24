import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertCircle, Car } from 'lucide-react';

export default function LoginGate({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Configured credentials (fallback to admin/antarpool2026)
  const EXPECTED_USER = import.meta.env.VITE_OPERATOR_USER || 'admin';
  const EXPECTED_PASS = import.meta.env.VITE_OPERATOR_PASS || 'antarpool2026';

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (username.trim() === EXPECTED_USER && password === EXPECTED_PASS) {
      const authData = {
        username: username.trim(),
        role: 'operator',
        loggedInAt: new Date().toISOString()
      };

      if (rememberMe) {
        localStorage.setItem('antarpool_operator_auth', JSON.stringify(authData));
      } else {
        sessionStorage.setItem('antarpool_operator_auth', JSON.stringify(authData));
      }

      onLoginSuccess(authData);
    } else {
      setErrorMessage('Username atau kata sandi tidak valid. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-3.5">
            <Car className="w-7 h-7" />
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="font-extrabold text-2xl text-white tracking-tight">AntarPool</span>
            <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              Bisnis
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Portal Khusus Petugas Operasional & Dispatcher Travel
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Username Petugas
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: admin"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me & Default credential hint */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Ingat sesi ini</span>
            </label>
            <span className="text-[11px] text-slate-500">
              Akun Default: <code className="text-blue-400 font-mono">admin</code> / <code className="text-blue-400 font-mono">antarpool2026</code>
            </span>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Masuk ke Dashboard Operator</span>
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 pt-5 border-t border-slate-700/60 text-center text-[11px] text-slate-400">
          🔒 Halaman ini dilindungi otentikasi. Semua akses perubahan jadwal, armada, dan pesanan dicatat dalam audit trail.
        </div>
      </div>
    </div>
  );
}
