import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MessageCircle, 
  Star, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  Car, 
  Ticket, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Save,
  Loader2,
  ExternalLink,
  Info,
  Check
} from 'lucide-react';
import { formatIDR, formatIndonesianDate } from '../utils';
import { getCustomerBookings, updateCustomer } from '../api';

export default function CustomerModal({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated
}) {
  const [isVip, setIsVip] = useState(false);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [notes, setNotes] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [isFallbackSave, setIsFallbackSave] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && customer) {
      setIsVip(Boolean(customer.is_vip));
      setIsBlacklisted(Boolean(customer.is_blacklisted));
      setNotes(customer.notes || '');
      setSaveSuccess(false);
      setErrorMessage('');
      fetchBookings();
    }
  }, [isOpen, customer]);

  const fetchBookings = async () => {
    if (!customer?.phone) return;
    setLoadingBookings(true);
    try {
      const data = await getCustomerBookings(customer.phone);
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching customer bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  if (!isOpen || !customer) return null;

  // Format WhatsApp number for URL: convert leading 0 to 62
  const getCleanWaNumber = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  const cleanWaNumber = getCleanWaNumber(customer.phone);
  const waGreeting = encodeURIComponent(
    `Halo Bapak/Ibu ${customer.name}, kami dari tim layanan AntarPool Travel. Terkait perjalanan Anda...`
  );
  const waUrl = cleanWaNumber ? `https://wa.me/${cleanWaNumber}?text=${waGreeting}` : '#';

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSaveSuccess(false);

    try {
      const res = await updateCustomer(customer.id, {
        is_vip: isVip,
        is_blacklisted: isBlacklisted,
        notes: notes.trim(),
        phone: customer.phone
      });

      if (res && res.success === false) {
        setErrorMessage(res.error || 'Gagal menyimpan perubahan');
      } else {
        setSaveSuccess(true);
        setIsFallbackSave(Boolean(res?.isFallback));
        setSaveNotice(
          res?.notice ||
          (res?.isFallback
            ? 'Perubahan berhasil disimpan di memori browser (Mode Fallback: tabel customers di Supabase belum dibuat).'
            : 'Perubahan profil & catatan pelanggan berhasil disimpan ke database cloud Supabase!')
        );
        if (onCustomerUpdated) {
          onCustomerUpdated({
            ...customer,
            is_vip: isVip,
            is_blacklisted: isBlacklisted,
            notes: notes.trim()
          }, res);
        }
        setTimeout(() => setSaveSuccess(false), 8000);
      }
    } catch (err) {
      console.error('Failed to update customer:', err);
      setErrorMessage(err.message || 'Gagal memperbarui data pelanggan');
    } finally {
      setSaving(false);
    }
  };

  // Avatar initials
  const initials = customer.name
    ? customer.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'PL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-start justify-between relative shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-base sm:text-lg font-black shrink-0 ${
              isBlacklisted 
                ? 'bg-red-500/20 text-red-300 border border-red-500/40' 
                : isVip 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs shadow-amber-500/20' 
                  : 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
            }`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">{customer.name}</h2>
                {isVip && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 fill-amber-300" />
                    VIP
                  </span>
                )}
                {isBlacklisted && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1 shrink-0">
                    <ShieldAlert className="w-3 h-3" />
                    Diblokir / No-Show
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-300 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {customer.phone || 'Tanpa nomor HP'}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{customer.email}</span>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] text-slate-200">
                  Login via {customer.auth_method === 'google' ? 'Google' : customer.auth_method === 'email' ? 'Email' : 'WhatsApp'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50 text-slate-800">
          
          {/* Quick Contact & Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {cleanWaNumber && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 sm:gap-2 shadow-xs transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Hubungi via WhatsApp</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}

            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border border-slate-200 shadow-2xs transition"
              >
                <Phone className="w-4 h-4 text-blue-600" />
                <span>Telepon Langsung</span>
              </a>
            )}

            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border border-slate-200 shadow-2xs transition"
              >
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Kirim Email</span>
              </a>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-medium">Total Pesanan</span>
              <span className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 block">
                {customer.total_trips || bookings.length || 0}
              </span>
            </div>
            <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-medium">Sukses / Selesai</span>
              <span className="text-base sm:text-lg font-bold text-emerald-600 mt-0.5 block">
                {customer.completed_trips !== undefined 
                  ? customer.completed_trips 
                  : bookings.filter((b) => b.booking_status !== 'CANCELLED').length}
              </span>
            </div>
            <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-medium">Pembatalan</span>
              <span className="text-base sm:text-lg font-bold text-red-600 mt-0.5 block">
                {customer.cancelled_trips !== undefined 
                  ? customer.cancelled_trips 
                  : bookings.filter((b) => b.booking_status === 'CANCELLED').length}
              </span>
            </div>
            <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-medium">Total Transaksi</span>
              <span className="text-sm sm:text-base font-bold text-blue-700 mt-0.5 block truncate">
                {formatIDR(customer.total_spent || 0)}
              </span>
            </div>
          </div>

          {/* Operator Controls & Notes Form */}
          <form onSubmit={handleSave} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Pengaturan Status & Catatan Operator
            </h3>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {saveSuccess && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                isFallbackSave
                  ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
              }`}>
                {isFallbackSave ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                ) : (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="font-bold block">
                    {isFallbackSave ? 'Pemberitahuan Simpan (Mode Fallback)' : 'Pemberitahuan: Berhasil Disimpan'}
                  </span>
                  <span className="mt-0.5 block opacity-90 leading-relaxed">{saveNotice}</span>
                  {isFallbackSave && (
                    <span className="block mt-1 text-[11px] text-amber-800 font-medium">
                      💡 Status VIP & catatan tersimpan di browser Anda. Jalankan script SQL di Supabase SQL Editor agar tersimpan permanen di cloud untuk semua operator.
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* VIP Toggle */}
              <label className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                isVip 
                  ? 'bg-amber-50 border-amber-300 text-amber-900' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
              }`}>
                <input
                  type="checkbox"
                  checked={isVip}
                  onChange={(e) => setIsVip(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 border-slate-300"
                />
                <div>
                  <span className="text-xs font-bold block flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    Tandai Penumpang VIP
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Prioritaskan pemesanan & layanan istimewa
                  </span>
                </div>
              </label>

              {/* Blacklist Toggle */}
              <label className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                isBlacklisted 
                  ? 'bg-red-50 border-red-300 text-red-900' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
              }`}>
                <input
                  type="checkbox"
                  checked={isBlacklisted}
                  onChange={(e) => setIsBlacklisted(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4 border-slate-300"
                />
                <div>
                  <span className="text-xs font-bold block flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    Tandai Bermasalah / No-Show
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Peringatan bagi dispatcher jika memesan lagi
                  </span>
                </div>
              </label>
            </div>

            {/* Operator Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Catatan Khusus Dispatcher / Operator:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Penumpang sering memilih kursi depan 1A, membawa barang bawaan banyak, atau minta dijemput dekat gerbang..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 placeholder-slate-400 transition"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex-1 min-w-0">
                {saveSuccess ? (
                  <div className={`p-2.5 sm:p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in zoom-in duration-200 ${
                    isFallbackSave 
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs' 
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                  }`}>
                    {isFallbackSave ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="font-bold truncate">{saveNotice}</span>
                  </div>
                ) : errorMessage ? (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="truncate">{errorMessage}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Perubahan status akan segera aktif pada sistem dispatcher.
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer shrink-0 ${
                  saveSuccess
                    ? isFallbackSave
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/30'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isFallbackSave ? 'Tersimpan (Lokal)!' : 'Tersimpan ke Cloud!'}</span>
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

          {/* Booking History Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-blue-600" />
                Riwayat Tiket & Perjalanan ({bookings.length})
              </span>
              {customer.last_travel_date && (
                <span className="text-[11px] font-normal text-slate-500">
                  Terakhir: {formatIndonesianDate(customer.last_travel_date)}
                </span>
              )}
            </h3>

            {loadingBookings ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>Memuat riwayat tiket...</span>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs">
                Belum ada catatan pemesanan tiket untuk pelanggan ini.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {bookings.map((b) => {
                  let seatArray = [];
                  try {
                    seatArray = typeof b.seat_numbers === 'string' ? JSON.parse(b.seat_numbers) : b.seat_numbers;
                  } catch (e) {
                    seatArray = [b.seat_numbers];
                  }

                  const isCancelled = b.booking_status === 'CANCELLED';
                  const isPaid = b.payment_status === 'PAID';

                  return (
                    <div 
                      key={b.id}
                      className={`p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition ${
                        isCancelled 
                          ? 'bg-slate-50/70 border-slate-200/80 opacity-75' 
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-blue-600">
                            {b.booking_code}
                          </span>
                          <span className="text-slate-800 font-semibold">
                            {b.origin_name || 'Pool Asal'} ➔ {b.destination_name || 'Pool Tujuan'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatIndonesianDate(b.travel_date)}
                          </span>
                          {b.departure_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {b.departure_time}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3 text-slate-400" />
                            Kursi: {Array.isArray(seatArray) ? seatArray.join(', ') : b.seat_numbers}
                          </span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="font-bold text-slate-900">
                          {formatIDR(b.total_price)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isCancelled ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Batal
                            </span>
                          ) : isPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Lunas
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Bayar di Pool
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
