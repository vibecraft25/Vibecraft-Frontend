/**
 * 스트리밍 응답을 시뮬레이션하는 유틸리티
 * 텍스트를 한 글자씩 보내는 효과 생성
 */

export interface StreamingOptions {
  text: string;
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  chunkDelayMs?: number;
  startDelayMs?: number;
}

/**
 * 텍스트를 스트리밍으로 한 글자씩 출력
 * @param options 스트리밍 옵션
 * @returns 취소 함수
 */
export const simulateStreaming = (options: StreamingOptions): (() => void) => {
  const {
    text,
    onChunk,
    onComplete,
    chunkDelayMs = 30,
    startDelayMs = 0,
  } = options;

  let canceled = false;
  let timeoutId: NodeJS.Timeout | null = null;
  let intervalId: NodeJS.Timeout | null = null;

  // 초기 지연 후 시작
  timeoutId = setTimeout(() => {
    if (canceled) return;

    let index = 0;

    // 한 글자씩 처리
    intervalId = setInterval(() => {
      if (canceled) {
        clearInterval(intervalId!);
        return;
      }

      if (index < text.length) {
        // 한국어, 이모지 등을 제대로 처리하기 위해 한 글자 추출
        const char = text[index];
        onChunk(char);
        index++;
      } else {
        // 완료
        clearInterval(intervalId!);
        onComplete();
      }
    }, chunkDelayMs);
  }, startDelayMs);

  // 취소 함수 반환
  return () => {
    canceled = true;
    if (timeoutId) clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
  };
};

/**
 * 문단별로 스트리밍
 * @param options 스트리밍 옵션
 * @returns 취소 함수
 */
export const simulateStreamingByParagraph = (
  options: StreamingOptions
): (() => void) => {
  const {
    text,
    onChunk,
    onComplete,
    chunkDelayMs = 50,
    startDelayMs = 0,
  } = options;

  let canceled = false;
  let timeoutId: NodeJS.Timeout | null = null;

  timeoutId = setTimeout(() => {
    if (canceled) return;

    // 문단 단위로 분할 (줄바꿈 기준)
    const paragraphs = text.split("\n");
    let paragraphIndex = 0;

    const processParagraph = () => {
      if (canceled || paragraphIndex >= paragraphs.length) {
        onComplete();
        return;
      }

      const paragraph = paragraphs[paragraphIndex];
      let charIndex = 0;

      const processChar = () => {
        if (canceled) return;

        if (charIndex < paragraph.length) {
          onChunk(paragraph[charIndex]);
          charIndex++;
          setTimeout(processChar, chunkDelayMs);
        } else {
          // 문단 끝, 줄바꿈 처리
          onChunk("\n");
          paragraphIndex++;
          setTimeout(processParagraph, chunkDelayMs * 2);
        }
      };

      processChar();
    };

    processParagraph();
  }, startDelayMs);

  return () => {
    canceled = true;
    if (timeoutId) clearTimeout(timeoutId);
  };
};

/**
 * 테스트 응답 데이터를 로드
 */
export const loadTestResponses = async () => {
  try {
    const response = await fetch("/test-data/test-responses.json");
    const data = await response.json();
    return data.responses;
  } catch (error) {
    console.error("❌ 테스트 응답 데이터 로드 실패:", error);
    return [];
  }
};

/**
 * 랜덤하게 테스트 응답 선택
 */
export const getRandomTestResponse = async () => {
  const responses = await loadTestResponses();
  if (responses.length === 0) return null;
  return responses[Math.floor(Math.random() * responses.length)];
};
