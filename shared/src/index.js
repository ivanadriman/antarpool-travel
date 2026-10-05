// Utility to format numbers into Indonesian Rupiah (IDR)
export function formatIDR(amount) {
  if (amount === undefined || amount === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Format Date to Indonesian localized string
export function formatDateID(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Standardize Indonesian phone number to E.164 (62xxxxxxxxxxx)
export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+62')) {
    cleaned = '62' + cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

// Format phone for local display (08xxxxxxxx)
export function formatLocalPhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('62')) {
    return '0' + cleaned.slice(2);
  }
  return cleaned;
}

// Validation helpers
export function isValidIndonesianPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/[^0-9]/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function isValidNIK(nik) {
  if (!nik) return false;
  const digits = String(nik).replace(/[^0-9]/g, '');
  return digits.length === 16;
}

export function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

// Common constants
export const COMMON_CITIES = ['Surabaya', 'Malang', 'Sidoarjo', 'Pasuruan', 'Gresik', 'Batu'];

export const VEHICLE_PRESETS = [
  { id: 'hiace_10', label: 'Toyota HiAce Premio (10 Seat)', capacity: 10 },
  { id: 'innova_6', label: 'Toyota Innova Reborn (6 Seat)', capacity: 6 }
];
