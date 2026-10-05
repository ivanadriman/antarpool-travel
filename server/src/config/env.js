import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = process.env.PORT || 5000;
export const DATABASE_PATH = process.env.DATABASE_PATH || path.resolve(__dirname, '../../travel.db');
export const JWT_SECRET = process.env.JWT_SECRET || 'antarpool-secret-key-2026-production';
export const OPERATOR_USER = process.env.OPERATOR_USER || 'admin';
export const OPERATOR_PASS = process.env.OPERATOR_PASS || 'antarpool2026';
