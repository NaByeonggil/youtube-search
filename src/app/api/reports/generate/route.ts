import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { db, query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

/**
 * POST /api/reports/generate - 마크다운 리포트 생성
 * PRD 8단계: 분석 결과 리포트 다운로드
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, videoDbId, reportType = 'full' } = body;

    if (!projectId || !videoDbId) {
      return NextResponse.json(
        { success: false, error: 'projectId and videoDbId are required' },
        { status: 400 }
      );
    }

    // 프로젝트 정보
    const project = await db.projects.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // 영상 정보
    const video = await db.selectedVideos.findById(videoDbId);
    if (!video) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    // 댓글 분석
    const commentAnalysis = await db.commentAnalysis.findByVideoId(videoDbId);

    // 콘텐츠 요약
    const contentSummary = await db.contentSummaries.findByVideoId(videoDbId);

    // 대본
    const scripts = await db.generatedScripts.findByVideoId(videoDbId);
    const latestScript = scripts[0];

    // 에셋
    let assets: RowDataPacket[] = [];
    if (latestScript) {
      assets = await db.generatedAssets.findByScriptId((latestScript as any).id);
    }

    // 마크다운 생성
    const markdown = generateMarkdownReport({
      project: project as any,
      video: video as any,
      commentAnalysis: commentAnalysis as any,
      contentSummary: contentSummary as any,
      script: latestScript as any,
      assets: assets as any[],
      reportType,
    });

    // 파일 저장
    const reportDir = path.join(STORAGE_PATH, 'reports', String(projectId));
    await fs.mkdir(reportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `report_${reportType}_${timestamp}.md`;
    const filePath = path.join(reportDir, fileName);

    await fs.writeFile(filePath, markdown, 'utf-8');
    const stats = await fs.stat(filePath);

    // DB에 저장
    const reportId = await db.fullReports.create({
      projectId,
      videoId: videoDbId,
      reportType: reportType as any,
      fileName,
      filePath,
      fileSizeBytes: stats.size,
      markdownContent: markdown,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: reportId,
        fileName,
        filePath,
        fileSize: stats.size,
        markdown,
      },
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 마크다운 리포트 생성
 */
function generateMarkdownReport(data: {
  project: any;
  video: any;
  commentAnalysis: any;
  contentSummary: any;
  script: any;
  assets: any[];
  reportType: string;
}): string {
  const { project, video, commentAnalysis, contentSummary, script, assets, reportType } = data;

  let markdown = `# YouTube 콘텐츠 분석 리포트

**프로젝트**: ${project?.project_name || 'Unknown'}
**키워드**: ${project?.keyword || 'N/A'}
**생성일**: ${new Date().toLocaleString('ko-KR')}
**포맷**: ${project?.content_format || 'long'}

---

## 1. 분석 대상 영상

| 항목 | 내용 |
|------|------|
| 제목 | ${video?.title || 'N/A'} |
| 채널 | ${video?.channel_name || 'N/A'} |
| 조회수 | ${video?.view_count?.toLocaleString() || 0} |
| 좋아요 | ${video?.like_count?.toLocaleString() || 0} |
| 댓글수 | ${video?.comment_count?.toLocaleString() || 0} |
| 구독자수 | ${video?.subscriber_count?.toLocaleString() || 0} |
| **터짐 지수** | **${video?.viral_score || 0}** (${video?.viral_grade || 'N/A'}) |

`;

  if (reportType === 'full' || reportType === 'comments') {
    markdown += `
---

## 2. 댓글 감성 분석

### 분석 결과

| 항목 | 수치 |
|------|------|
| 분석된 댓글 수 | ${commentAnalysis?.total_comments_analyzed || 0} |
| 긍정 댓글 | ${commentAnalysis?.positive_count || 0} |
| 부정 댓글 | ${commentAnalysis?.negative_count || 0} |
| 긍정 비율 | ${commentAnalysis?.positive_ratio?.toFixed(1) || 0}% |

### 긍정적 반응 요약
${commentAnalysis?.positive_summary || '분석 결과 없음'}

**주요 키워드**: ${tryParseJSON(commentAnalysis?.positive_keywords)?.join(', ') || 'N/A'}

### 부정적 반응 요약
${commentAnalysis?.negative_summary || '분석 결과 없음'}

**주요 키워드**: ${tryParseJSON(commentAnalysis?.negative_keywords)?.join(', ') || 'N/A'}

### 개선 제안
${commentAnalysis?.improvement_suggestions || '제안 사항 없음'}

`;
  }

  if (reportType === 'full' || reportType === 'script') {
    markdown += `
---

## 3. 콘텐츠 요약

### 핵심 메시지
${contentSummary?.one_line_summary || '요약 없음'}

### 주요 논점
${tryParseJSON(contentSummary?.key_points)?.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n') || '없음'}

${contentSummary?.detailed_summary ? `
### 상세 요약
${contentSummary.detailed_summary}
` : ''}

${contentSummary?.context_background ? `
### 배경 및 맥락
${contentSummary.context_background}
` : ''}

---

## 4. 생성된 대본

### 대본 정보
- **예상 길이**: ${script?.expected_duration_seconds || 0}초
- **글자 수**: ${script?.word_count || 0}자
- **타겟 청중**: ${script?.target_audience || '일반 시청자'}

### 훅 (Hook)
${script?.hook_text || '없음'}

${script?.intro_text ? `
### 도입부
${script.intro_text}
` : ''}

### 본론
${script?.body_text || '없음'}

### 결론
${script?.conclusion_text || '없음'}

### 전체 대본
\`\`\`
${script?.full_script || '대본 없음'}
\`\`\`

`;
  }

  if (reportType === 'full' || reportType === 'assets') {
    const images = assets?.filter(a => a.asset_type === 'image') || [];
    const voice = assets?.find(a => a.asset_type === 'voice');
    const subtitle = assets?.find(a => a.asset_type === 'subtitle');
    const videoAsset = assets?.find(a => a.asset_type === 'video');

    markdown += `
---

## 5. 생성된 에셋

### 이미지 (${images.length}개)
${images.length > 0 ? images.map((img, i) =>
      `${i + 1}. ${img.file_name} (${(img.file_size_bytes / 1024).toFixed(1)}KB)
   - 프롬프트: ${img.image_prompt || 'N/A'}`
    ).join('\n\n') : '생성된 이미지 없음'}

### 음성
${voice ? `- 파일: ${voice.file_name}
- 길이: ${voice.voice_duration_seconds}초
- TTS: ${voice.tts_provider} (${voice.tts_voice_id})` : '생성된 음성 없음'}

### 자막
${subtitle ? `- 파일: ${subtitle.file_name}
- 형식: ${subtitle.subtitle_format}
- 라인 수: ${subtitle.subtitle_line_count}` : '생성된 자막 없음'}

### 영상
${videoAsset ? `- 파일: ${videoAsset.file_name}
- 해상도: ${videoAsset.video_resolution}
- 길이: ${videoAsset.video_duration_seconds}초
- 코덱: ${videoAsset.video_codec}
- 용량: ${(videoAsset.file_size_bytes / (1024 * 1024)).toFixed(2)}MB` : '생성된 영상 없음'}

`;
  }

  markdown += `
---

*이 리포트는 YouTube 콘텐츠 자동화 시스템에 의해 생성되었습니다.*
`;

  return markdown;
}

function tryParseJSON(str: string | any[] | null): any[] {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}
