import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, apiUsageOperations } from '@/lib/auth';

// GET - Get API usage stats
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    const stats = await apiUsageOperations.getUsageStats(days);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Get API usage error:', error);
    return NextResponse.json(
      { success: false, error: 'API 사용량 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
