import { Router } from 'express';
import { getEnrichedCustomers, getCustomerBookings, updateCustomerRecord, upsertCustomer, dbGet } from '../db.js';
import { requireOperator } from '../middleware/auth.js';

export const clientCustomersRouter = Router();
export const businessCustomersRouter = Router();

// ==========================================
// CLIENT PASSENGER CUSTOMERS ROUTE (/api/customers)
// ==========================================

// POST /api/customers/profile
clientCustomersRouter.post('/profile', async (req, res) => {
  try {
    const { phone, name, email, auth_method, method, city, id_card } = req.body;
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: 'Nomor WhatsApp / HP wajib diisi' });
    }

    const cleanedPhone = phone.trim();
    const cleanedNik = id_card ? String(id_card).replace(/\D/g, '') : '';
    if (cleanedNik && cleanedNik.length !== 16) {
      return res.status(400).json({ error: 'Nomor KTP / NIK harus terdiri dari 16 digit angka' });
    }

    const custId = await upsertCustomer({
      phone: cleanedPhone,
      name: (name && String(name).trim()) || 'Pelanggan',
      email: (email && String(email).trim()) || '',
      auth_method: auth_method || method || 'phone',
      city: (city && String(city).trim()) || '',
      id_card: cleanedNik
    });

    const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [custId]);
    res.json({ message: 'Profil penumpang berhasil disimpan', customer });
  } catch (err) {
    console.error('Error syncing customer profile:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil penumpang' });
  }
});

// ==========================================
// BUSINESS CRM CUSTOMERS ROUTES (/api/business/customers)
// ==========================================

businessCustomersRouter.use(requireOperator);

// GET /api/business/customers
businessCustomersRouter.get('/', async (req, res) => {
  try {
    const customers = await getEnrichedCustomers();
    res.json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Gagal mengambil data pelanggan' });
  }
});

// GET /api/business/customers/:phone/bookings
businessCustomersRouter.get('/:phone/bookings', async (req, res) => {
  try {
    const { phone } = req.params;
    const bookings = await getCustomerBookings(phone);
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching customer bookings:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat pesanan pelanggan' });
  }
});

// PUT /api/business/customers/:id
businessCustomersRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, city, id_card, is_vip, is_blacklisted, notes } = req.body;
    const updated = await updateCustomerRecord(id, { name, email, city, id_card, is_vip, is_blacklisted, notes });
    if (!updated) {
      return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
    }
    res.json({ message: 'Data pelanggan berhasil diperbarui', customer: updated });
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Gagal memperbarui data pelanggan' });
  }
});
