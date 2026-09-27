import type {
  GoogleGenerativeAI,
  GenerateContentRequest,
  GenerateContentResult,
  ModelParams,
  Part,
} from '@google/generative-ai';

// 기본 모델이 과부하(503)/한도초과(429)일 때 순서대로 시도할 무료 티어 텍스트 모델
export const TEXT_MODEL_CHAIN = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

const DEFAULT_RETRIES_PER_MODEL = 2;

export const isTransientGeminiError = (error: any): boolean => {
  const status = error?.status ?? error?.response?.status;
  if ([429, 500, 503].includes(status)) return true;
  return /\[(429|500|503)\s*[^\]]*\]|high demand|overloaded|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(
    error?.message || ''
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface GenerateWithRetryOptions {
  /** 순서대로 시도할 모델 목록. 이미지/오디오 등 특수 모델은 단일 모델만 넘겨 재시도만 수행 */
  models?: string[];
  /** model 이름을 제외한 getGenerativeModel 파라미터 (generationConfig 등) */
  modelParams?: Omit<ModelParams, 'model'>;
  retriesPerModel?: number;
}

/**
 * Gemini generateContent 호출
 * 일시적 오류(503/429/500)는 지수 백오프로 재시도 후 다음 모델로 폴백
 */
export async function generateWithRetry(
  genAI: GoogleGenerativeAI,
  request: GenerateContentRequest | string | Array<string | Part>,
  {
    models = TEXT_MODEL_CHAIN,
    modelParams,
    retriesPerModel = DEFAULT_RETRIES_PER_MODEL,
  }: GenerateWithRetryOptions = {}
): Promise<GenerateContentResult> {
  let lastError: any;

  for (const modelName of models) {
    const model = genAI.getGenerativeModel({ ...modelParams, model: modelName });

    for (let attempt = 0; attempt <= retriesPerModel; attempt++) {
      try {
        return await model.generateContent(request);
      } catch (error: any) {
        lastError = error;
        if (!isTransientGeminiError(error)) throw error;
        if (attempt < retriesPerModel) {
          const delay = 1000 * 2 ** attempt + Math.random() * 500;
          console.warn(`[Gemini] ${modelName} 일시 오류, ${Math.round(delay)}ms 후 재시도 (${attempt + 1}/${retriesPerModel})`);
          await sleep(delay);
        }
      }
    }
    if (models.length > 1) console.warn(`[Gemini] ${modelName} 사용 불가, 다음 모델로 폴백`);
  }

  throw new Error(
    `Gemini 모델이 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요. (${lastError?.message || 'unknown'})`
  );
}
