import React, { useState, useEffect, useRef } from 'react';
import ScheduleModal from './components/ScheduleModal';
import ArmadaModal from './components/ArmadaModal';
import OrderTimeline from './components/OrderTimeline';
import CustomerModal from './components/CustomerModal';
import ConnectionModal from './components/ConnectionModal';
import LoginGate from './components/LoginGate';
import Navbar from './components/Navbar';
import ToastContainer from './components/ToastContainer';
import OrdersTab from './components/tabs/OrdersTab';
import SchedulesTab from './components/tabs/SchedulesTab';
import ArmadasTab from './components/tabs/ArmadasTab';
import CustomersTab from './components/tabs/CustomersTab';
import AnalyticsTab from './components/tabs/AnalyticsTab';
import { speakIndonesian } from './voiceNotifier';
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  getBusinessBookings, getArmadas, getSpots, getBusinessSchedules,
  updateBookingStatus, saveSchedule, deleteSchedule, saveArmada,
  deleteArmada, getTimeline, getAnalytics, getCustomers,
  currentBackend
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
    localStorage.removeItem('antarpool_operator_token');
    sessionStorage.removeItem('antarpool_operator_auth');
    sessionStorage.removeItem('antarpool_operator_token');
    setOperatorUser(null);
  };

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'timeline' | 'schedules' | 'armadas' | 'customers' | 'analytics'
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // Orders state
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [orderFilterDate, setOrderFilterDate] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState('');
  const [orderFilterBookingStatus, setOrderFilterBookingStatus] = useState('');
  const [newOrderIds, setNewOrderIds] = useState(new Set());

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

  // Customers (CRM) state
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSource, setCustomerSource] = useState('fallback');
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Audio permission & notification alerts
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [latestVoiceToast, setLatestVoiceToast] = useState(null);
  const [appAlert, setAppAlert] = useState(null);

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

  // Real-time voice & order notifications (Supports both Supabase Realtime & WebSocket fallback)
  useEffect(() => {
    if (!operatorUser) return;

    let isMounted = true;

    // Check if Supabase Realtime is configured
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('business_orders_realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'bookings' },
          async (payload) => {
            if (!isMounted) return;
            const newOrder = payload.new;

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

  // Fetch data handlers
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

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const data = await getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
      if (data && data._source) {
        setCustomerSource(data._source);
      } else if (currentBackend === 'supabase') {
        setCustomerSource(data?._isFallback ? 'fallback' : 'supabase');
      } else {
        setCustomerSource('rest');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    if (!operatorUser) return;
    fetchBookings();
    fetchSchedulesAndSpots();
    fetchArmadas();
    fetchAnalytics();
    fetchTimeline();
    fetchCustomers();
  }, [operatorUser, orderFilterDate, orderFilterStatus, orderFilterBookingStatus, scheduleFilterDate]);

  // Update booking status (e.g. Mark as PAID on arrival, or CANCELLED)
  const handleUpdateStatus = async (bookingId, paymentStatus, bookingStatus) => {
    try {
      await updateBookingStatus(bookingId, paymentStatus, bookingStatus);
      fetchBookings();
      fetchSchedulesAndSpots();
      fetchAnalytics();
      fetchTimeline();
      fetchCustomers();
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

  // Save schedule (Add or Edit)
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

  // Save Armada (Create or Edit)
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

  // Delete Armada
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

  // Delete Schedule
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
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans overflow-x-hidden w-full max-w-full">
      {/* Top Header & Tab Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wsConnected={wsConnected}
        customerSource={customerSource}
        currentBackend={currentBackend}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => {
          setVoiceEnabled(!voiceEnabled);
          if (!audioUnlocked) setAudioUnlocked(true);
        }}
        onTestVoice={handleTestVoice}
        onLogout={handleLogout}
        onOpenConnectionModal={() => setShowConnectionModal(true)}
        bookingsCount={bookings.length}
        newOrdersCount={newOrderIds.size}
        armadasCount={armadas.length}
        customersCount={customers.length}
        timelineCount={timelineEvents.length}
      />

      {/* Floating Notification / Toast Container */}
      <ToastContainer
        appAlert={appAlert}
        onCloseAlert={() => setAppAlert(null)}
        latestVoiceToast={latestVoiceToast}
        onCloseVoiceToast={() => setLatestVoiceToast(null)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'orders' && (
          <OrdersTab
            bookings={bookings}
            loadingBookings={loadingBookings}
            orderFilterDate={orderFilterDate}
            setOrderFilterDate={setOrderFilterDate}
            orderFilterStatus={orderFilterStatus}
            setOrderFilterStatus={setOrderFilterStatus}
            orderFilterBookingStatus={orderFilterBookingStatus}
            setOrderFilterBookingStatus={setOrderFilterBookingStatus}
            newOrderIds={newOrderIds}
            handleOrderHover={handleOrderHover}
            fetchBookings={fetchBookings}
            handleUpdateStatus={handleUpdateStatus}
          />
        )}

        {activeTab === 'schedules' && (
          <SchedulesTab
            schedules={schedules}
            loadingSchedules={loadingSchedules}
            scheduleFilterDate={scheduleFilterDate}
            setScheduleFilterDate={setScheduleFilterDate}
            onOpenAddSchedule={() => {
              setEditingSchedule(null);
              setScheduleModalOpen(true);
            }}
            onOpenEditSchedule={(s) => {
              setEditingSchedule(s);
              setScheduleModalOpen(true);
            }}
            handleDeleteSchedule={handleDeleteSchedule}
          />
        )}

        {activeTab === 'armadas' && (
          <ArmadasTab
            armadas={armadas}
            loadingArmadas={loadingArmadas}
            onOpenAddArmada={() => {
              setEditingArmada(null);
              setArmadaModalOpen(true);
            }}
            onOpenEditArmada={(armada) => {
              setEditingArmada(armada);
              setArmadaModalOpen(true);
            }}
            handleDeleteArmada={handleDeleteArmada}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersTab
            customers={customers}
            loadingCustomers={loadingCustomers}
            fetchCustomers={fetchCustomers}
            customerSource={customerSource}
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            customerFilter={customerFilter}
            setCustomerFilter={setCustomerFilter}
            onOpenCustomerModal={(c) => {
              setSelectedCustomer(c);
              setCustomerModalOpen(true);
            }}
            onOpenConnectionModal={() => setShowConnectionModal(true)}
          />
        )}

        {activeTab === 'timeline' && (
          <OrderTimeline
            events={timelineEvents}
            loading={loadingTimeline}
            onRefresh={fetchTimeline}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            analytics={analytics}
            loadingAnalytics={loadingAnalytics}
          />
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

      {/* Customer Detail & CRM Modal */}
      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => {
          setCustomerModalOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onCustomerUpdated={(updated, saveRes) => {
          setCustomers((prev) => prev.map((c) => (c.phone === updated.phone || c.id === updated.id ? { ...c, ...updated } : c)));
          setSelectedCustomer(updated);
          if (saveRes?.source) {
            setCustomerSource(saveRes.source);
          }
          showAlert(
            saveRes?.notice || `Perubahan data pelanggan ${updated.name} berhasil disimpan.`,
            saveRes?.isFallback ? 'info' : 'success',
            saveRes?.isFallback ? 'Disimpan (Mode Fallback)' : 'Tersimpan ke Supabase'
          );
        }}
      />

      {/* Connection Status & Database SQL Guide Modal */}
      <ConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        backendType={currentBackend}
        wsConnected={wsConnected}
        customerSource={customerSource}
        onRefresh={fetchCustomers}
      />
    </div>
  );
}
