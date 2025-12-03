import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS 클래스 병합 유틸리티
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 숫자 포맷팅 (조회수, 구독자수 등)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * 파일 크기 포맷팅
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(2) + ' GB';
  }
  if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(2) + ' MB';
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  }
  return bytes + ' B';
}

/**
 * 날짜 포맷팅
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 상대 시간 포맷팅
 */
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return `${Math.floor(diffDays / 365)}년 전`;
}

/**
 * 등급별 색상 반환
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'S': return 'text-red-400 bg-red-500/20';
    case 'A': return 'text-orange-400 bg-orange-500/20';
    case 'B': return 'text-yellow-400 bg-yellow-500/20';
    case 'C': return 'text-green-400 bg-green-500/20';
    case 'D': return 'text-gray-400 bg-gray-500/20';
    default: return 'text-gray-400 bg-gray-500/20';
  }
}

/**
 * 등급별 라벨 반환
 */
export function getGradeLabel(grade: string): string {
  switch (grade) {
    case 'S': return '폭발';
    case 'A': return '대성공';
    case 'B': return '성공';
    case 'C': return '평균';
    case 'D': return '저조';
    default: return '미분류';
  }
}

/**
 * 상태별 색상 반환
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-400 bg-green-500/20';
    case 'processing': return 'text-blue-400 bg-blue-500/20';
    case 'pending': return 'text-yellow-400 bg-yellow-500/20';
    case 'failed': return 'text-red-400 bg-red-500/20';
    default: return 'text-slate-400 bg-slate-500/20';
  }
}

/**
 * 상태별 라벨 반환
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed': return '완료';
    case 'processing': return '처리중';
    case 'pending': return '대기';
    case 'failed': return '실패';
    default: return '알 수 없음';
  }
}
