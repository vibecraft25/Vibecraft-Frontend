// 스트림 SSE 이벤트 타입
export interface StreamSSEEvent {
  event: string;
  data: string[]; // 여러 data 라인을 배열로 저장
}

// SSE 스트림 파싱 함수
export const parseSSEStream = (streamText: string): StreamSSEEvent[] => {
  const events: StreamSSEEvent[] = [];
  const lines = streamText.split('\n');
  
  let currentEvent: string | null = null;
  let currentData: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      // 이전 이벤트가 있으면 저장
      if (currentEvent !== null) {
        events.push({
          event: currentEvent,
          data: [...currentData],
        });
      }

      // 새 이벤트 시작
      currentEvent = line.substring(6).trim();
      currentData = [];
    } else if (line.startsWith('data:')) {
      // 현재 이벤트의 데이터 라인 추가
      const dataContent = line.substring(5).trim();
      currentData.push(dataContent);
    } else if (line.trim() === '' && currentEvent !== null) {
      // 빈 라인은 이벤트 구분자가 될 수 있음
      continue;
    }
  }

  // 마지막 이벤트 처리
  if (currentEvent !== null) {
    events.push({
      event: currentEvent,
      data: [...currentData],
    });
  }

  return events;
};

// 스트림 버퍼 처리 함수
export const processStreamBuffer = (
  buffer: string
): { processedEvents: StreamSSEEvent[]; remainingBuffer: string } => {
  const events: StreamSSEEvent[] = [];
  let remainingBuffer = buffer;

  // 완전한 이벤트 블록만 추출 (이벤트-데이터-빈라인 패턴)
  const eventBlocks = buffer.split(/\n\s*\n/);

  if (eventBlocks.length > 1) {
    // 마지막 블록은 불완전할 수 있으므로 버퍼에 보관
    remainingBuffer = eventBlocks.pop() || '';

    // 완전한 블록들 처리
    for (const block of eventBlocks) {
      if (block.trim()) {
        const parsedEvents = parseSSEStream(block + '\n\n');
        events.push(...parsedEvents);
      }
    }
  }

  return { processedEvents: events, remainingBuffer };
};

// 스트림 읽기 함수
export const readStream = async (
  response: Response,
  onEvent: (event: StreamSSEEvent) => Promise<void>
): Promise<void> => {
  if (!response.body) {
    throw new Error('응답 스트림을 받을 수 없습니다.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        console.log('🏁 스트림 완료');
        break;
      }

      // 청크 디코딩 및 버퍼에 추가
      buffer += decoder.decode(value, { stream: true });

      // 완전한 이벤트들만 처리하고 불완전한 부분은 버퍼에 보관
      const { processedEvents, remainingBuffer } = processStreamBuffer(buffer);
      buffer = remainingBuffer;

      // 이벤트 처리
      for (const event of processedEvents) {
        await onEvent(event);
      }
    }
  } finally {
    reader.releaseLock();
  }
};