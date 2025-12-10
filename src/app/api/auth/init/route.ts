import { NextResponse } from 'next/server';
import { initializeAdminUser } from '@/lib/auth';
import { execute } from '@/lib/db';

export async function POST() {
  try {
    // Create users table if not exists
    await execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        youtube_api_key VARCHAR(255) NULL,
        gemini_api_key VARCHAR(255) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create api_usage table if not exists
    await execute(`
      CREATE TABLE IF NOT EXISTS api_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        api_type ENUM('youtube', 'gemini', 'openai', 'imagen') NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        request_count INT DEFAULT 1,
        tokens_used INT DEFAULT 0,
        cost_estimate DECIMAL(10, 6) DEFAULT 0,
        usage_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_date (user_id, usage_date),
        INDEX idx_api_type (api_type),
        INDEX idx_usage_date (usage_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Initialize admin user
    await initializeAdminUser();

    return NextResponse.json({
      success: true,
      message: '데이터베이스 초기화가 완료되었습니다.',
    });
  } catch (error: any) {
    console.error('Init error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
