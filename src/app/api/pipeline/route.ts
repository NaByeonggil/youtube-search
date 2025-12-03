import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { YouTubeService, calculateViralScore } from '@/services/youtube';
import { ClaudeService } from '@/services/claude';
import { GeminiService } from '@/services/gemini';
import { ImageGenerationService } from '@/services/imageGen';
import { TTSService, SubtitleService } from '@/services/tts';
import FFmpegService from '@/services/ffmpeg';
import { db } from '@/lib/db';
import { ContentFormat } from '@/types';

/**
 * POST /api/pipeline - 전체 파이프라인 실행
 * 영상 선택 → 분석 → 대본 생성 → 이미지 생성 → TTS → 영상 합성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      youtubeVideoId,
      format = 'long',
      targetAudience,
      transcript, // 자막/스크립트 (없으면 댓글만 분석)
      skipImageGeneration = false,
      skipVideoGeneration = false,
    } = body;

    if (!projectId || !youtubeVideoId) {
      return NextResponse.json(
        { success: false, error: 'projectId and youtubeVideoId are required' },
        { status: 400 }
      );
    }

    const videoId = uuidv4();
    const contentFormat = format as ContentFormat;

    console.log(`Starting pipeline for project ${projectId}, video ${youtubeVideoId}`);

    // Initialize services
    const youtubeService = new YouTubeService();
    const claudeService = new ClaudeService();
    const geminiService = new GeminiService();
    const imageService = new ImageGenerationService();
    const ttsService = new TTSService();
    const subtitleService = new SubtitleService();
    const ffmpegService = new FFmpegService();

    // Update project status
    await db.projects.updateStatus(projectId, 'processing');

    const results: Record<string, any> = {
      projectId,
      videoId,
      youtubeVideoId,
      format: contentFormat,
      stages: {},
    };

    // Stage 1: YouTube 영상 정보 및 터짐 지수
    console.log('Stage 1: Fetching YouTube video details...');
    const [videoDetails] = await youtubeService.getVideoDetails([youtubeVideoId]);
    const [channelDetails] = await youtubeService.getChannelDetails([videoDetails.channelId]);
    const viralResult = calculateViralScore(
      videoDetails.viewCount,
      channelDetails?.subscriberCount || 0,
      videoDetails.publishedAt,
      contentFormat
    );

    // DB에 영상 저장
    const dbSelectedVideoId = await db.selectedVideos.create({
      projectId,
      videoId: youtubeVideoId,
      title: videoDetails.title,
      channelId: videoDetails.channelId,
      channelName: videoDetails.channelTitle,
      subscriberCount: channelDetails?.subscriberCount || 0,
      viewCount: videoDetails.viewCount,
      likeCount: videoDetails.likeCount,
      commentCount: videoDetails.commentCount,
      durationSeconds: YouTubeService.parseDuration(videoDetails.duration),
      publishedAt: new Date(videoDetails.publishedAt),
      thumbnailUrl: videoDetails.thumbnailUrl,
      viralScore: viralResult.score,
      viralGrade: viralResult.grade,
    });

    results.stages.videoInfo = {
      status: 'completed',
      dbId: dbSelectedVideoId,
      viralScore: viralResult.score,
      viralGrade: viralResult.grade,
    };

    // Stage 2: 댓글 수집 및 분석 (Gemini API 사용)
    console.log('Stage 2: Analyzing comments with Gemini...');
    const comments = await youtubeService.getComments(youtubeVideoId, contentFormat);
    const commentAnalysis = await geminiService.analyzeComments(comments, contentFormat);

    const totalComments = comments.length;
    const positiveRatio = totalComments > 0
      ? (commentAnalysis.positiveCount / totalComments) * 100
      : 0;

    await db.commentAnalysis.create({
      videoId: dbSelectedVideoId,
      totalCommentsAnalyzed: totalComments,
      positiveCount: commentAnalysis.positiveCount,
      negativeCount: commentAnalysis.negativeCount,
      positiveRatio,
      positiveSummary: commentAnalysis.positiveSummary,
      positiveKeywords: commentAnalysis.positiveKeywords,
      negativeSummary: commentAnalysis.negativeSummary,
      negativeKeywords: commentAnalysis.negativeKeywords,
      improvementSuggestions: commentAnalysis.improvementSuggestions || '',
      rawCommentsJson: JSON.stringify(comments),
      analysisModel: 'gemini-2.5-flash-preview',
    });

    results.stages.commentAnalysis = {
      status: 'completed',
      totalComments,
      positiveCount: commentAnalysis.positiveCount,
      negativeCount: commentAnalysis.negativeCount,
      positiveRatio,
    };

    // Stage 3: 콘텐츠 요약
    let contentSummary = null;
    if (transcript) {
      console.log('Stage 3: Summarizing content...');
      contentSummary = await claudeService.summarizeContent(transcript, contentFormat);

      await db.contentSummaries.create({
        videoId: dbSelectedVideoId,
        originalTranscript: transcript,
        oneLineSummary: contentSummary.oneLineSummary,
        keyPoints: contentSummary.keyPoints,
        detailedSummary: contentSummary.detailedSummary,
        contextBackground: contentSummary.contextBackground,
        summaryLevel: contentFormat === 'short' ? '2-step' : '4-step',
      });

      results.stages.contentSummary = {
        status: 'completed',
        oneLineSummary: contentSummary.oneLineSummary,
      };
    } else {
      results.stages.contentSummary = { status: 'skipped', reason: 'No transcript provided' };
    }

    // Stage 4: 대본 생성
    console.log('Stage 4: Generating script...');
    const generatedScript = await claudeService.generateScript(
      contentSummary || { oneLineSummary: videoDetails.title, keyPoints: [] },
      commentAnalysis,
      contentFormat,
      targetAudience
    );

    const scriptWordCount = generatedScript.fullScript?.length || 0;
    const dbScriptId = await db.generatedScripts.create({
      videoId: dbSelectedVideoId,
      scriptPurpose: 'improvement',
      targetAudience: targetAudience || null,
      expectedDurationSeconds: generatedScript.estimatedDuration,
      scriptStructure: {
        hook: generatedScript.hook,
        intro: generatedScript.intro,
        body: generatedScript.body,
        conclusion: generatedScript.conclusion,
      },
      fullScript: generatedScript.fullScript,
      hookText: generatedScript.hook,
      introText: generatedScript.intro,
      bodyText: generatedScript.body,
      conclusionText: generatedScript.conclusion,
      contentFormat,
      wordCount: scriptWordCount,
    });

    results.stages.scriptGeneration = {
      status: 'completed',
      dbId: dbScriptId,
      wordCount: scriptWordCount,
      estimatedDuration: generatedScript.estimatedDuration,
    };

    // Stage 5: 이미지 프롬프트 생성 및 이미지 생성
    let imagePaths: string[] = [];
    if (!skipImageGeneration) {
      console.log('Stage 5: Generating images...');
      const imagePrompts = await claudeService.generateImagePrompts(
        generatedScript.fullScript,
        contentFormat
      );

      const imageResults = await imageService.generateImagesFromScript(
        generatedScript.fullScript,
        imagePrompts,
        projectId,
        videoId,
        contentFormat
      );

      imagePaths = imageResults
        .filter(r => !r.error)
        .map(r => r.filePath);

      // DB에 이미지 저장
      for (const img of imageResults) {
        await db.generatedAssets.create({
          scriptId: dbScriptId,
          assetType: 'image',
          fileName: img.fileName || '',
          filePath: img.filePath || '',
          fileSizeBytes: img.fileSize || 0,
          imagePrompt: img.prompt,
          imageResolution: contentFormat === 'short' ? '1024x1792' : '1792x1024',
          imageSequence: img.index,
          generationStatus: img.error ? 'failed' : 'completed',
        });
      }

      results.stages.imageGeneration = {
        status: 'completed',
        totalRequested: imagePrompts.length,
        successCount: imagePaths.length,
        failedCount: imageResults.filter(r => r.error).length,
      };
    } else {
      results.stages.imageGeneration = { status: 'skipped' };
    }

    // Stage 6: TTS 생성
    console.log('Stage 6: Generating TTS...');
    const ttsResult = await ttsService.generateAndSaveAudio(
      generatedScript.fullScript,
      projectId,
      videoId,
      contentFormat
    );

    await db.generatedAssets.create({
      scriptId: dbScriptId,
      assetType: 'voice',
      fileName: ttsResult.fileName,
      filePath: ttsResult.filePath,
      fileSizeBytes: ttsResult.fileSize,
      voiceDurationSeconds: ttsResult.duration,
      ttsProvider: 'elevenlabs',
      ttsVoiceId: process.env.ELEVENLABS_VOICE_ID,
      generationStatus: 'completed',
    });

    results.stages.ttsGeneration = {
      status: 'completed',
      duration: ttsResult.duration,
      filePath: ttsResult.filePath,
    };

    // Stage 7: 자막 생성
    console.log('Stage 7: Generating subtitles...');
    const subtitleContent = subtitleService.generateSRT(
      generatedScript.fullScript,
      ttsResult.duration,
      contentFormat
    );

    const subtitleResult = await subtitleService.saveSubtitle(
      subtitleContent,
      projectId,
      videoId,
      contentFormat,
      'srt'
    );

    await db.generatedAssets.create({
      scriptId: dbScriptId,
      assetType: 'subtitle',
      fileName: subtitleResult.fileName,
      filePath: subtitleResult.filePath,
      fileSizeBytes: subtitleResult.fileSize,
      subtitleFormat: 'srt',
      subtitleLineCount: subtitleResult.lineCount,
      generationStatus: 'completed',
    });

    results.stages.subtitleGeneration = {
      status: 'completed',
      lineCount: subtitleResult.lineCount,
      filePath: subtitleResult.filePath,
    };

    // Stage 8: 영상 합성
    let videoResult = null;
    if (!skipVideoGeneration && imagePaths.length > 0) {
      console.log('Stage 8: Creating video...');
      const ffmpegInstalled = await ffmpegService.checkInstallation();

      if (ffmpegInstalled) {
        videoResult = await ffmpegService.createVideo(
          projectId,
          videoId,
          contentFormat,
          {
            images: imagePaths,
            audioPath: ttsResult.filePath,
            subtitlePath: subtitleResult.filePath,
          }
        );

        await db.generatedAssets.create({
          scriptId: dbScriptId,
          assetType: 'video',
          fileName: videoResult.fileName,
          filePath: videoResult.filePath,
          fileSizeBytes: videoResult.fileSize,
          videoResolution: contentFormat === 'short' ? '1080x1920' : '1920x1080',
          videoDurationSeconds: videoResult.duration,
          videoCodec: 'H.264',
          videoFps: 30,
          generationStatus: 'completed',
        });

        results.stages.videoGeneration = {
          status: 'completed',
          duration: videoResult.duration,
          fileSize: videoResult.fileSize,
          filePath: videoResult.filePath,
        };
      } else {
        results.stages.videoGeneration = { status: 'failed', reason: 'FFmpeg not installed' };
      }
    } else {
      results.stages.videoGeneration = {
        status: 'skipped',
        reason: skipVideoGeneration ? 'Skipped by user' : 'No images available',
      };
    }

    // Update project status
    await db.projects.updateStatus(projectId, 'completed');

    results.status = 'completed';
    results.completedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Pipeline error:', error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
