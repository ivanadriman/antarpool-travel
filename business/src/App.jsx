import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, Bell, DollarSign, Users, Calendar, 
  Clock, Plus, Edit2, CheckCircle, XCircle, TrendingUp, 
  MapPin, Shield, RefreshCw, Car, ChevronRight, AlertCircle,
  Grid, Trash2, History, LogOut
} from 'lucide-react';
import ScheduleModal from './components/ScheduleModal';
import ArmadaModal from './components/ArmadaModal';
import OrderTimeline from './components/OrderTimeline';
import LoginGate from './components/LoginGate';
import { playChime, speakIndonesian } from './voiceNotifier';
import { formatIDR, formatDateID } from './utils';
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  getBusinessBookings, getArmadas, getSpots, getBusinessSchedules,
  updateBookingStatus, saveSchedule, deleteSchedule, saveArmada,
  deleteArmada, getTimeline, getAnalytics 
} from './api';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  // Operator Authentication Gate
  const [operatorUser, setOperatorUser] = useState(() => {
    try {
      const savedLocal = localStorage.getItem('antarpool_operator_auth');
      if (savedLocal) return JSON.parse(savedLocal);
      const savedSession = sessionStorage.getItem('antarpool_operator_auth');
      if (savedSession) return JSON.parse(savedSession);
      return null;
    } catch (e) {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('antarpool_operator_auth');
    sessionStorage.removeItem('antarpool_operator_auth');
    setOperatorUser(null);
  };

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'timeline', 'schedules', 'armadas', 'analytics'
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // Orders state
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [orderFilterDate, setOrderFilterDate] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState(''); // payment status
  const [orderFilterBookingStatus, setOrderFilterBookingStatus] = useState(''); // booking status (CONFIRMED, COMPLETED, CANCELLED)
  const [newOrderIds, setNewOrderIds] = useState(new Set()); // Tracks unread/new order IDs until hovered

  // Schedules state
  const [schedules, setSchedules] = useState([]);
  const [spots, setSpots] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleFilterDate, setScheduleFilterDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Armadas state
  const [armadas, setArmadas] = useState([]);
  const [loadingArmadas, setLoadingArmadas] = useState(false);
  const [armadaModalOpen, setArmadaModalOpen] = useState(false);
  const [editingArmada, setEditingArmada] = useState(null);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Timeline state
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Audio permission banner for browser autoplay policy
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [latestVoiceToast, setLatestVoiceToast] = useState(null);
  const [appAlert, setAppAlert] = useState(null); // { type: 'error' | 'success' | 'info', title: string, message: string }

  const showAlert = (message, type = 'error', title = '') => {
    setAppAlert({
      type,
      title: title || (type === 'error' ? 'Pemberitahuan Kesalahan' : type === 'success' ? 'Berhasil' : 'Info'),
      message
    });
    setTimeout(() => {
      setAppAlert(null);
    }, 6000);
  };

  const wsRef = useRef(null);

  // Keep voiceEnabled and scheduleFilterDate in refs so WebSocket handler can use latest values without reconnecting
  const voiceEnabledRef = useRef(voiceEnabled);
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  const scheduleFilterDateRef = useRef(scheduleFilterDate);
  useEffect(() => {
    scheduleFilterDateRef.current = scheduleFilterDate;
  }, [scheduleFilterDate]);

  // 1. Real-time voice & order notifications (Supports both Supabase Realtime & WebSocket fallback)
  useEffect(() => {
    if (!operatorUser) return;

    let isMounted = true;

    // Check if Supabase Realtime is configured
    if (isSupabaseConfigured && supabase) {
      console.log('Connecting to Supabase Realtime channel...');
      const channel = supabase
        .channel('business_orders_realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'bookings' },
          async (payload) => {
            if (!isMounted) return;
            const newOrder = payload.new;

            // Fetch enriched schedule names for accurate voice announcement
            let originName = 'Pool Keberangkatan';
            let destName = 'Pool Tujuan';
            let depTime = 'Keberangkatan';

            try {
              const { data: sch } = await supabase
                .from('schedules')
                .select('departure_time, origin:pooling_spots!origin_spot_id(name), destination:pooling_spots!destination_spot_id(name)')
                .eq('id', newOrder.schedule_id)
                .single();
              if (sch) {
                originName = sch.origin?.name || originName;
                destName = sch.destination?.name || destName;
                depTime = sch.departure_time || depTime;
              }
            } catch (e) {}

            const enrichedOrder = {
              ...newOrder,
              origin_name: originName,
              destination_name: destName,
              departure_time: depTime
            };

            setBookings((prev) => {
              if (prev.some((b) => b.id === newOrder.id || b.booking_code === newOrder.booking_code)) return prev;
              return [enrichedOrder, ...prev];
            });

            setNewOrderIds((prev) => new Set(prev).add(newOrder.id));

            const voiceText = `Pesanan baru dari ${originName} ke ${destName}. Pemesan ${newOrder.customer_name}, ${newOrder.seats_count} kursi, keberangkatan pukul ${depTime}.`;
            if (voiceEnabledRef.current) speakIndonesian(voiceText);

            setLatestVoiceToast({
              text: voiceText,
              customer: newOrder.customer_name,
              route: `${originName} → ${destName}`,
              seats: newOrder.seats_count,
              time: depTime
            });

            setTimeout(() => {
              if (isMounted) setLatestVoiceToast((curr) => (curr?.customer === newOrder.customer_name ? null : curr));
            }, 8000);

            fetchSchedulesAndSpots(scheduleFilterDateRef.current);
            fetchAnalytics();
            fetchTimeline();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bookings' },
          (payload) => {
            if (!isMounted) return;
            const updated = payload.new;

            setBookings((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));

            if (updated.booking_status === 'CANCELLED' || updated.payment_status === 'CANCELLED') {
              const cancelVoice = `Perhatian: Pesanan ${updated.booking_code} atas nama ${updated.customer_name} telah dibatalkan.`;
              if (voiceEnabledRef.current) speakIndonesian(cancelVoice, true);
              setLatestVoiceToast({
                isCancelled: true,
                text: cancelVoice,
                customer: updated.customer_name,
                seats: updated.seats_count
              });
              setTimeout(() => {
                if (isMounted) setLatestVoiceToast((curr) => (curr?.customer === updated.customer_name ? null : curr));
              }, 8000);
            }

            fetchSchedulesAndSpots(scheduleFilterDateRef.current);
            fetchAnalytics();
            fetchTimeline();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setWsConnected(true);
          }
        });

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }

    // Fallback: Connect to standard WebSocket server if no Supabase configured
    let wsUrl;
    if (API_BASE) {
      const wsProtocol = API_BASE.startsWith('https:') ? 'wss:' : 'ws:';
      const wsHost = API_BASE.replace(/^https?:\/\//, '');
      wsUrl = `${wsProtocol}//${wsHost}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//localhost:5000`;
    }

    let ws = null;
    let reconnectTimer = null;

    function connectWs() {
      if (!isMounted) return;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_BOOKING') {
            const newOrder = data.booking;
            setBookings((prev) => {
              if (prev.some((b) => b.id === newOrder.id || b.booking_code === newOrder.booking_code)) return prev;
              return [newOrder, ...prev];
            });
            setNewOrderIds((prev) => new Set(prev).add(newOrder.id));
            if (voiceEnabledRef.current) speakIndonesian(data.voiceText);
            setLatestVoiceToast({
              text: data.voiceText,
              customer: newOrder.customer_name,
              route: `${newOrder.origin_name} → ${newOrder.destination_name}`,
              seats: newOrder.seats_count,
              time: newOrder.departure_time
            });
            setTimeout(() => {
              if (isMounted) setLatestVoiceToast((curr) => (curr?.customer === newOrder.customer_name ? null : curr));
            }, 8000);
            fetchSchedulesAndSpots(scheduleFilterDateRef.current);
            fetchAnalytics();
            fetchTimeline();
          } else if (data.type === 'BOOKING_CANCELLED') {
            const cancelledOrder = data.booking;
            setBookings((prev) => prev.map((b) => (b.id === cancelledOrder.id ? { ...b, ...cancelledOrder } : b)));
            if (voiceEnabledRef.current && data.voiceText) speakIndonesian(data.voiceText, true);
            setLatestVoiceToast({
              isCancelled: true,
              text: data.voiceText || `Pesanan ${cancelledOrder.booking_code} telah dibatalkan.`,
              customer: cancelledOrder.customer_name
            });
            setTimeout(() => {
              if (isMounted) setLatestVoiceToast((curr) => (curr?.customer === cancelledOrder.customer_name ? null : curr));
            }, 8000);
            fetchSchedulesAndSpots(scheduleFilterDateRef.current);
            fetchAnalytics();
            fetchTimeline();
          } else if (data.type === 'BOOKING_UPDATED') {
            setBookings((prev) => prev.map((b) => (b.id === data.booking.id ? { ...b, ...data.booking } : b)));
            fetchSchedulesAndSpots(scheduleFilterDateRef.current);
            fetchAnalytics();
            fetchTimeline();
          }
        } catch (err) {}
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setWsConnected(false);
        reconnectTimer = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        if (ws) ws.close();
      };
    }

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [operatorUser]);

  // 2. Fetch initial data
  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const data = await getBusinessBookings({
        date: orderFilterDate,
        status: orderFilterBookingStatus,
        payment_status: orderFilterStatus
      });
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchArmadas = async () => {
    setLoadingArmadas(true);
    try {
      const data = await getArmadas();
      setArmadas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching armadas:', err);
    } finally {
      setLoadingArmadas(false);
    }
  };

  const fetchSchedulesAndSpots = async (customDate) => {
    setLoadingSchedules(true);
    try {
      const dateParam = customDate || scheduleFilterDate || new Date().toISOString().split('T')[0];
      const [schData, spotsData, armadasData] = await Promise.all([
        getBusinessSchedules(dateParam),
        getSpots(),
        getArmadas()
      ]);
      setSchedules(Array.isArray(schData) ? schData : []);
      setSpots(Array.isArray(spotsData) ? spotsData : []);
      setArmadas(Array.isArray(armadasData) ? armadasData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchTimeline = async () => {
    setLoadingTimeline(true);
    try {
      const data = await getTimeline();
      setTimelineEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    if (!operatorUser) return;
    fetchBookings();
    fetchSchedulesAndSpots();
    fetchArmadas();
    fetchAnalytics();
    fetchTimeline();
  }, [operatorUser, orderFilterDate, orderFilterStatus, orderFilterBookingStatus, scheduleFilterDate]);

  // 3. Update booking status (e.g. Mark as PAID on arrival, or CANCELLED)
  const handleUpdateStatus = async (bookingId, paymentStatus, bookingStatus) => {
    try {
      await updateBookingStatus(bookingId, paymentStatus, bookingStatus);
      fetchBookings();
      fetchSchedulesAndSpots();
      fetchAnalytics();
      fetchTimeline();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Dismiss new order highlight and counter when the order entry is hovered
  const handleOrderHover = (orderId) => {
    if (newOrderIds.has(orderId)) {
      setNewOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  // 4. Save schedule (Add or Edit)
  const handleSaveSchedule = async (schData) => {
    try {
      const res = await saveSchedule(schData);
      if (res && res.success === false) {
        return { success: false, error: res.error || 'Gagal menyimpan jadwal' };
      }
      await fetchSchedulesAndSpots();
      return { success: true };
    } catch (err) {
      console.error('Failed to save schedule:', err);
      return { success: false, error: 'Gagal terhubung ke database' };
    }
  };

  // 5. Save Armada (Create or Edit)
  const handleSaveArmada = async (armadaData) => {
    try {
      const res = await saveArmada(armadaData);
      if (res && res.success === false) {
        return { success: false, error: res.error || 'Gagal menyimpan armada' };
      }
      await fetchArmadas();
      await fetchSchedulesAndSpots();
      return { success: true };
    } catch (err) {
      console.error('Failed to save armada:', err);
      return { success: false, error: 'Gagal terhubung ke database' };
    }
  };

  // 6. Delete Armada
  const handleDeleteArmada = async (armadaId) => {
    if (!window.confirm('Yakin ingin menghapus armada ini? Jadwal yang menggunakan armada ini akan disesuaikan.')) {
      return;
    }
    try {
      await deleteArmada(armadaId);
      showAlert('Armada berhasil dihapus dari sistem.', 'success', 'Armada Dihapus');
      await fetchArmadas();
      await fetchSchedulesAndSpots();
    } catch (err) {
      console.error('Failed to delete armada:', err);
      showAlert(`Gagal menghapus armada: ${err.message}`, 'error', 'Koneksi Terputus');
    }
  };

  // 7. Delete Schedule
  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus jadwal keberangkatan ini?')) {
      return;
    }
    try {
      await deleteSchedule(scheduleId);
      showAlert('Jadwal keberangkatan berhasil dihapus.', 'success', 'Jadwal Dihapus');
      await fetchSchedulesAndSpots();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      showAlert(err.message || 'Gagal menghapus jadwal dari sistem.', 'error', 'Gagal Menghapus Jadwal');
    }
  };

  // Test voice button
  const handleTestVoice = () => {
    setAudioUnlocked(true);
    speakIndonesian('Notifikasi suara siap. Pesanan baru akan diumumkan secara otomatis.');
  };

  // If operator not authenticated, block dashboard with LoginGate
  if (!operatorUser) {
    return <LoginGate onLoginSuccess={(user) => setOperatorUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight">AntarPool</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                  Operator Bisnis
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                <span>{wsConnected ? 'Live WebSocket Aktif' : 'Terputus...'}</span>
              </div>
            </div>
          </div>

          {/* Voice Notification Controls & Operator Session */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleTestVoice}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Uji Notifikasi Suara</span>
            </button>

            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (!audioUnlocked) setAudioUnlocked(true);
              }}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                voiceEnabled
                  ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                  : 'bg-red-600/20 border-red-500/40 text-red-300 hover:bg-red-600/30'
              }`}
            >
              {voiceEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Suara: Aktif</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-red-400" />
                  <span className="hidden sm:inline">Suara: Bisukan</span>
                </>
              )}
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-xs font-semibold text-red-300 transition flex items-center gap-1.5 cursor-pointer"
              title="Keluar dari sesi operator"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 text-sm font-semibold border-t border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3.5 border-b-2 transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'orders'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Pesanan Masuk</span>
            {newOrderIds.size > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500 text-white font-black shadow-xs animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                +{newOrderIds.size} Baru
              </span>
            )}
            {bookings.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-600 text-white font-bold">
                {bookings.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-3.5 border-b-2 transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'schedules'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Jadwal & Tarif</span>
          </button>

          {/* TAB: ARMADA */}
          <button
            onClick={() => setActiveTab('armadas')}
            className={`py-3.5 border-b-2 transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'armadas'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Manajemen Armada</span>
            {armadas.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                {armadas.length}
              </span>
            )}
          </button>

          {/* TAB: TIMELINE DAN ALUR WAKTU PESANAN */}
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3.5 border-b-2 transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Timeline dan Alur Waktu Pesanan</span>
            {timelineEvents.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-600/80 text-white font-bold">
                {timelineEvents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3.5 border-b-2 transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Statistik & Laporan</span>
          </button>
        </div>
      </header>

      {/* Floating Notification / Toast Container (Fixed overlay - Does not push layout/table down) */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
        {/* App Alert Banner (Error / Warning / Success) */}
        {appAlert && (
          <div
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl flex items-start justify-between border backdrop-blur-md transition-all animate-in slide-in-from-top-3 duration-200 ${
              appAlert.type === 'error'
                ? 'bg-red-50/95 border-red-200 text-red-900 shadow-red-900/10'
                : appAlert.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-900/10'
                : 'bg-blue-50/95 border-blue-200 text-blue-900 shadow-blue-900/10'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                  appAlert.type === 'error'
                    ? 'bg-red-100 text-red-600'
                    : appAlert.type === 'success'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{appAlert.title}</p>
                <p className="text-xs mt-0.5 leading-relaxed opacity-90">{appAlert.message}</p>
              </div>
            </div>
            <button
              onClick={() => setAppAlert(null)}
              className="text-xs px-2.5 py-1 rounded-lg font-semibold border border-current opacity-70 hover:opacity-100 transition cursor-pointer shrink-0 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Voice Notification Toast Banner (New Booking / Cancellation) */}
        {latestVoiceToast && (
          <div
            className={`pointer-events-auto p-3.5 px-4 rounded-2xl shadow-xl border backdrop-blur-md flex items-center justify-between animate-in slide-in-from-top-3 duration-200 ${
              latestVoiceToast.isCancelled
                ? 'bg-slate-900/95 text-white border-red-500/50 shadow-red-950/20'
                : 'bg-slate-900/95 text-white border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  latestVoiceToast.isCancelled
                    ? 'bg-red-600/30 text-red-400'
                    : 'bg-blue-600/30 text-blue-400'
                }`}
              >
                {latestVoiceToast.isCancelled ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </div>
              <div>
                <p
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    latestVoiceToast.isCancelled ? 'text-red-400' : 'text-blue-400'
                  }`}
                >
                  {latestVoiceToast.isCancelled ? 'Pesanan Dibatalkan' : 'Panggilan Suara Baru'}
                </p>
                <p className="text-xs font-medium text-slate-200">{latestVoiceToast.text}</p>
              </div>
            </div>
            <button
              onClick={() => setLatestVoiceToast(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-md hover:bg-white/10 transition cursor-pointer shrink-0 ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* ================= TAB 1: ORDERS ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={orderFilterDate}
                    onChange={(e) => setOrderFilterDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                  {orderFilterDate && (
                    <button
                      onClick={() => setOrderFilterDate('')}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Status Bayar:</span>
                  <select
                    value={orderFilterStatus}
                    onChange={(e) => setOrderFilterStatus(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="">Semua Bayar</option>
                    <option value="PENDING">Menunggu Bayar</option>
                    <option value="PAID">Sudah Lunas</option>
                    <option value="CANCELLED">Batal Bayar</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Status Perjalanan:</span>
                  <select
                    value={orderFilterBookingStatus}
                    onChange={(e) => setOrderFilterBookingStatus(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="">Semua Status</option>
                    <option value="CONFIRMED">Terkonfirmasi (Aktif)</option>
                    <option value="COMPLETED">Selesai (Check-in)</option>
                    <option value="CANCELLED">Dibatalkan</option>
                  </select>
                </div>
              </div>

              <button
                onClick={fetchBookings}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Segarkan Data
              </button>
            </div>

            {/* Bookings List */}
            {loadingBookings ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Memuat data pesanan...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-slate-700">Belum Ada Pesanan</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pesanan yang dibuat oleh penumpang akan muncul di sini secara langsung dengan notifikasi suara.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const isNew = newOrderIds.has(b.id);
                  return (
                    <div
                      key={b.id}
                      onMouseEnter={() => handleOrderHover(b.id)}
                      className={`rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden ${
                        isNew
                          ? 'bg-gradient-to-r from-emerald-50/80 via-white to-white border-2 border-emerald-500 shadow-emerald-500/10 ring-4 ring-emerald-500/20'
                          : 'bg-white border border-slate-200'
                      }`}
                    >
                      {/* New Order Ribbon / Badge */}
                      {isNew && (
                        <div className="absolute -top-1 -right-1">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-bl-xl shadow-xs animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            Pesanan Baru
                          </span>
                        </div>
                      )}

                      {/* Left details */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black tracking-wider px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                            {b.booking_code}
                          </span>

                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            b.payment_status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : b.payment_status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-500 border border-slate-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {b.payment_status === 'PAID'
                            ? 'Sudah Bayar di Pool'
                            : b.payment_status === 'CANCELLED'
                            ? 'Batal Bayar'
                            : 'Menunggu Bayar di Pool'}
                        </span>

                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            b.booking_status === 'CONFIRMED'
                              ? 'bg-blue-100 text-blue-800'
                              : b.booking_status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800 font-semibold'
                          }`}
                        >
                          {b.booking_status === 'CONFIRMED'
                            ? 'Terkonfirmasi'
                            : b.booking_status === 'COMPLETED'
                            ? 'Selesai'
                            : 'Dibatalkan'}
                        </span>
                      </div>

                      {/* Route & Passenger */}
                      <div>
                        <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                          <span className={b.booking_status === 'CANCELLED' ? 'line-through text-slate-400' : ''}>{b.origin_name}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                          <span className={b.booking_status === 'CANCELLED' ? 'line-through text-slate-400' : ''}>{b.destination_name}</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Pemesan: <strong className="text-slate-800">{b.customer_name}</strong> • Telp: {b.customer_phone || '-'}
                        </p>
                      </div>

                      {/* Schedule info */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDateID(b.travel_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          Pukul {b.departure_time} WIB
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          {b.seats_count} Kursi: <strong className={`font-bold ${b.booking_status === 'CANCELLED' ? 'line-through text-slate-400' : 'text-blue-700'}`}>{Array.isArray(b.seat_numbers) ? b.seat_numbers.join(', ') : b.seat_numbers}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Right action & price */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      <div className="text-left lg:text-right">
                        <span className="text-[11px] text-slate-400">Total Tagihan (IDR)</span>
                        <p className={`text-xl font-black ${b.booking_status === 'CANCELLED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {formatIDR(b.total_price)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {b.booking_status === 'CANCELLED' ? (
                          <span className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            Pesanan Dibatalkan
                          </span>
                        ) : (
                          <>
                            {b.payment_status === 'PENDING' && (
                              <button
                                onClick={() => handleUpdateStatus(b.id, 'PAID', 'CONFIRMED')}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Terima Bayar di Pool
                              </button>
                            )}

                            {b.booking_status === 'CONFIRMED' && (
                              <button
                                onClick={() => handleUpdateStatus(b.id, b.payment_status, 'COMPLETED')}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                              >
                                Check-in Armada
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (window.confirm(`Batalkan pesanan ${b.booking_code} (${b.customer_name})? Kursi akan dilepaskan kembali untuk dipesan penumpang lain.`)) {
                                  handleUpdateStatus(b.id, 'CANCELLED', 'CANCELLED');
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                              title="Batalkan Pesanan"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: SCHEDULES & PRICING ================= */}
        {activeTab === 'schedules' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Manajemen Jadwal & Tarif</h3>
                <p className="text-xs text-slate-500">
                  Ubah jam keberangkatan, harga tiket, dan pantau ketersediaan kursi per tanggal
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Date Picker for live seat availability */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-600">Tanggal:</span>
                  <input
                    type="date"
                    value={scheduleFilterDate}
                    onChange={(e) => setScheduleFilterDate(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => {
                    setEditingSchedule(null);
                    setScheduleModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Jadwal Baru
                </button>
              </div>
            </div>

            {loadingSchedules ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Memuat daftar jadwal...</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Rute (Asal → Tujuan)</th>
                        <th className="py-3 px-4">Jam Berangkat</th>
                        <th className="py-3 px-4">Harga Tiket (IDR)</th>
                        <th className="py-3 px-4">Armada Mobil</th>
                        <th className="py-3 px-4">Kapasitas (Sisa Kursi)</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schedules.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {s.origin_name} <span className="text-slate-400">→</span> {s.destination_name}
                            <span className="block text-[11px] font-normal text-slate-400">
                              {s.origin_city} ke {s.destination_city}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-black text-blue-600 text-sm">
                            {s.departure_time} WIB
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {formatIDR(s.price)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5 text-blue-600" />
                              <span>{s.armada_name || s.vehicle_model}</span>
                            </div>
                            {s.armada_plate && (
                              <span className="text-[10px] text-slate-400 block font-mono">{s.armada_plate}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md">
                                {s.total_seats} Kursi
                              </span>
                              <span
                                className={`px-2 py-0.5 font-bold rounded-md text-[11px] ${
                                  (s.remaining_seats ?? s.total_seats) === 0
                                    ? 'bg-red-100 text-red-700'
                                    : (s.remaining_seats ?? s.total_seats) <= 2
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                (Sisa {s.remaining_seats ?? s.total_seats})
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.is_active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {s.is_active ? 'Aktif' : 'Non-Aktif'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingSchedule(s);
                                  setScheduleModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold transition cursor-pointer"
                              >
                                Ubah
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(s.id)}
                                className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg font-semibold transition cursor-pointer inline-flex items-center gap-1"
                                title="Hapus Jadwal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: ARMADA MANAGEMENT ================= */}
        {activeTab === 'armadas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Manajemen Armada & Denah Kursi Mobil</h3>
                <p className="text-xs text-slate-500">
                  Buat tipe mobil baru, atur jumlah baris & kolom, dan sesuaikan tata letak kabin
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingArmada(null);
                  setArmadaModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Armada Baru
              </button>
            </div>

            {loadingArmadas ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Memuat data armada...</p>
              </div>
            ) : armadas.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <Car className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-slate-700">Belum Ada Armada</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Klik tombol di atas untuk menambahkan tipe mobil pertama Anda dengan denah kursi kustom.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {armadas.map((armada) => {
                  let layoutGrid = [];
                  try {
                    layoutGrid = typeof armada.layout_json === 'string' ? JSON.parse(armada.layout_json) : armada.layout_json;
                  } catch (e) {}

                  return (
                    <div
                      key={armada.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">{armada.name}</h4>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              {armada.license_plate || 'Plat belum didaftarkan'}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                            {armada.total_seats} Kursi
                          </span>
                        </div>

                        {/* Layout mini preview */}
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            Denah ({armada.rows_count} Baris × {armada.cols_count} Kolom):
                          </span>
                          <div className="space-y-1.5 max-w-[200px] mx-auto">
                            {Array.isArray(layoutGrid) && layoutGrid.map((row, rIdx) => (
                              <div key={rIdx} className="flex justify-center gap-1">
                                {row.map((cell, cIdx) => {
                                  let bg = 'bg-blue-600 text-white';
                                  if (cell.type === 'driver') bg = 'bg-amber-500 text-white';
                                  else if (cell.type === 'aisle') bg = 'bg-slate-200 text-slate-400';
                                  else if (cell.type === 'empty') bg = 'bg-transparent border border-dashed border-slate-200';

                                  return (
                                    <div
                                      key={cIdx}
                                      className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold ${bg}`}
                                      title={`${cell.label || cell.type}`}
                                    >
                                      {cell.type === 'driver' ? 'S' : (cell.label || '')}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                        <span className="text-[11px] text-slate-400">
                          ID: #{armada.id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingArmada(armada);
                              setArmadaModalOpen(true);
                            }}
                            className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Ubah
                          </button>
                          <button
                            onClick={() => handleDeleteArmada(armada.id)}
                            className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: TIMELINE DAN ALUR WAKTU PESANAN ================= */}
        {activeTab === 'timeline' && (
          <OrderTimeline
            events={timelineEvents}
            loading={loadingTimeline}
            onRefresh={fetchTimeline}
          />
        )}

        {/* ================= TAB 4: STATISTICS & ANALYTICS ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {loadingAnalytics && !analytics ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Menghitung statistik...</p>
              </div>
            ) : analytics ? (
              <>
                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Pendapatan Lunas (PAID)
                    </span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">
                      {formatIDR(analytics.paid_revenue)}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Sudah dibayar saat tiba di pool
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Tagihan Tertunda (PENDING)
                    </span>
                    <p className="text-2xl font-black text-amber-600 mt-1">
                      {formatIDR(analytics.pending_revenue)}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Akan dibayar oleh penumpang di lokasi
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Total Pesanan
                    </span>
                    <p className="text-2xl font-black text-blue-600 mt-1">
                      {analytics.total_bookings}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Pesanan terkonfirmasi
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Total Penumpang
                    </span>
                    <p className="text-2xl font-black text-indigo-600 mt-1">
                      {analytics.total_passengers} Kursi
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Akumulasi kursi terisi
                    </span>
                  </div>
                </div>

                {/* Top Routes & Time Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Routes */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-600" /> Rute Paling Populer
                    </h4>
                    <div className="space-y-3">
                      {analytics.top_routes.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                          <div>
                            <span className="text-xs font-bold text-slate-800">{r.route_name}</span>
                            <span className="block text-[11px] text-slate-500">
                              {r.booking_count} kali dipesan
                            </span>
                          </div>
                          <span className="text-xs font-bold text-blue-600">
                            {formatIDR(r.total_amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Departure Times Breakdown */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" /> Distribusi Jam Keberangkatan
                    </h4>
                    <div className="space-y-3">
                      {analytics.time_distribution.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-black rounded-md text-xs">
                              {t.departure_time} WIB
                            </span>
                            <span className="text-xs text-slate-600 font-medium">
                              {t.booking_count} transaksi
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            {t.seats_booked} kursi terisi
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </main>

      {/* Schedule Create/Edit Modal */}
      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setEditingSchedule(null);
        }}
        spots={spots}
        armadas={armadas}
        editingSchedule={editingSchedule}
        onSave={handleSaveSchedule}
      />

      {/* Armada Create/Edit Modal */}
      <ArmadaModal
        isOpen={armadaModalOpen}
        onClose={() => {
          setArmadaModalOpen(false);
          setEditingArmada(null);
        }}
        editingArmada={editingArmada}
        onSave={handleSaveArmada}
      />
    </div>
  );
}
