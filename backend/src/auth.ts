import { db } from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET || 'pharmacy-demo-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  } as any);
}

export function verifyToken(token: string): any {
  return jwt.verify(token, process.env.JWT_SECRET || 'pharmacy-demo-secret');
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: number;
  created_at: string;
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function createUser(data: {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
}): void {
  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).run(data.id, data.name, data.email, data.password_hash, data.role);
}

export function getAllUsers(): UserRow[] {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as UserRow[];
}

export function updateUserRole(id: string, role: string): void {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
}

export function setUserActive(id: string, active: boolean): void {
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id);
}

export function changePassword(id: string, newHash: string): void {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, id);
}