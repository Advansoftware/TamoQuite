import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
  subscriptionStatus: string | null;
}

export async function verifyCredentials(email: string, password: string): Promise<AuthUser | null> {
  const user = await db.systemUser.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    subscriptionStatus: user.subscriptionStatus,
  };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await db.systemUser.findUnique({ where: { id } });
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    subscriptionStatus: user.subscriptionStatus,
  };
}

export async function changePassword(userId: string, newPassword: string): Promise<boolean> {
  const hash = await bcrypt.hash(newPassword, 12);
  try {
    await db.systemUser.update({
      where: { id: userId },
      data: {
        passwordHash: hash,
        mustChangePassword: false,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}