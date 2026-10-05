import React, { useState, useEffect } from 'react';
import { 
  MapPin, Clock, ArrowRight, 
  AlertTriangle, Car, Shield 
} from 'lucide-react';
import ClientHeader from './components/ClientHeader';
import SearchHero from './components/SearchHero';
import MyBookingsModal from './components/MyBookingsModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import InteractiveSeatMap from './components/InteractiveSeatMap';
import TicketPass from './components/TicketPass';
import { formatIDR } from './utils';
import { getSpots, getSchedules, createBooking, lookupBookings, cancelBooking } from './api';

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  // Fetch pooling spots on load
  useEffect(() => {
    getSpots()
      .then((data) => setSpots(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load pooling spots:', err));
  }, []);

  // Search schedules
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!originSpotId || !destSpotId) return;

    setLoadingSchedules(true);
    setSelectedSchedule(null);
    setSelectedSeats([]);
    setBookingError('');
    setHasSearched(true);

    try {
      const data = await getSchedules(originSpotId, destSpotId, travelDate);
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  // Run search when spots or date are updated
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

  // Confirm Booking
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
      const newTicket = await createBooking({
        schedule_id: selectedSchedule.id,
        travel_date: travelDate,
        customer_name: currentUser.name,
        customer_phone: currentUser.phone || '',
        customer_email: currentUser.email || '',
        customer_city: currentUser.city || '',
        customer_id_card: currentUser.id_card || '',
        auth_method: currentUser.method || 'phone',
        seat_numbers: selectedSeats
      });

      // Success! Open digital ticket
      setActiveTicket(newTicket);
      // Reset selections
      setSelectedSeats([]);
      // Refresh schedules
      handleSearch();
    } catch (err) {
      console.error(err);
      setBookingError(err.message || 'Gagal memproses pemesanan tiket.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Fetch my bookings
  const loadMyBookings = async () => {
    if (!currentUser) return;
    try {
      const data = await lookupBookings({ phone: currentUser.phone, code: '' });
      setMyBookings(Array.isArray(data) ? data : (data ? [data] : []));
      setShowMyBookings(true);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId, bookingCode) => {
    if (!window.confirm(`Apakah Anda yakin ingin membatalkan pesanan tiket ${bookingCode}? Kursi yang Anda pilih akan dilepaskan.`)) {
      return;
    }
    try {
      await cancelBooking(bookingId, currentUser?.phone);
      
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
      alert(err.message || 'Gagal terhubung ke server');
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
      <ClientHeader
        currentUser={currentUser}
        onOpenMyBookings={loadMyBookings}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Hero & Route Search Card */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <SearchHero
          spots={spots}
          originSpotId={originSpotId}
          setOriginSpotId={setOriginSpotId}
          destSpotId={destSpotId}
          setDestSpotId={setDestSpotId}
          travelDate={travelDate}
          setTravelDate={setTravelDate}
          originSpot={originSpot}
          destSpot={destSpot}
          onResetSelection={() => {
            setSchedules([]);
            setSelectedSchedule(null);
            setSelectedSeats([]);
          }}
        />

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

            {/* Warning if error exists */}
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
      <MyBookingsModal
        isOpen={showMyBookings}
        onClose={() => setShowMyBookings(false)}
        currentUser={currentUser}
        myBookings={myBookings}
        onSelectTicket={(ticket) => {
          setShowMyBookings(false);
          setActiveTicket(ticket);
        }}
        onCancelBooking={handleCancelBooking}
      />

      {/* Passenger Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
        }}
      />
    </div>
  );
}
