import * as supabaseAdapter from './adapters/supabaseAdapter';
import * as restAdapter from './adapters/restAdapter';
import { isSupabaseConfigured } from './supabase';

const configuredBackend = import.meta.env.VITE_BACKEND;
const activeBackend = configuredBackend
  ? configuredBackend.toLowerCase()
  : (isSupabaseConfigured ? 'supabase' : 'rest');

export const adapter = activeBackend === 'supabase' ? supabaseAdapter : restAdapter;
export const currentBackend = activeBackend;

export const getSpots = (...args) => adapter.getSpots(...args);
export const getSchedules = (...args) => adapter.getSchedules(...args);
export const createBooking = (...args) => adapter.createBooking(...args);
export const lookupBookings = (...args) => adapter.lookupBookings(...args);
export const cancelBooking = (...args) => adapter.cancelBooking(...args);
export const syncCustomerProfile = (...args) => adapter.syncCustomerProfile(...args);
