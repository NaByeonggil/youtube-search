import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, userOperations } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface UserApiKeys extends RowDataPacket {
  youtube_api_key: string | null;
  gemini_api_key: string | null;
}

// GET - Get current user's API keys
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    const user = await queryOne<UserApiKeys>(
      'SELECT youtube_api_key, gemini_api_key FROM users WHERE id = ?',
      [currentUser.id]
    );

    return NextResponse.json({
      success: true,
      apiKeys: {
        youtube_api_key: user?.youtube_api_key || '',
        gemini_api_key: user?.gemini_api_key || '',
        has_youtube: !!user?.youtube_api_key,
        has_gemini: !!user?.gemini_api_key,
      },
    });
  } catch (error: any) {
    console.error('Get API keys error:', error);
    return NextResponse.json(
      { success: false, error: 'API 키 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT - Update current user's API keys
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    const { youtube_api_key, gemini_api_key } = await request.json();

    await userOperations.update(currentUser.id, {
      youtube_api_key: youtube_api_key || '',
      gemini_api_key: gemini_api_key || '',
    });

    return NextResponse.json({
      success: true,
      message: 'API 키가 저장되었습니다.',
    });
  } catch (error: any) {
    console.error('Update API keys error:', error);
    return NextResponse.json(
      { success: false, error: 'API 키 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE - Clear current user's API keys
export async function DELETE() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    await userOperations.update(currentUser.id, {
      youtube_api_key: '',
      gemini_api_key: '',
    });

    return NextResponse.json({
      success: true,
      message: 'API 키가 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('Delete API keys error:', error);
    return NextResponse.json(
      { success: false, error: 'API 키 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
