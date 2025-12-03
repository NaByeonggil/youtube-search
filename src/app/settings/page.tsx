'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

interface AIModelConfig {
  provider: string;
  model: string;
  apiKey: string;
  enabled: boolean;
}

interface TTSConfig {
  provider: string;
  voiceId: string;
  apiKey: string;
}

export default function SettingsPage() {
  const [textModel, setTextModel] = useState<AIModelConfig>({
    provider: 'gemini',
    model: 'gemini-3-pro-preview',
    apiKey: '',
    enabled: true,
  });

  const [imageModel, setImageModel] = useState<AIModelConfig>({
    provider: 'gemini',
    model: 'gemini-3-pro-image-preview',
    apiKey: '',
    enabled: true,
  });

  const [ttsConfig, setTTSConfig] = useState<TTSConfig>({
    provider: 'elevenlabs',
    voiceId: '',
    apiKey: '',
  });

  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      // Save settings to API
      // For now, just show success message
      await new Promise(resolve => setTimeout(resolve, 500));
      setMessage('설정이 저장되었습니다.');
    } catch (error) {
      setMessage('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-full">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">설정</h1>
        <p className="text-slate-400 mt-1">AI 모델 및 API 키 설정</p>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* 메시지 */}
        {message && (
          <div className={`p-4 rounded-lg ${message.includes('실패') ? 'bg-red-500/10 border border-red-500/50 text-red-400' : 'bg-green-500/10 border border-green-500/50 text-green-400'}`}>
            {message}
          </div>
        )}

        {/* YouTube API */}
        <Card>
          <CardHeader>
            <CardTitle>YouTube API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                YouTube Data API Key
              </label>
              <input
                type="password"
                value={youtubeApiKey}
                onChange={(e) => setYoutubeApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Google Cloud Console에서 YouTube Data API v3 키를 발급받으세요.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 텍스트 AI 모델 */}
        <Card>
          <CardHeader>
            <CardTitle>텍스트 생성 AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                AI 제공자
              </label>
              <select
                value={textModel.provider}
                onChange={(e) => setTextModel({ ...textModel, provider: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="gemini">Google Gemini</option>
                <option value="claude">Anthropic Claude</option>
                <option value="openai">OpenAI GPT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                모델
              </label>
              <select
                value={textModel.model}
                onChange={(e) => setTextModel({ ...textModel, model: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                {textModel.provider === 'gemini' && (
                  <>
                    <option value="gemini-3-pro-preview">Gemini 3 Pro (추천)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </>
                )}
                {textModel.provider === 'claude' && (
                  <>
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                  </>
                )}
                {textModel.provider === 'openai' && (
                  <>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={textModel.apiKey}
                onChange={(e) => setTextModel({ ...textModel, apiKey: e.target.value })}
                placeholder="API 키를 입력하세요"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* 이미지 AI 모델 */}
        <Card>
          <CardHeader>
            <CardTitle>이미지 생성 AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                AI 제공자
              </label>
              <select
                value={imageModel.provider}
                onChange={(e) => setImageModel({ ...imageModel, provider: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="gemini">Google Gemini Imagen</option>
                <option value="openai">OpenAI DALL-E</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                모델
              </label>
              <select
                value={imageModel.model}
                onChange={(e) => setImageModel({ ...imageModel, model: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                {imageModel.provider === 'gemini' && (
                  <>
                    <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image (추천)</option>
                    <option value="imagen-3.0-generate-002">Imagen 3.0</option>
                  </>
                )}
                {imageModel.provider === 'openai' && (
                  <>
                    <option value="dall-e-3">DALL-E 3</option>
                    <option value="dall-e-2">DALL-E 2</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={imageModel.apiKey}
                onChange={(e) => setImageModel({ ...imageModel, apiKey: e.target.value })}
                placeholder="API 키를 입력하세요"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* TTS 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>음성 합성 (TTS)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                TTS 제공자
              </label>
              <select
                value={ttsConfig.provider}
                onChange={(e) => setTTSConfig({ ...ttsConfig, provider: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="elevenlabs">ElevenLabs (추천)</option>
                <option value="google">Google Cloud TTS</option>
                <option value="azure">Azure Speech</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                기본 음성 ID
              </label>
              <input
                type="text"
                value={ttsConfig.voiceId}
                onChange={(e) => setTTSConfig({ ...ttsConfig, voiceId: e.target.value })}
                placeholder="음성 ID를 입력하세요"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={ttsConfig.apiKey}
                onChange={(e) => setTTSConfig({ ...ttsConfig, apiKey: e.target.value })}
                placeholder="API 키를 입력하세요"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* 알림 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>알림 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Slack Webhook URL (선택)
              </label>
              <input
                type="text"
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Discord Webhook URL (선택)
              </label>
              <input
                type="text"
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '설정 저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}
