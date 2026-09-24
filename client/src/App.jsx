import React, { useState, useEffect } from 'react';
import { 
  MapPin, Calendar, Clock, Users, ArrowRight, CheckCircle2, 
  AlertTriangle, Car, Shield, User, LogOut, Ticket, Phone, ChevronRight, XCircle 
} from 'lucide-react';
import AuthModal from './components/AuthModal';
import InteractiveSeatMap from './components/InteractiveSeatMap';
import TicketPass from './components/TicketPass';
import { formatIDR, formatDateID } from './utils';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('travel_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Travel Selection state
  const [spots, setSpots] = useState([]);
  const [originSpotId, setOriginSpotId] = useState('');
  const [destSpotId, setDestSpotId] = useState('');
  const [travelDate, setTravelDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Schedules state
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Seat selection & booking state
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [activeTicket, setActiveTicket] = useState(null);

  // My Bookings lookup modal
  const [myBookings, setMyBookings] = useState([]);
  const [showMyBookings, setShowMyBookings] = useState(false);

  // 1. Fetch pooling spots on load
  useEffect(() => {
    fetch(`${API_BASE}/api/spots`)
      .then((res) => res.json())
      .then((data) => {
        setSpots(data);
      })
      .catch((err) => console.error('Failed to load pooling spots:', err));
  }, []);

  // 2. Search schedules
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!originSpotId || !destSpotId) return;

    setLoadingSchedules(true);
    setSelectedSchedule(null);
    setSelectedSeats([]);
    setBookingError('');
    setHasSearched(true);

    try {
      const res = await fetch(`${API_BASE}/api/schedules?origin=${originSpotId}&destination=${destSpotId}&date=${travelDate}`);
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  // Run search when spots or date are first set
  useEffect(() => {
    if (originSpotId && destSpotId) {
      handleSearch();
    }
  }, [originSpotId, destSpotId, travelDate]);

  // Handle seat toggling on seat map
  const handleToggleSeat = (seatId) => {
    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((s) => s !== seatId);
      } else {
        return [...prev, seatId];
      }
    });
  };

  // 3. Confirm Booking
  const handleBookNow = async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    if (!selectedSchedule) {
      setBookingError('Harap pilih jadwal keberangkatan terlebih dahulu.');
      return;
    }

    if (selectedSeats.length === 0) {
      setBookingError('Harap pilih minimal 1 kursi pada denah mobil.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');

    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: selectedSchedule.id,
          travel_date: travelDate,
          customer_name: currentUser.name,
          customer_phone: currentUser.phone || '',
          customer_email: currentUser.email || '',
          auth_method: currentUser.method || 'phone',
          seat_numbers: selectedSeats
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.error || 'Terjadi kesalahan saat memesan tiket.');
        // Refresh schedules to update seat availability
        handleSearch();
        return;
      }

      // Success! Open digital ticket
      setActiveTicket(data);
      // Reset selections
      setSelectedSeats([]);
      // Refresh schedules
      handleSearch();
    } catch (err) {
      console.error(err);
      setBookingError('Gagal terhubung ke server. Silakan coba lagi.');
    } finally {
      setBookingLoading(false);
    }
  };

  // 4. Fetch my bookings
  const loadMyBookings = async () => {
    if (!currentUser) return;
    try {
      const param = currentUser.phone ? `phone=${encodeURIComponent(currentUser.phone)}` : `code=`;
      const res = await fetch(`${API_BASE}/api/bookings/lookup?${param}`);
      const data = await res.json();
      setMyBookings(Array.isArray(data) ? data : (data ? [data] : []));
      setShowMyBookings(true);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  // 4b. Cancel booking
  const handleCancelBooking = async (bookingId, bookingCode) => {
    if (!window.confirm(`Apakah Anda yakin ingin membatalkan pesanan tiket ${bookingCode}? Kursi yang Anda pilih akan dilepaskan.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentUser?.phone })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal membatalkan tiket');
        return;
      }
      
      // Update local myBookings state
      setMyBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, booking_status: 'CANCELLED', payment_status: 'CANCELLED' } : b))
      );

      // If this booking is actively opened in TicketPass, update it
      if (activeTicket && activeTicket.id === bookingId) {
        setActiveTicket((curr) => ({ ...curr, booking_status: 'CANCELLED', payment_status: 'CANCELLED' }));
      }

      // Refresh schedule availability in background
      handleSearch();
      alert('Pesanan tiket berhasil dibatalkan.');
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      alert('Gagal terhubung ke server');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('travel_user');
    setCurrentUser(null);
  };

  const originSpot = spots.find((s) => String(s.id) === String(originSpotId));
  const destSpot = spots.find((s) => String(s.id) === String(destSpotId));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">AntarPool</span>
              <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Travel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={loadMyBookings}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Tiket Saya</span>
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-bold text-slate-800 max-w-[100px] sm:max-w-[140px] truncate">
                    {currentUser.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="Keluar"
                    className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <User className="w-4 h-4" />
                Masuk / Daftar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero & Route Search Card */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
              Antar Pool ke Pool Nyaman & Pasti
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 leading-tight">
              Pesan Tiket Travel Mobil Antar Kota
            </h1>
            <p className="text-blue-100 text-sm mt-1.5">
              Pilih pool terdekat, tentukan jam berangkat dan kursi favorit Anda. Bayar aman saat tiba di pool keberangkatan!
            </p>
          </div>

          <div className="absolute right-4 -bottom-6 opacity-15 hidden md:block select-none">
            <Car className="w-56 h-56" />
          </div>
        </div>

        {/* Route & Date Picker Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Origin Pooling Spot */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Pool Keberangkatan (Asal)
              </label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-blue-600 absolute left-3 top-3 pointer-events-none" />
                <select
                  value={originSpotId}
                  onChange={(e) => {
                    const newOrigin = e.target.value;
                    setOriginSpotId(newOrigin);
                    // If the current arrival pool is the same as new origin, reset arrival pool
                    if (destSpotId === newOrigin) {
                      setDestSpotId('');
                      setSchedules([]);
                      setSelectedSchedule(null);
                      setSelectedSeats([]);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                >
                  <option value="">-- Pilih Pool Keberangkatan --</option>
                  {spots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.city} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {originSpot ? (
                <p className="text-[11px] text-slate-500 mt-1 truncate">{originSpot.address}</p>
              ) : (
                <p className="text-[11px] text-blue-600 mt-1 font-medium">Pilih titik awal keberangkatan Anda</p>
              )}
            </div>

            {/* Destination Pooling Spot */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Pool Kedatangan (Tujuan)</span>
                {!originSpotId && (
                  <span className="text-[10px] text-amber-600 font-normal">Pilih asal dahulu</span>
                )}
              </label>
              <div className="relative">
                <MapPin className={`w-5 h-5 absolute left-3 top-3 pointer-events-none ${originSpotId ? 'text-indigo-600' : 'text-slate-300'}`} />
                <select
                  value={destSpotId}
                  disabled={!originSpotId}
                  onChange={(e) => setDestSpotId(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-semibold border transition focus:outline-hidden ${
                    originSpotId
                      ? 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <option value="">
                    {originSpotId ? '-- Pilih Pool Tujuan --' : '-- Pilih Pool Asal Terlebih Dahulu --'}
                  </option>
                  {spots.map((s) => {
                    const isSameAsOrigin = String(s.id) === String(originSpotId);
                    return (
                      <option key={s.id} value={s.id} disabled={isSameAsOrigin}>
                        {s.city} - {s.name} {isSameAsOrigin ? '(Sama dengan asal)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              {destSpot ? (
                <p className="text-[11px] text-slate-500 mt-1 truncate">{destSpot.address}</p>
              ) : originSpotId ? (
                <p className="text-[11px] text-slate-400 mt-1">Pilih pool tujuan perjalanan Anda</p>
              ) : null}
            </div>

            {/* Departure Date */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Tanggal Keberangkatan
              </label>
              <div className="relative">
                <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  value={travelDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{formatDateID(travelDate)}</p>
            </div>
          </div>
        </div>

        {/* Schedules & Time Slot Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Pilihan Jam Keberangkatan
            </h2>
            <span className="text-xs text-slate-500">
              {schedules.length} jadwal tersedia untuk rute ini
            </span>
          </div>

          {loadingSchedules && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-slate-500">Memeriksa ketersediaan jadwal dan kursi...</p>
            </div>
          )}

          {/* Guidance when route not fully selected */}
          {(!originSpotId || !destSpotId) && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <MapPin className="w-10 h-10 text-blue-500 mx-auto mb-2 opacity-80" />
              <h3 className="font-bold text-slate-800">Tentukan Rute Perjalanan Anda</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {!originSpotId 
                  ? 'Silakan pilih Pool Keberangkatan (Asal) terlebih dahulu untuk melihat pilihan pool tujuan dan jadwal armada.' 
                  : 'Silakan pilih Pool Kedatangan (Tujuan) untuk menampilkan daftar jadwal keberangkatan dan sisa kursi.'}
              </p>
            </div>
          )}

          {!loadingSchedules && originSpotId && destSpotId && schedules.length === 0 && hasSearched && (
            <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <h3 className="font-bold text-amber-900">Tidak Ada Jadwal Keberangkatan</h3>
              <p className="text-xs text-amber-700 mt-1">
                Mohon maaf, saat ini belum ada armada yang dijadwalkan untuk rute dan tanggal yang dipilih.
                Silakan pilih rute lain atau tanggal berikutnya.
              </p>
            </div>
          )}

          {/* Schedule Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {schedules.map((sch) => {
              const isSelected = selectedSchedule?.id === sch.id;
              const isSoldOut = sch.is_sold_out;

              return (
                <div
                  key={sch.id}
                  onClick={() => {
                    if (!isSoldOut) {
                      setSelectedSchedule(sch);
                      setSelectedSeats([]);
                      setBookingError('');
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all relative cursor-pointer ${
                    isSoldOut
                      ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-blue-50/70 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-800">
                        {sch.departure_time}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">WIB</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      {formatIDR(sch.price)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sch.vehicle_model}</span>
                    </div>
                    <div>
                      {isSoldOut ? (
                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-bold text-[11px]">
                          Penuh
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                          Sisa {sch.available_seats_count} Kursi
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-xs font-bold">
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Vehicle Seat Map Section */}
        {selectedSchedule && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <InteractiveSeatMap
              bookedSeats={selectedSchedule.booked_seats || []}
              selectedSeats={selectedSeats}
              onToggleSeat={handleToggleSeat}
              pricePerSeat={selectedSchedule.price}
              vehicleModel={selectedSchedule.vehicle_model}
              vehicleLayout={selectedSchedule.vehicle_layout}
            />

            {/* Warning if no seats selected */}
            {bookingError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Booking Summary & Checkout Bar */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Bayar saat tiba di pool keberangkatan (Tanpa DP)</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-white">
                    {formatIDR(selectedSeats.length * selectedSchedule.price)}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({selectedSeats.length} kursi dipilih)
                  </span>
                </div>
              </div>

              <button
                onClick={handleBookNow}
                disabled={bookingLoading || selectedSeats.length === 0}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                  selectedSeats.length === 0
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95 shadow-blue-500/25'
                }`}
              >
                {bookingLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>Pesan Tiket Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <p>© 2026 AntarPool Travel - Aplikasi Pemesanan Travel Antar Pool.</p>
        <p className="mt-1">Bayar aman langsung di pool keberangkatan sebelum jadwal jalan.</p>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
        }}
      />

      {activeTicket && (
        <TicketPass
          booking={activeTicket}
          onClose={() => setActiveTicket(null)}
          onCancel={handleCancelBooking}
        />
      )}

      {/* My Bookings Modal */}
      {showMyBookings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Tiket Perjalanan Saya</h3>
                <p className="text-xs text-slate-500">Nomor: {currentUser?.phone || currentUser?.email}</p>
              </div>
              <button
                onClick={() => setShowMyBookings(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm px-2 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-3">
              {myBookings.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Belum ada riwayat pesanan.
                </div>
              ) : (
                myBookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setShowMyBookings(false);
                      setActiveTicket(b);
                    }}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED'
                        ? 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                        : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50/40'
                    }`}
                  >
                    <div>
                      <span className={`text-xs font-bold ${
                        b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED' ? 'text-slate-400' : 'text-blue-600'
                      }`}>{b.booking_code}</span>
                      <p className={`font-bold text-sm mt-0.5 ${
                        b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED' ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}>
                        {b.origin_name} → {b.destination_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateID(b.travel_date)} • {b.departure_time} WIB
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-xs font-bold ${
                          b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED' ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}>{formatIDR(b.total_price)}</span>
                        <span
                          className={`block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                            b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700'
                              : b.payment_status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED'
                            ? 'Dibatalkan'
                            : b.payment_status === 'PAID'
                            ? 'Sudah Lunas'
                            : 'Menunggu Bayar di Pool'}
                        </span>
                      </div>

                      {/* Batalkan Tiket Button */}
                      {b.booking_status !== 'CANCELLED' && b.payment_status !== 'CANCELLED' && b.booking_status !== 'COMPLETED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelBooking(b.id, b.booking_code);
                          }}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                          title="Batalkan Tiket"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Batalkan</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
