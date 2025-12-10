import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'storage', 'image-history.json');

interface GenerationHistory {
  id: string;
  createdAt: string;
  aspectRatio: string;
  style: string;
  totalScenes: number;
  successCount: number;
  failedCount: number;
  images: {
    scene_id: number;
    imagePath?: string;
    imageBase64?: string;
  }[];
}

async function ensureHistoryFile() {
  try {
    await fs.access(HISTORY_FILE);
  } catch {
    const dir = path.dirname(HISTORY_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(HISTORY_FILE, '[]', 'utf-8');
  }
}

async function getHistory(): Promise<GenerationHistory[]> {
  await ensureHistoryFile();
  const content = await fs.readFile(HISTORY_FILE, 'utf-8');
  return JSON.parse(content);
}

async function saveHistory(history: GenerationHistory[]) {
  await ensureHistoryFile();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

/**
 * GET /api/images/history - 생성 기록 조회
 */
export async function GET() {
  try {
    const history = await getHistory();
    return NextResponse.json({
      success: true,
      data: history.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error: any) {
    console.error('Failed to get history:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/images/history - 새 기록 저장
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { aspectRatio, style, scenes, results } = body;

    const history = await getHistory();

    const newEntry: GenerationHistory = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      aspectRatio,
      style,
      totalScenes: scenes?.length || 0,
      successCount: results?.filter((r: any) => r.status === 'success').length || 0,
      failedCount: results?.filter((r: any) => r.status === 'failed').length || 0,
      images: results?.filter((r: any) => r.status === 'success').map((r: any) => ({
        scene_id: r.scene_id,
        imageBase64: r.imageBase64?.slice(0, 1000), // 저장 공간 절약을 위해 truncate
      })) || [],
    };

    history.push(newEntry);

    // 최대 50개까지만 보관
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    await saveHistory(history);

    return NextResponse.json({
      success: true,
      data: newEntry,
    });
  } catch (error: any) {
    console.error('Failed to save history:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images/history - 전체 기록 삭제
 */
export async function DELETE() {
  try {
    await saveHistory([]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to clear history:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
