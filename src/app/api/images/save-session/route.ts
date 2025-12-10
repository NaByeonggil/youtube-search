import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface Scene {
  scene_id: number;
  description: string;
  characters: string[];
  setting: string;
  mood: string;
  camera_angle: string;
}

interface Character {
  role: string;
  age: number;
  gender: string;
  face_shape: string;
  skin_tone: string;
  hair: string;
  eyes: string;
  outfit: {
    top: string;
    bottom: string;
    shoes: string;
    accessories: string;
  };
  distinctive_features: string;
}

interface GenerationResult {
  scene_id: number;
  status: 'pending' | 'generating' | 'success' | 'failed';
  imagePath?: string;
  imageBase64?: string;
  error?: string;
}

/**
 * POST /api/images/save-session - 이미지 생성 세션을 DB에 저장
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      script,
      scenes,
      characters,
      results,
      aspectRatio,
      style,
    } = body;

    if (!script || !results || results.length === 0) {
      return NextResponse.json(
        { success: false, error: '저장할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 성공한 이미지만 필터링
    const successfulResults = results.filter(
      (r: GenerationResult) => r.status === 'success' && r.imageBase64
    );

    if (successfulResults.length === 0) {
      return NextResponse.json(
        { success: false, error: '저장할 성공한 이미지가 없습니다.' },
        { status: 400 }
      );
    }

    // 1. 프로젝트 생성 (키워드로 식별)
    const projectName = `이미지 생성 - ${new Date().toLocaleDateString('ko-KR')}`;
    const keyword = `image_gen_${Date.now()}`;

    const projectId = await db.projects.create({
      projectName,
      keyword,
      contentFormat: 'long',
    });

    // 2. 스크립트 저장
    const scriptId = await db.generatedScripts.create({
      videoId: 0, // standalone script (no video reference)
      scriptPurpose: '이미지 생성용 대본',
      targetAudience: '일반',
      fullScript: script.slice(0, 65000), // TEXT 타입 제한
      contentFormat: 'long',
      wordCount: script.length,
    });

    // 3. 이미지 에셋 저장
    const savedAssets: number[] = [];

    for (const result of successfulResults) {
      const scene = scenes?.find((s: Scene) => s.scene_id === result.scene_id);

      // Base64 이미지를 파일로 저장 (필요시 구현)
      // 현재는 메타데이터만 저장
      const assetId = await db.generatedAssets.create({
        scriptId,
        assetType: 'image',
        fileName: `scene_${result.scene_id.toString().padStart(3, '0')}.png`,
        filePath: result.imagePath || '',
        imagePrompt: scene?.description || '',
        imageResolution: getResolution(aspectRatio),
        imageSequence: result.scene_id,
        generationStatus: 'completed',
      });

      savedAssets.push(assetId);
    }

    // 4. 전체 보고서 생성 (선택적)
    const reportContent = generateMarkdownReport({
      script,
      scenes,
      characters,
      results: successfulResults,
      aspectRatio,
      style,
      projectId,
      scriptId,
    });

    await db.fullReports.create({
      projectId,
      videoId: 0,
      reportType: 'assets',
      fileName: `image_generation_report_${Date.now()}.md`,
      filePath: '',
      markdownContent: reportContent,
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        scriptId,
        savedCount: savedAssets.length,
        assetIds: savedAssets,
        message: `${savedAssets.length}개의 이미지가 DB에 저장되었습니다.`,
      },
    });
  } catch (error: any) {
    console.error('Failed to save session to DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'DB 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 화면비에 따른 해상도 반환
 */
function getResolution(aspectRatio: string): string {
  switch (aspectRatio) {
    case '16:9':
      return '1920x1080';
    case '1:1':
      return '1024x1024';
    case '9:16':
      return '1080x1920';
    default:
      return '1920x1080';
  }
}

/**
 * 마크다운 보고서 생성
 */
function generateMarkdownReport(data: {
  script: string;
  scenes: Scene[];
  characters: Record<string, Character>;
  results: GenerationResult[];
  aspectRatio: string;
  style: { name: string; en: string };
  projectId: number;
  scriptId: number;
}): string {
  const {
    script,
    scenes,
    characters,
    results,
    aspectRatio,
    style,
    projectId,
    scriptId,
  } = data;

  const now = new Date().toLocaleString('ko-KR');

  let report = `# 이미지 생성 보고서

## 기본 정보
- **생성 일시**: ${now}
- **프로젝트 ID**: ${projectId}
- **스크립트 ID**: ${scriptId}
- **화면 비율**: ${aspectRatio}
- **화풍**: ${style?.name || '실사'} (${style?.en || 'photorealistic'})
- **총 장면 수**: ${scenes?.length || 0}
- **생성 성공**: ${results.length}장

## 캐릭터 정보
`;

  if (characters && Object.keys(characters).length > 0) {
    for (const [name, char] of Object.entries(characters)) {
      report += `
### ${name}
- **역할**: ${char.role}
- **나이/성별**: ${char.age}세 ${char.gender}
- **외모**: ${char.face_shape} 얼굴형, ${char.skin_tone} 피부
- **머리**: ${char.hair}
- **눈**: ${char.eyes}
- **의상**: ${char.outfit?.top}, ${char.outfit?.bottom}
- **특징**: ${char.distinctive_features || '없음'}
`;
    }
  } else {
    report += '\n캐릭터 정보가 없습니다.\n';
  }

  report += `
## 장면 목록
`;

  if (scenes && scenes.length > 0) {
    for (const scene of scenes) {
      const result = results.find((r) => r.scene_id === scene.scene_id);
      const status = result ? '✅ 생성 완료' : '❌ 미생성';

      report += `
### Scene ${scene.scene_id} ${status}
- **설명**: ${scene.description}
- **장소**: ${scene.setting || '미지정'}
- **분위기**: ${scene.mood || '미지정'}
- **카메라**: ${scene.camera_angle || '미지정'}
- **등장인물**: ${scene.characters?.join(', ') || '없음'}
`;
    }
  }

  report += `
## 원본 대본

\`\`\`
${script.slice(0, 5000)}${script.length > 5000 ? '\n\n... (truncated)' : ''}
\`\`\`

---
*이 보고서는 대본 → 이미지 자동 생성 시스템에 의해 자동 생성되었습니다.*
`;

  return report;
}
