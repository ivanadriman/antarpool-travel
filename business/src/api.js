import * as supabaseAdapter from './adapters/supabaseAdapter';
import * as restAdapter from './adapters/restAdapter';
import { isSupabaseConfigured } from './supabase';

const configuredBackend = import.meta.env.VITE_BACKEND;
const activeBackend = configuredBackend
  ? configuredBackend.toLowerCase()
  : (isSupabaseConfigured ? 'supabase' : 'rest');

export const adapter = activeBackend === 'supabase' ? supabaseAdapter : restAdapter;
export const currentBackend = activeBackend;

export const getBusinessBookings = (...args) => adapter.getBusinessBookings(...args);
export const getArmadas = (...args) => adapter.getArmadas(...args);
export const getSpots = (...args) => adapter.getSpots(...args);
export const getBusinessSchedules = (...args) => adapter.getBusinessSchedules(...args);
export const updateBookingStatus = (...args) => adapter.updateBookingStatus(...args);
export const saveSchedule = (...args) => adapter.saveSchedule(...args);
export const deleteSchedule = (...args) => adapter.deleteSchedule(...args);
export const saveArmada = (...args) => adapter.saveArmada(...args);
export const deleteArmada = (...args) => adapter.deleteArmada(...args);
export const getTimeline = (...args) => adapter.getTimeline(...args);
export const getAnalytics = (...args) => adapter.getAnalytics(...args);
