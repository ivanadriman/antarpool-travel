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
  ExternalLink
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
        notes: notes.trim()
      });

      if (res && res.success === false) {
        setErrorMessage(res.error || 'Gagal menyimpan perubahan');
      } else {
        setSaveSuccess(true);
        if (onCustomerUpdated) {
          onCustomerUpdated({
            ...customer,
            is_vip: isVip,
            is_blacklisted: isBlacklisted,
            notes: notes.trim()
          });
        }
        setTimeout(() => setSaveSuccess(false), 3000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-start justify-between relative">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 ${
              isBlacklisted 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : isVip 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-xs shadow-amber-500/20' 
                  : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
            }`}>
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">{customer.name}</h2>
                {isVip && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-300" />
                    VIP
                  </span>
                )}
                {isBlacklisted && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    Diblokir / No-Show
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  {customer.phone || 'Tanpa nomor HP'}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-500" />
                    {customer.email}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300">
                  Login via {customer.auth_method === 'google' ? 'Google' : customer.auth_method === 'email' ? 'Email' : 'WhatsApp'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Quick Contact & Action Buttons */}
          <div className="flex flex-wrap gap-2.5">
            {cleanWaNumber && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-900/30 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Hubungi via WhatsApp</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}

            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
              >
                <Phone className="w-4 h-4 text-blue-400" />
                <span>Telepon Langsung</span>
              </a>
            )}

            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
              >
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>Kirim Email</span>
              </a>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Total Pesanan</span>
              <span className="text-lg font-bold text-white mt-0.5 block">
                {customer.total_trips || bookings.length || 0}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Sukses / Selesai</span>
              <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
                {customer.completed_trips !== undefined 
                  ? customer.completed_trips 
                  : bookings.filter((b) => b.booking_status !== 'CANCELLED').length}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Pembatalan</span>
              <span className="text-lg font-bold text-red-400 mt-0.5 block">
                {customer.cancelled_trips !== undefined 
                  ? customer.cancelled_trips 
                  : bookings.filter((b) => b.booking_status === 'CANCELLED').length}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Total Transaksi</span>
              <span className="text-base font-bold text-amber-400 mt-0.5 block truncate">
                {formatIDR(customer.total_spent || 0)}
              </span>
            </div>
          </div>

          {/* Operator Controls & Notes Form */}
          <form onSubmit={handleSave} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              Pengaturan Status & Catatan Operator
            </h3>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Perubahan profil pelanggan berhasil disimpan.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* VIP Toggle */}
              <label className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                isVip 
                  ? 'bg-amber-950/30 border-amber-500/50 text-amber-200' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}>
                <input
                  type="checkbox"
                  checked={isVip}
                  onChange={(e) => setIsVip(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 bg-slate-800 border-slate-700"
                />
                <div>
                  <span className="text-xs font-bold block flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    Tandai Penumpang VIP
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Prioritaskan pemesanan & layanan istimewa
                  </span>
                </div>
              </label>

              {/* Blacklist Toggle */}
              <label className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                isBlacklisted 
                  ? 'bg-red-950/30 border-red-500/50 text-red-200' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}>
                <input
                  type="checkbox"
                  checked={isBlacklisted}
                  onChange={(e) => setIsBlacklisted(e.target.checked)}
                  className="rounded text-red-500 focus:ring-red-500 w-4 h-4 bg-slate-800 border-slate-700"
                />
                <div>
                  <span className="text-xs font-bold block flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    Tandai Bermasalah / No-Show
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Peringatan bagi dispatcher jika memesan lagi
                  </span>
                </div>
              </label>
            </div>

            {/* Operator Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Catatan Khusus Dispatcher / Operator:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Penumpang sering memilih kursi depan 1A, membawa barang bawaan banyak, atau minta dijemput dekat gerbang..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:outline-hidden focus:border-blue-500 text-xs text-slate-200 placeholder-slate-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Booking History Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-blue-400" />
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
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span>Memuat riwayat tiket...</span>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/80">
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
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        isCancelled 
                          ? 'bg-slate-950/30 border-slate-800/50 opacity-70' 
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-blue-400">
                            {b.booking_code}
                          </span>
                          <span className="text-slate-300 font-semibold">
                            {b.origin_name || 'Pool Asal'} ➔ {b.destination_name || 'Pool Tujuan'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {formatIndonesianDate(b.travel_date)}
                          </span>
                          {b.departure_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {b.departure_time}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3 text-slate-500" />
                            Kursi: {Array.isArray(seatArray) ? seatArray.join(', ') : b.seat_numbers}
                          </span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0">
                        <span className="font-bold text-white">
                          {formatIDR(b.total_price)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isCancelled ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-800/50 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Batal
                            </span>
                          ) : isPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Lunas
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/50">
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
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
