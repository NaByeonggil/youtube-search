-- YouTube Content Automation Database Schema
-- Version: 5.0

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =====================================================
-- 1. 프로젝트 테이블 (projects)
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(200) NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    content_format ENUM('short', 'long') DEFAULT 'long',
    status ENUM('searching', 'analyzing', 'generating', 'completed', 'failed') DEFAULT 'searching',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_keyword (keyword),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. 선택 영상 테이블 (selected_videos)
-- =====================================================
CREATE TABLE IF NOT EXISTS selected_videos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    video_id VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    channel_id VARCHAR(30) NOT NULL,
    channel_name VARCHAR(200),
    subscriber_count BIGINT DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    duration_seconds INT DEFAULT 0,
    published_at DATETIME,
    thumbnail_url VARCHAR(500),
    viral_score DECIMAL(10,4) DEFAULT 0,
    viral_grade ENUM('S', 'A', 'B', 'C', 'D') DEFAULT 'C',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_viral_grade (viral_grade),
    INDEX idx_viral_score (viral_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. 댓글 분석 테이블 (comment_analysis)
-- =====================================================
CREATE TABLE IF NOT EXISTS comment_analysis (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id BIGINT NOT NULL,
    total_comments_analyzed INT DEFAULT 0,
    positive_count INT DEFAULT 0,
    negative_count INT DEFAULT 0,
    positive_ratio DECIMAL(5,2) DEFAULT 0,
    positive_summary TEXT,
    positive_keywords JSON,
    negative_summary TEXT,
    negative_keywords JSON,
    improvement_suggestions TEXT,
    raw_comments_json LONGTEXT,
    analysis_model VARCHAR(50) DEFAULT 'claude-3-opus',
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (video_id) REFERENCES selected_videos(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_positive_ratio (positive_ratio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. 콘텐츠 요약 테이블 (content_summaries)
-- =====================================================
CREATE TABLE IF NOT EXISTS content_summaries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id BIGINT NOT NULL,
    original_transcript LONGTEXT,
    one_line_summary VARCHAR(500),
    key_points JSON,
    detailed_summary TEXT,
    context_background TEXT,
    summary_level ENUM('2-step', '4-step') DEFAULT '4-step',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (video_id) REFERENCES selected_videos(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. 생성 대본 테이블 (generated_scripts)
-- =====================================================
CREATE TABLE IF NOT EXISTS generated_scripts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id BIGINT NOT NULL,
    script_purpose VARCHAR(500),
    target_audience VARCHAR(200),
    expected_duration_seconds INT DEFAULT 0,
    script_structure JSON,
    full_script LONGTEXT NOT NULL,
    hook_text TEXT,
    intro_text TEXT,
    body_text LONGTEXT,
    conclusion_text TEXT,
    content_format ENUM('short', 'long') DEFAULT 'long',
    word_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (video_id) REFERENCES selected_videos(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_content_format (content_format)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. 생성 에셋 테이블 (generated_assets)
-- =====================================================
CREATE TABLE IF NOT EXISTS generated_assets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    script_id BIGINT NOT NULL,
    asset_type ENUM('image', 'voice', 'subtitle', 'video', 'report') NOT NULL,
    file_name VARCHAR(300) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    file_url VARCHAR(500),

    -- 이미지 전용 필드
    image_prompt TEXT,
    image_resolution VARCHAR(20),
    image_sequence INT,

    -- 음성 전용 필드
    voice_duration_seconds DECIMAL(10,2),
    tts_provider VARCHAR(50),
    tts_voice_id VARCHAR(100),
    tts_speed DECIMAL(3,2) DEFAULT 1.0,

    -- 자막 전용 필드
    subtitle_format ENUM('srt', 'vtt', 'ass') DEFAULT 'srt',
    subtitle_line_count INT,

    -- 영상 전용 필드
    video_resolution VARCHAR(20),
    video_duration_seconds DECIMAL(10,2),
    video_codec VARCHAR(20),
    video_fps INT,

    -- 공통
    generation_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (script_id) REFERENCES generated_scripts(id) ON DELETE CASCADE,
    INDEX idx_script_id (script_id),
    INDEX idx_asset_type (asset_type),
    INDEX idx_generation_status (generation_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. YouTube 업로드 이력 테이블 (upload_history)
-- =====================================================
CREATE TABLE IF NOT EXISTS upload_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    asset_id BIGINT NOT NULL,
    youtube_video_id VARCHAR(20),
    upload_title VARCHAR(200) NOT NULL,
    upload_description TEXT,
    upload_tags JSON,
    upload_category_id INT,
    privacy_status ENUM('public', 'unlisted', 'private') DEFAULT 'private',
    scheduled_publish_at DATETIME,
    actual_published_at DATETIME,
    upload_status ENUM('pending', 'uploading', 'processing', 'published', 'failed') DEFAULT 'pending',
    thumbnail_url VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (asset_id) REFERENCES generated_assets(id) ON DELETE CASCADE,
    INDEX idx_youtube_video_id (youtube_video_id),
    INDEX idx_upload_status (upload_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 8. 전체 리포트 테이블 (full_reports)
-- =====================================================
CREATE TABLE IF NOT EXISTS full_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    video_id BIGINT NOT NULL,
    report_type ENUM('comments', 'script', 'assets', 'full') DEFAULT 'full',
    file_name VARCHAR(300) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    markdown_content LONGTEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES selected_videos(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_report_type (report_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 9. 플랫폼 테이블 (platforms)
-- =====================================================
CREATE TABLE IF NOT EXISTS platforms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform_code VARCHAR(20) NOT NULL UNIQUE,
    platform_name VARCHAR(50) NOT NULL,
    max_duration_seconds INT,
    max_file_size_mb INT,
    aspect_ratio VARCHAR(10),
    resolution VARCHAR(20),
    api_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 플랫폼 데이터 삽입
INSERT INTO platforms (platform_code, platform_name, max_duration_seconds, max_file_size_mb, aspect_ratio, resolution, api_enabled) VALUES
('youtube_shorts', 'YouTube Shorts', 60, 2048, '9:16', '1080x1920', TRUE),
('youtube_long', 'YouTube', 43200, 256000, '16:9', '1920x1080', TRUE),
('tiktok', 'TikTok', 600, 287, '9:16', '1080x1920', TRUE),
('instagram_reels', 'Instagram Reels', 90, 4096, '9:16', '1080x1920', TRUE);

-- =====================================================
-- 10. 다중 플랫폼 업로드 테이블 (multi_platform_uploads)
-- =====================================================
CREATE TABLE IF NOT EXISTS multi_platform_uploads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    asset_id BIGINT NOT NULL,
    platform_id INT NOT NULL,
    platform_video_id VARCHAR(100),
    platform_url VARCHAR(500),
    upload_title VARCHAR(200),
    upload_description TEXT,
    hashtags JSON,
    optimized_file_path VARCHAR(500),
    upload_status ENUM('pending', 'optimizing', 'uploading', 'published', 'failed') DEFAULT 'pending',
    scheduled_at DATETIME,
    published_at DATETIME,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (asset_id) REFERENCES generated_assets(id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES platforms(id),
    UNIQUE KEY uk_asset_platform (asset_id, platform_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11. A/B 테스트 테이블 (ab_tests)
-- =====================================================
CREATE TABLE IF NOT EXISTS ab_tests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    test_type ENUM('thumbnail', 'title', 'description', 'combined') NOT NULL,
    status ENUM('draft', 'running', 'completed', 'cancelled') DEFAULT 'draft',
    start_date DATETIME,
    end_date DATETIME,
    min_views_per_variant INT DEFAULT 1000,
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    winner_variant_id BIGINT,
    statistical_significance DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 12. A/B 테스트 변형 테이블 (ab_test_variants)
-- =====================================================
CREATE TABLE IF NOT EXISTS ab_test_variants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    test_id BIGINT NOT NULL,
    variant_name VARCHAR(50) NOT NULL,
    is_control BOOLEAN DEFAULT FALSE,
    title VARCHAR(200),
    description TEXT,
    thumbnail_path VARCHAR(500),
    youtube_video_id VARCHAR(20),

    -- 성과 지표
    views INT DEFAULT 0,
    watch_time_hours DECIMAL(10,2) DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    ctr DECIMAL(5,4) DEFAULT 0,
    avg_view_duration_seconds INT DEFAULT 0,
    engagement_score DECIMAL(10,4) DEFAULT 0,

    last_metrics_update DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 13. 성과 지표 테이블 (video_analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS video_analytics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    upload_id BIGINT NOT NULL,
    metric_date DATE NOT NULL,

    -- 기본 지표
    views INT DEFAULT 0,
    watch_time_minutes DECIMAL(12,2) DEFAULT 0,
    avg_view_duration_seconds INT DEFAULT 0,
    avg_percentage_viewed DECIMAL(5,2) DEFAULT 0,

    -- 참여 지표
    likes INT DEFAULT 0,
    dislikes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,

    -- 구독 지표
    subscribers_gained INT DEFAULT 0,
    subscribers_lost INT DEFAULT 0,

    -- 노출 지표
    impressions INT DEFAULT 0,
    impressions_ctr DECIMAL(5,4) DEFAULT 0,

    -- 트래픽 소스
    traffic_source_search INT DEFAULT 0,
    traffic_source_suggested INT DEFAULT 0,
    traffic_source_browse INT DEFAULT 0,
    traffic_source_external INT DEFAULT 0,

    -- 수익
    estimated_revenue_usd DECIMAL(10,2) DEFAULT 0,
    cpm_usd DECIMAL(6,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (upload_id) REFERENCES upload_history(id) ON DELETE CASCADE,
    UNIQUE KEY uk_upload_date (upload_id, metric_date),
    INDEX idx_metric_date (metric_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 14. 템플릿 테이블 (templates)
-- =====================================================
CREATE TABLE IF NOT EXISTS templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(200) NOT NULL,
    template_type ENUM('script', 'image_prompt', 'video_style', 'thumbnail') NOT NULL,
    category VARCHAR(100),
    content_format ENUM('short', 'long', 'both') DEFAULT 'both',

    -- 템플릿 내용
    template_content LONGTEXT NOT NULL,
    template_variables JSON,

    -- 예시 및 설명
    description TEXT,
    example_output TEXT,
    preview_image_url VARCHAR(500),

    -- 사용 통계
    use_count INT DEFAULT 0,
    avg_performance_score DECIMAL(5,2),

    is_public BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_type_category (template_type, category),
    INDEX idx_use_count (use_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 15. 템플릿 사용 이력 테이블 (template_usage)
-- =====================================================
CREATE TABLE IF NOT EXISTS template_usage (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_id BIGINT NOT NULL,
    project_id BIGINT NOT NULL,
    script_id BIGINT,

    -- 적용된 변수 값
    applied_variables JSON,
    generated_content LONGTEXT,

    -- 성과 연동
    performance_score DECIMAL(5,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 16. 워크플로우 단계 테이블 (workflow_stages)
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stage_code VARCHAR(30) NOT NULL UNIQUE,
    stage_name VARCHAR(100) NOT NULL,
    stage_order INT NOT NULL,
    requires_approval BOOLEAN DEFAULT FALSE,
    auto_advance BOOLEAN DEFAULT FALSE,
    notification_template TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 워크플로우 단계 삽입
INSERT INTO workflow_stages (stage_code, stage_name, stage_order, requires_approval) VALUES
('draft', '초안 작성', 1, FALSE),
('script_review', '대본 검토', 2, TRUE),
('image_review', '이미지 검토', 3, TRUE),
('video_review', '영상 검토', 4, TRUE),
('final_approval', '최종 승인', 5, TRUE),
('scheduled', '업로드 예약', 6, FALSE),
('published', '게시 완료', 7, FALSE);

-- =====================================================
-- 17. 프로젝트 워크플로우 테이블 (project_workflows)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_workflows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    current_stage_id INT NOT NULL,

    -- 담당자 정보
    creator_id VARCHAR(100),
    assignee_id VARCHAR(100),
    reviewer_id VARCHAR(100),
    approver_id VARCHAR(100),

    -- 기한
    due_date DATETIME,

    -- 상태
    status ENUM('in_progress', 'pending_review', 'approved', 'rejected', 'completed') DEFAULT 'in_progress',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (current_stage_id) REFERENCES workflow_stages(id),
    INDEX idx_status (status),
    INDEX idx_assignee (assignee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 18. 검토/승인 이력 테이블 (workflow_reviews)
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workflow_id BIGINT NOT NULL,
    stage_id INT NOT NULL,
    reviewer_id VARCHAR(100) NOT NULL,
    reviewer_name VARCHAR(100),

    -- 검토 결과
    action ENUM('approve', 'reject', 'request_changes', 'comment') NOT NULL,
    comments TEXT,

    -- 변경 요청 상세
    change_requests JSON,

    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (workflow_id) REFERENCES project_workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES workflow_stages(id),
    INDEX idx_workflow_stage (workflow_id, stage_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 19. 팀 멤버 테이블 (team_members)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL UNIQUE,
    user_name VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL,
    role ENUM('admin', 'creator', 'reviewer', 'approver', 'viewer') DEFAULT 'viewer',

    -- 알림 설정
    notify_email BOOLEAN DEFAULT TRUE,
    notify_slack BOOLEAN DEFAULT FALSE,
    slack_user_id VARCHAR(50),

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 20. 백업 설정 테이블 (backup_configs)
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backup_name VARCHAR(100) NOT NULL,
    backup_type ENUM('full', 'incremental', 'differential') DEFAULT 'full',
    schedule_cron VARCHAR(50) NOT NULL,
    retention_days INT DEFAULT 30,

    -- GCS 설정
    gcs_bucket VARCHAR(100) NOT NULL,
    gcs_path_prefix VARCHAR(200),

    -- 압축/암호화
    compression ENUM('none', 'gzip', 'zstd') DEFAULT 'gzip',
    encryption_enabled BOOLEAN DEFAULT TRUE,

    is_active BOOLEAN DEFAULT TRUE,
    last_backup_at DATETIME,
    last_backup_status ENUM('success', 'failed'),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 21. 백업 이력 테이블 (backup_history)
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_id INT NOT NULL,
    backup_type ENUM('full', 'incremental', 'differential'),

    -- 파일 정보
    file_name VARCHAR(300),
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    gcs_url VARCHAR(500),

    -- 실행 정보
    started_at DATETIME,
    completed_at DATETIME,
    duration_seconds INT,

    -- 상태
    status ENUM('running', 'success', 'failed') DEFAULT 'running',
    error_message TEXT,

    -- 복원 테스트
    restore_tested BOOLEAN DEFAULT FALSE,
    restore_test_date DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (config_id) REFERENCES backup_configs(id),
    INDEX idx_config_status (config_id, status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 기본 템플릿 데이터 삽입
-- =====================================================
INSERT INTO templates (template_name, template_type, category, content_format, template_content, template_variables, description) VALUES
(
  '문제해결형 롱폼 대본',
  'script',
  '교육/정보',
  'long',
  '## 도입부 (0:00 ~ 1:00)\n{{HOOK_QUESTION}}\n안녕하세요, 오늘은 {{TOPIC}}에 대해 이야기해보려고 합니다.\n{{VIEWER_PAIN_POINT}}로 고민하고 계신 분들 많으시죠?\n\n## 본론 1: 문제 분석 (1:00 ~ 3:00)\n{{PROBLEM_ANALYSIS}}\n\n## 본론 2: 해결책 제시 (3:00 ~ 6:00)\n{{SOLUTION_STEPS}}\n\n## 본론 3: 실제 사례 (6:00 ~ 8:00)\n{{REAL_EXAMPLES}}\n\n## 결론 (8:00 ~ 10:00)\n{{SUMMARY}}\n{{CALL_TO_ACTION}}',
  '["HOOK_QUESTION", "TOPIC", "VIEWER_PAIN_POINT", "PROBLEM_ANALYSIS", "SOLUTION_STEPS", "REAL_EXAMPLES", "SUMMARY", "CALL_TO_ACTION"]',
  '시청자의 문제를 분석하고 해결책을 제시하는 교육 콘텐츠용 대본 템플릿'
),
(
  '바이럴 숏폼 대본',
  'script',
  '엔터테인먼트',
  'short',
  '## 훅 (0~3초)\n{{SHOCKING_HOOK}}\n\n## 핵심 (3~45초)\n{{MAIN_CONTENT}}\n\n## 반전/CTA (45~60초)\n{{TWIST_OR_CTA}}',
  '["SHOCKING_HOOK", "MAIN_CONTENT", "TWIST_OR_CTA"]',
  '시선을 사로잡는 훅으로 시작하는 숏폼 바이럴 콘텐츠용 템플릿'
),
(
  '전문가 인물 이미지',
  'image_prompt',
  '인물',
  'both',
  'Professional Korean {{GENDER}} in {{AGE_RANGE}}, wearing {{OUTFIT}}, {{POSE}}, in a {{SETTING}}, {{LIGHTING}}, photorealistic, high resolution, 8k, --ar {{ASPECT_RATIO}}',
  '["GENDER", "AGE_RANGE", "OUTFIT", "POSE", "SETTING", "LIGHTING", "ASPECT_RATIO"]',
  '전문적인 분위기의 한국인 인물 이미지 생성용 프롬프트'
),
(
  '감성적 배경 이미지',
  'image_prompt',
  '배경',
  'both',
  'Cinematic {{SCENE_TYPE}} scene, {{MOOD}} atmosphere, {{COLOR_TONE}} color grading, {{TIME_OF_DAY}}, volumetric lighting, depth of field, ultra detailed, --ar {{ASPECT_RATIO}}',
  '["SCENE_TYPE", "MOOD", "COLOR_TONE", "TIME_OF_DAY", "ASPECT_RATIO"]',
  '감성적인 분위기의 배경 이미지 생성용 프롬프트'
);
