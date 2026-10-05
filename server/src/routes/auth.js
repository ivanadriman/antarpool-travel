import { Router } from 'express';
import { OPERATOR_USER, OPERATOR_PASS } from '../config/env.js';
import { signJwt } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }
  if (username.trim() === OPERATOR_USER && password === OPERATOR_PASS) {
    const token = signJwt({ username: username.trim(), role: 'operator' });
    return res.json({
      success: true,
      message: 'Login operator berhasil',
      token,
      user: {
        username: username.trim(),
        role: 'operator',
        name: 'Operator Dispatcher'
      }
    });
  }
  return res.status(401).json({ error: 'Username atau password salah.' });
});

export default router;
