import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { query, queryOne, execute } from './db';
import { RowDataPacket } from 'mysql2';

// JWT secret key
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// Cookie settings
const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  youtube_api_key: string | null;
  gemini_api_key: string | null;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface UserRow extends RowDataPacket, User {
  password_hash: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create JWT token
export async function createToken(userId: number, email: string, role: string): Promise<string> {
  return new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<{ userId: number; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

// Set auth cookie
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

// Remove auth cookie
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get auth cookie
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

// Get current user from cookie
export async function getCurrentUser(): Promise<User | null> {
  const token = await getAuthCookie();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await queryOne<UserRow>(
    'SELECT id, email, name, role, youtube_api_key, gemini_api_key, is_active, last_login_at, created_at, updated_at FROM users WHERE id = ? AND is_active = TRUE',
    [payload.userId]
  );

  return user;
}

// Login user
export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  const user = await queryOne<UserRow>(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (!user) {
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }

  if (!user.is_active) {
    return { success: false, error: '비활성화된 계정입니다.' };
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }

  // Update last login
  await execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  // Create and set token
  const token = await createToken(user.id, user.email, user.role);
  await setAuthCookie(token);

  // Return user without password
  const { password_hash: _, ...userWithoutPassword } = user;
  return { success: true, user: userWithoutPassword as User };
}

// Logout user
export async function logoutUser(): Promise<void> {
  await removeAuthCookie();
}

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

// Initialize admin user if not exists
export async function initializeAdminUser(): Promise<void> {
  const adminEmail = 'admin@youtubeai.com';
  const adminPassword = 'admin123!';

  const existingAdmin = await queryOne<UserRow>(
    'SELECT id FROM users WHERE email = ?',
    [adminEmail]
  );

  if (!existingAdmin) {
    const passwordHash = await hashPassword(adminPassword);
    await execute(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [adminEmail, passwordHash, 'Administrator', 'admin']
    );
    console.log('Admin user created successfully');
  }
}

// User CRUD operations
export const userOperations = {
  async findAll(limit = 50, offset = 0): Promise<User[]> {
    const users = await query<UserRow[]>(
      'SELECT id, email, name, role, youtube_api_key, gemini_api_key, is_active, last_login_at, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return users;
  },

  async findById(id: number): Promise<User | null> {
    return queryOne<UserRow>(
      'SELECT id, email, name, role, youtube_api_key, gemini_api_key, is_active, last_login_at, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
  },

  async create(data: { email: string; password: string; name: string; role?: 'admin' | 'user' }): Promise<number> {
    const passwordHash = await hashPassword(data.password);
    const result = await execute(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [data.email, passwordHash, data.name, data.role || 'user']
    );
    return result.insertId;
  },

  async update(id: number, data: Partial<{ email: string; name: string; role: string; is_active: boolean; youtube_api_key: string; gemini_api_key: string }>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.role !== undefined) {
      fields.push('role = ?');
      values.push(data.role);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }
    if (data.youtube_api_key !== undefined) {
      fields.push('youtube_api_key = ?');
      values.push(data.youtube_api_key || null);
    }
    if (data.gemini_api_key !== undefined) {
      fields.push('gemini_api_key = ?');
      values.push(data.gemini_api_key || null);
    }

    if (fields.length > 0) {
      values.push(id);
      await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  },

  async updatePassword(id: number, password: string): Promise<void> {
    const passwordHash = await hashPassword(password);
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  },

  async delete(id: number): Promise<void> {
    await execute('DELETE FROM users WHERE id = ?', [id]);
  },

  async count(): Promise<number> {
    const result = await queryOne<RowDataPacket & { count: number }>(
      'SELECT COUNT(*) as count FROM users'
    );
    return result?.count || 0;
  },
};

// API Usage operations
export const apiUsageOperations = {
  async trackUsage(data: {
    userId?: number;
    apiType: 'youtube' | 'gemini' | 'openai' | 'imagen';
    endpoint: string;
    tokensUsed?: number;
    costEstimate?: number;
  }): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Try to update existing record for today
    const result = await execute(
      `UPDATE api_usage SET request_count = request_count + 1, tokens_used = tokens_used + ?, cost_estimate = cost_estimate + ?
       WHERE user_id <=> ? AND api_type = ? AND endpoint = ? AND usage_date = ?`,
      [data.tokensUsed || 0, data.costEstimate || 0, data.userId || null, data.apiType, data.endpoint, today]
    );

    // If no row was updated, insert new record
    if (result.affectedRows === 0) {
      await execute(
        `INSERT INTO api_usage (user_id, api_type, endpoint, tokens_used, cost_estimate, usage_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.userId || null, data.apiType, data.endpoint, data.tokensUsed || 0, data.costEstimate || 0, today]
      );
    }
  },

  async getUsageStats(days = 30): Promise<{
    byApiType: { api_type: string; total_requests: number; total_tokens: number; total_cost: number }[];
    byDate: { usage_date: string; total_requests: number; total_tokens: number }[];
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const byApiType = await query<RowDataPacket[]>(
      `SELECT api_type, SUM(request_count) as total_requests, SUM(tokens_used) as total_tokens, SUM(cost_estimate) as total_cost
       FROM api_usage WHERE usage_date >= ? GROUP BY api_type ORDER BY total_requests DESC`,
      [startDateStr]
    );

    const byDate = await query<RowDataPacket[]>(
      `SELECT usage_date, SUM(request_count) as total_requests, SUM(tokens_used) as total_tokens
       FROM api_usage WHERE usage_date >= ? GROUP BY usage_date ORDER BY usage_date DESC`,
      [startDateStr]
    );

    const totals = await queryOne<RowDataPacket>(
      `SELECT SUM(request_count) as total_requests, SUM(tokens_used) as total_tokens, SUM(cost_estimate) as total_cost
       FROM api_usage WHERE usage_date >= ?`,
      [startDateStr]
    );

    return {
      byApiType: byApiType as any[],
      byDate: byDate as any[],
      totalRequests: totals?.total_requests || 0,
      totalTokens: totals?.total_tokens || 0,
      totalCost: totals?.total_cost || 0,
    };
  },

  async getUserUsage(userId: number, days = 30): Promise<{
    byApiType: { api_type: string; total_requests: number; total_tokens: number }[];
    byDate: { usage_date: string; total_requests: number }[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const byApiType = await query<RowDataPacket[]>(
      `SELECT api_type, SUM(request_count) as total_requests, SUM(tokens_used) as total_tokens
       FROM api_usage WHERE user_id = ? AND usage_date >= ? GROUP BY api_type`,
      [userId, startDateStr]
    );

    const byDate = await query<RowDataPacket[]>(
      `SELECT usage_date, SUM(request_count) as total_requests
       FROM api_usage WHERE user_id = ? AND usage_date >= ? GROUP BY usage_date ORDER BY usage_date DESC`,
      [userId, startDateStr]
    );

    return {
      byApiType: byApiType as any[],
      byDate: byDate as any[],
    };
  },
};
