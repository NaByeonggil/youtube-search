-- Migration: Add content_ideas_list column and ideas_generated status
-- Date: 2026-01-04
-- Description: 콘텐츠 아이디어 분석 직후 저장을 위한 스키마 변경

-- 1. content_ideas_list 컬럼 추가 (전체 아이디어 목록 저장용)
ALTER TABLE content_idea_workflows
ADD COLUMN content_ideas_list JSON AFTER hot_topics;

-- 2. workflow_status ENUM 수정 (ideas_generated 상태 추가)
ALTER TABLE content_idea_workflows
MODIFY COLUMN workflow_status ENUM('ideas_generated', 'idea_selected', 'outline_created', 'script_generated', 'completed') DEFAULT 'ideas_generated';

-- 완료 확인
SELECT 'Migration completed successfully!' as status;
