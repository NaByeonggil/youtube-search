import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// Database connection pool
let pool: Pool | null = null;

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'youtube_app',
  password: process.env.DB_PASSWORD || 'youtube_password',
  database: process.env.DB_NAME || 'youtube_automation',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

/**
 * Get database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

/**
 * Execute a query and return results
 */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const connection = getPool();
  const [rows] = await connection.execute<T>(sql, params);
  return rows;
}

/**
 * Execute an insert/update/delete and return result
 */
export async function execute(
  sql: string,
  params?: unknown[]
): Promise<ResultSetHeader> {
  const connection = getPool();
  const [result] = await connection.execute<ResultSetHeader>(sql, params);
  return result;
}

/**
 * Get a single row
 */
export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows[0] || null;
}

/**
 * Transaction helper
 */
export async function transaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Close database pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Type-safe query builders
export const db = {
  // Projects
  projects: {
    async create(data: {
      projectName: string;
      keyword: string;
      contentFormat?: 'short' | 'long';
    }) {
      const result = await execute(
        `INSERT INTO projects (project_name, keyword, content_format) VALUES (?, ?, ?)`,
        [data.projectName, data.keyword, data.contentFormat || 'long']
      );
      return result.insertId;
    },

    async findById(id: number) {
      return queryOne(
        `SELECT * FROM projects WHERE id = ?`,
        [id]
      );
    },

    async findAll(limit = 50, offset = 0) {
      return query(
        `SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
    },

    async updateStatus(id: number, status: string) {
      return execute(
        `UPDATE projects SET status = ? WHERE id = ?`,
        [status, id]
      );
    },

    async delete(id: number) {
      return execute(`DELETE FROM projects WHERE id = ?`, [id]);
    },
  },

  // Selected Videos
  selectedVideos: {
    async create(data: {
      projectId: number;
      videoId: string;
      title: string;
      channelId: string;
      channelName?: string;
      subscriberCount?: number;
      viewCount?: number;
      likeCount?: number;
      commentCount?: number;
      durationSeconds?: number;
      publishedAt?: Date;
      thumbnailUrl?: string;
      viralScore?: number;
      viralGrade?: string;
    }) {
      const result = await execute(
        `INSERT INTO selected_videos
        (project_id, video_id, title, channel_id, channel_name, subscriber_count,
         view_count, like_count, comment_count, duration_seconds, published_at,
         thumbnail_url, viral_score, viral_grade)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.projectId, data.videoId, data.title, data.channelId,
          data.channelName || null, data.subscriberCount || 0, data.viewCount || 0,
          data.likeCount || 0, data.commentCount || 0, data.durationSeconds || 0,
          data.publishedAt || null, data.thumbnailUrl || null,
          data.viralScore || 0, data.viralGrade || 'C'
        ]
      );
      return result.insertId;
    },

    async findByProjectId(projectId: number) {
      return query(
        `SELECT * FROM selected_videos WHERE project_id = ? ORDER BY viral_score DESC`,
        [projectId]
      );
    },

    async findById(id: number) {
      return queryOne(`SELECT * FROM selected_videos WHERE id = ?`, [id]);
    },

    async findByVideoId(videoId: string) {
      return queryOne(`SELECT * FROM selected_videos WHERE video_id = ?`, [videoId]);
    },
  },

  // Comment Analysis
  commentAnalysis: {
    async create(data: {
      videoId: number;
      totalCommentsAnalyzed: number;
      positiveCount: number;
      negativeCount: number;
      positiveRatio: number;
      positiveSummary: string;
      positiveKeywords: string[];
      negativeSummary: string;
      negativeKeywords: string[];
      improvementSuggestions: string;
      rawCommentsJson?: string;
      analysisModel?: string;
    }) {
      const result = await execute(
        `INSERT INTO comment_analysis
        (video_id, total_comments_analyzed, positive_count, negative_count,
         positive_ratio, positive_summary, positive_keywords, negative_summary,
         negative_keywords, improvement_suggestions, raw_comments_json, analysis_model)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.videoId, data.totalCommentsAnalyzed, data.positiveCount,
          data.negativeCount, data.positiveRatio, data.positiveSummary,
          JSON.stringify(data.positiveKeywords), data.negativeSummary,
          JSON.stringify(data.negativeKeywords), data.improvementSuggestions,
          data.rawCommentsJson || null, data.analysisModel || 'claude-3-opus'
        ]
      );
      return result.insertId;
    },

    async findByVideoId(videoId: number) {
      return queryOne(
        `SELECT * FROM comment_analysis WHERE video_id = ?`,
        [videoId]
      );
    },
  },

  // Content Summaries
  contentSummaries: {
    async create(data: {
      videoId: number;
      originalTranscript?: string;
      oneLineSummary?: string;
      keyPoints?: string[];
      detailedSummary?: string;
      contextBackground?: string;
      summaryLevel?: '2-step' | '4-step';
    }) {
      const result = await execute(
        `INSERT INTO content_summaries
        (video_id, original_transcript, one_line_summary, key_points,
         detailed_summary, context_background, summary_level)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.videoId, data.originalTranscript || null,
          data.oneLineSummary || null, JSON.stringify(data.keyPoints || []),
          data.detailedSummary || null, data.contextBackground || null,
          data.summaryLevel || '4-step'
        ]
      );
      return result.insertId;
    },

    async findByVideoId(videoId: number) {
      return queryOne(
        `SELECT * FROM content_summaries WHERE video_id = ?`,
        [videoId]
      );
    },
  },

  // Generated Scripts
  generatedScripts: {
    async create(data: {
      videoId: number;
      scriptPurpose?: string;
      targetAudience?: string;
      expectedDurationSeconds?: number;
      scriptStructure?: Record<string, string>;
      fullScript: string;
      hookText?: string;
      introText?: string;
      bodyText?: string;
      conclusionText?: string;
      contentFormat?: 'short' | 'long';
      wordCount?: number;
    }) {
      const result = await execute(
        `INSERT INTO generated_scripts
        (video_id, script_purpose, target_audience, expected_duration_seconds,
         script_structure, full_script, hook_text, intro_text, body_text,
         conclusion_text, content_format, word_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.videoId, data.scriptPurpose || null, data.targetAudience || null,
          data.expectedDurationSeconds || 0, JSON.stringify(data.scriptStructure || {}),
          data.fullScript, data.hookText || null, data.introText || null,
          data.bodyText || null, data.conclusionText || null,
          data.contentFormat || 'long', data.wordCount || 0
        ]
      );
      return result.insertId;
    },

    async findByVideoId(videoId: number) {
      return query(
        `SELECT * FROM generated_scripts WHERE video_id = ? ORDER BY created_at DESC`,
        [videoId]
      );
    },

    async findById(id: number) {
      return queryOne(`SELECT * FROM generated_scripts WHERE id = ?`, [id]);
    },
  },

  // Generated Assets
  generatedAssets: {
    async create(data: {
      scriptId: number;
      assetType: 'image' | 'voice' | 'subtitle' | 'video' | 'report';
      fileName: string;
      filePath: string;
      fileSizeBytes?: number;
      fileUrl?: string;
      imagePrompt?: string;
      imageResolution?: string;
      imageSequence?: number;
      voiceDurationSeconds?: number;
      ttsProvider?: string;
      ttsVoiceId?: string;
      ttsSpeed?: number;
      subtitleFormat?: 'srt' | 'vtt' | 'ass';
      subtitleLineCount?: number;
      videoResolution?: string;
      videoDurationSeconds?: number;
      videoCodec?: string;
      videoFps?: number;
      generationStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    }) {
      const result = await execute(
        `INSERT INTO generated_assets
        (script_id, asset_type, file_name, file_path, file_size_bytes, file_url,
         image_prompt, image_resolution, image_sequence, voice_duration_seconds,
         tts_provider, tts_voice_id, tts_speed, subtitle_format, subtitle_line_count,
         video_resolution, video_duration_seconds, video_codec, video_fps, generation_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.scriptId, data.assetType, data.fileName, data.filePath,
          data.fileSizeBytes || 0, data.fileUrl || null, data.imagePrompt || null,
          data.imageResolution || null, data.imageSequence || null,
          data.voiceDurationSeconds || null, data.ttsProvider || null,
          data.ttsVoiceId || null, data.ttsSpeed || 1.0,
          data.subtitleFormat || null, data.subtitleLineCount || null,
          data.videoResolution || null, data.videoDurationSeconds || null,
          data.videoCodec || null, data.videoFps || null,
          data.generationStatus || 'pending'
        ]
      );
      return result.insertId;
    },

    async findByScriptId(scriptId: number) {
      return query(
        `SELECT * FROM generated_assets WHERE script_id = ? ORDER BY asset_type, image_sequence`,
        [scriptId]
      );
    },

    async updateStatus(id: number, status: string, errorMessage?: string) {
      return execute(
        `UPDATE generated_assets SET generation_status = ?, error_message = ? WHERE id = ?`,
        [status, errorMessage || null, id]
      );
    },
  },

  // Upload History
  uploadHistory: {
    async create(data: {
      assetId: number;
      youtubeVideoId?: string;
      uploadTitle: string;
      uploadDescription?: string;
      uploadTags?: string[];
      uploadCategoryId?: number;
      privacyStatus?: 'public' | 'unlisted' | 'private';
      scheduledPublishAt?: Date;
    }) {
      const result = await execute(
        `INSERT INTO upload_history
        (asset_id, youtube_video_id, upload_title, upload_description, upload_tags,
         upload_category_id, privacy_status, scheduled_publish_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.assetId, data.youtubeVideoId || null, data.uploadTitle,
          data.uploadDescription || null, JSON.stringify(data.uploadTags || []),
          data.uploadCategoryId || null, data.privacyStatus || 'private',
          data.scheduledPublishAt || null
        ]
      );
      return result.insertId;
    },

    async updateStatus(id: number, status: string, youtubeVideoId?: string) {
      return execute(
        `UPDATE upload_history SET upload_status = ?, youtube_video_id = ?,
         actual_published_at = ${status === 'published' ? 'NOW()' : 'NULL'} WHERE id = ?`,
        [status, youtubeVideoId || null, id]
      );
    },
  },

  // Full Reports
  fullReports: {
    async create(data: {
      projectId: number;
      videoId: number;
      reportType: 'comments' | 'script' | 'assets' | 'full';
      fileName: string;
      filePath: string;
      fileSizeBytes?: number;
      markdownContent: string;
    }) {
      const result = await execute(
        `INSERT INTO full_reports
        (project_id, video_id, report_type, file_name, file_path, file_size_bytes, markdown_content)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.projectId, data.videoId, data.reportType,
          data.fileName, data.filePath, data.fileSizeBytes || 0,
          data.markdownContent
        ]
      );
      return result.insertId;
    },

    async findByProjectId(projectId: number) {
      return query(
        `SELECT * FROM full_reports WHERE project_id = ? ORDER BY generated_at DESC`,
        [projectId]
      );
    },
  },

  // Templates
  templates: {
    async findByType(type: string, format?: string) {
      let sql = `SELECT * FROM templates WHERE template_type = ?`;
      const params: unknown[] = [type];

      if (format && format !== 'both') {
        sql += ` AND (content_format = ? OR content_format = 'both')`;
        params.push(format);
      }

      sql += ` ORDER BY use_count DESC`;
      return query(sql, params);
    },

    async incrementUseCount(id: number) {
      return execute(
        `UPDATE templates SET use_count = use_count + 1 WHERE id = ?`,
        [id]
      );
    },
  },

  // Platforms
  platforms: {
    async findAll() {
      return query(`SELECT * FROM platforms WHERE api_enabled = TRUE`);
    },

    async findByCode(code: string) {
      return queryOne(`SELECT * FROM platforms WHERE platform_code = ?`, [code]);
    },
  },

  // Script Structure Analysis
  scriptStructureAnalysis: {
    async create(data: {
      title?: string;
      originalScript: string;
      scriptSource?: 'manual' | 'youtube-caption' | 'whisper';
      youtubeVideoId?: string;
      structureSections?: unknown;
      characterCount?: unknown;
      storytellingTechniques?: unknown;
      hooksAnalysis?: unknown;
      improvements?: unknown;
      planningNotes?: unknown;
      totalCharacters?: number;
      estimatedDuration?: string;
      analysisModel?: string;
    }) {
      const result = await execute(
        `INSERT INTO script_structure_analysis
        (title, original_script, script_source, youtube_video_id,
         structure_sections, character_count, storytelling_techniques,
         hooks_analysis, improvements, planning_notes,
         total_characters, estimated_duration, analysis_model)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.title || null,
          data.originalScript,
          data.scriptSource || 'manual',
          data.youtubeVideoId || null,
          JSON.stringify(data.structureSections || null),
          JSON.stringify(data.characterCount || null),
          JSON.stringify(data.storytellingTechniques || null),
          JSON.stringify(data.hooksAnalysis || null),
          JSON.stringify(data.improvements || null),
          JSON.stringify(data.planningNotes || null),
          data.totalCharacters || 0,
          data.estimatedDuration || null,
          data.analysisModel || 'gemini-3-pro'
        ]
      );
      return result.insertId;
    },

    async findById(id: number) {
      return queryOne(
        `SELECT * FROM script_structure_analysis WHERE id = ?`,
        [id]
      );
    },

    async findAll(limit = 20, offset = 0, search?: string) {
      let sql = `SELECT * FROM script_structure_analysis`;
      const params: unknown[] = [];

      if (search) {
        sql += ` WHERE title LIKE ? OR original_script LIKE ?`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }

      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      return query(sql, params);
    },

    async count(search?: string) {
      let sql = `SELECT COUNT(*) as total FROM script_structure_analysis`;
      const params: unknown[] = [];

      if (search) {
        sql += ` WHERE title LIKE ? OR original_script LIKE ?`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }

      const result = await query<(RowDataPacket & { total: number })[]>(sql, params);
      return result[0]?.total || 0;
    },

    async delete(id: number) {
      return execute(`DELETE FROM script_structure_analysis WHERE id = ?`, [id]);
    },

    async update(id: number, data: {
      title?: string;
      structureSections?: unknown;
      characterCount?: unknown;
      storytellingTechniques?: unknown;
      hooksAnalysis?: unknown;
      improvements?: unknown;
      planningNotes?: unknown;
      totalCharacters?: number;
      estimatedDuration?: string;
    }) {
      const updates: string[] = [];
      const params: unknown[] = [];

      if (data.title !== undefined) {
        updates.push('title = ?');
        params.push(data.title);
      }
      if (data.structureSections !== undefined) {
        updates.push('structure_sections = ?');
        params.push(JSON.stringify(data.structureSections));
      }
      if (data.characterCount !== undefined) {
        updates.push('character_count = ?');
        params.push(JSON.stringify(data.characterCount));
      }
      if (data.storytellingTechniques !== undefined) {
        updates.push('storytelling_techniques = ?');
        params.push(JSON.stringify(data.storytellingTechniques));
      }
      if (data.hooksAnalysis !== undefined) {
        updates.push('hooks_analysis = ?');
        params.push(JSON.stringify(data.hooksAnalysis));
      }
      if (data.improvements !== undefined) {
        updates.push('improvements = ?');
        params.push(JSON.stringify(data.improvements));
      }
      if (data.planningNotes !== undefined) {
        updates.push('planning_notes = ?');
        params.push(JSON.stringify(data.planningNotes));
      }
      if (data.totalCharacters !== undefined) {
        updates.push('total_characters = ?');
        params.push(data.totalCharacters);
      }
      if (data.estimatedDuration !== undefined) {
        updates.push('estimated_duration = ?');
        params.push(data.estimatedDuration);
      }

      if (updates.length === 0) return null;

      params.push(id);
      return execute(
        `UPDATE script_structure_analysis SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    },
  },

  // Generated Blogs
  generatedBlogs: {
    async create(data: {
      sourceVideoId?: string;
      sourceVideoTitle?: string;
      sourceChannelName?: string;
      ideaTitle?: string;
      ideaDescription?: string;
      ideaTargetAudience?: string;
      blogTitle: string;
      metaDescription?: string;
      introduction?: string;
      sections?: unknown[];
      conclusion?: string;
      tags?: string[];
      estimatedReadTime?: string;
      customTarget?: string;
      toneAndManner?: string;
      wordCount?: number;
    }) {
      const result = await execute(
        `INSERT INTO generated_blogs
        (source_video_id, source_video_title, source_channel_name,
         idea_title, idea_description, idea_target_audience,
         blog_title, meta_description, introduction, sections, conclusion,
         tags, estimated_read_time, custom_target, tone_and_manner, word_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.sourceVideoId || null,
          data.sourceVideoTitle || null,
          data.sourceChannelName || null,
          data.ideaTitle || null,
          data.ideaDescription || null,
          data.ideaTargetAudience || null,
          data.blogTitle,
          data.metaDescription || null,
          data.introduction || null,
          JSON.stringify(data.sections || []),
          data.conclusion || null,
          JSON.stringify(data.tags || []),
          data.estimatedReadTime || null,
          data.customTarget || null,
          data.toneAndManner || null,
          data.wordCount || 0
        ]
      );
      return result.insertId;
    },

    async findById(id: number) {
      return queryOne(
        `SELECT * FROM generated_blogs WHERE id = ?`,
        [id]
      );
    },

    async findAll(limit = 20, offset = 0, search?: string) {
      let sql = `SELECT * FROM generated_blogs`;
      const params: unknown[] = [];

      if (search) {
        sql += ` WHERE blog_title LIKE ? OR idea_title LIKE ?`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }

      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      return query(sql, params);
    },

    async count(search?: string) {
      let sql = `SELECT COUNT(*) as total FROM generated_blogs`;
      const params: unknown[] = [];

      if (search) {
        sql += ` WHERE blog_title LIKE ? OR idea_title LIKE ?`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }

      const result = await query<(RowDataPacket & { total: number })[]>(sql, params);
      return result[0]?.total || 0;
    },

    async delete(id: number) {
      return execute(`DELETE FROM generated_blogs WHERE id = ?`, [id]);
    },
  },
};

export default db;
