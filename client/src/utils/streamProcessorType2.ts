// // 실시간 스트림 SSE 이벤트 타입
// export interface StreamSSEEventType2 {
//   event: string;
//   data: string; // 각 data 라인을 개별적으로 처리
//   isComplete: boolean; // 해당 이벤트의 데이터가 완료되었는지
// }

// // SSE 이벤트 처리 콜백 타입
// export type StreamEventHandler = (event: StreamSSEEventType2) => Promise<void> | void;

// // 스트림 상태 관리 클래스
// class StreamProcessor {
//   private currentEvent: string | null = null;
//   private eventBuffer: string[] = [];
//   private buffer = '';
//   private isProcessing = false;

//   constructor(private onEvent: StreamEventHandler) {}

//   // 한 줄씩 처리
//   async processLine(line: string): Promise<void> {
//     if (line.startsWith('event:')) {
//       // 이전 이벤트 완료 처리
//       await this.completeCurrentEvent();

//       // 새 이벤트 시작
//       this.currentEvent = line.substring(6).trim();
//       this.eventBuffer = [];
//       console.log('🎯 새 이벤트 시작:', this.currentEvent);

//     } else if (line.startsWith('data:')) {
//       const dataContent = line.substring(5).trim();

//       if (this.currentEvent) {
//         this.eventBuffer.push(dataContent);

//         // 즉시 개별 data 라인 처리
//         await this.onEvent({
//           event: this.currentEvent,
//           data: dataContent,
//           isComplete: false
//         });

//         console.log(`📦 ${this.currentEvent} 데이터:`, dataContent);
//       }

//     } else if (line.trim() === '') {
//       // 빈 라인 - 이벤트 완료 신호
//       await this.completeCurrentEvent();
//     }
//   }

//   // 현재 이벤트 완료 처리
//   private async completeCurrentEvent(): Promise<void> {
//     if (this.currentEvent && this.eventBuffer.length > 0) {
//       console.log(`✅ ${this.currentEvent} 이벤트 완료:`, this.eventBuffer.length, '개 데이터');

//       // 완료 신호 전송
//       await this.onEvent({
//         event: this.currentEvent,
//         data: this.eventBuffer.join('\n'), // 전체 데이터를 합쳐서 전송
//         isComplete: true
//       });

//       // 상태 초기화
//       this.currentEvent = null;
//       this.eventBuffer = [];
//     }
//   }

//   // 스트림 종료 시 정리
//   async finalize(): Promise<void> {
//     await this.completeCurrentEvent();
//     console.log('🏁 스트림 처리기 종료');
//   }
// }

// // Type2 스트림 읽기 함수 (실시간 처리)
// export const readStreamType2 = async (
//   response: Response,
//   onEvent: StreamEventHandler
// ): Promise<void> => {
//   if (!response.body) {
//     throw new Error('응답 스트림을 받을 수 없습니다.');
//   }

//   const reader = response.body.getReader();
//   const decoder = new TextDecoder();
//   const processor = new StreamProcessor(onEvent);

//   let buffer = '';

//   try {
//     console.log('🚀 Type2 스트림 처리 시작');

//     while (true) {
//       const { value, done } = await reader.read();

//       if (done) {
//         // 스트림 완료 - 남은 버퍼 처리
//         if (buffer.trim()) {
//           const lines = buffer.split('\n');
//           for (const line of lines) {
//             if (line.trim()) {
//               await processor.processLine(line);
//             }
//           }
//         }

//         await processor.finalize();
//         console.log('🏁 Type2 스트림 완료');
//         break;
//       }

//       // 청크 디코딩 및 버퍼에 추가
//       buffer += decoder.decode(value, { stream: true });

//       // 완전한 라인들 처리
//       const lines = buffer.split('\n');

//       // 마지막 라인은 불완전할 수 있으므로 버퍼에 보관
//       buffer = lines.pop() || '';

//       // 완전한 라인들 순차 처리
//       for (const line of lines) {
//         await processor.processLine(line);
//       }
//     }
//   } finally {
//     reader.releaseLock();
//   }
// };

// // 병렬 처리가 필요한 경우를 위한 NonBlocking 버전
// export const readStreamType2NonBlocking = async (
//   response: Response,
//   onEvent: StreamEventHandler
// ): Promise<void> => {
//   if (!response.body) {
//     throw new Error('응답 스트림을 받을 수 없습니다.');
//   }

//   const reader = response.body.getReader();
//   const decoder = new TextDecoder();
//   const processor = new StreamProcessor(onEvent);

//   let buffer = '';

//   try {
//     console.log('🚀 Type2 NonBlocking 스트림 처리 시작');

//     while (true) {
//       const { value, done } = await reader.read();

//       if (done) {
//         // 스트림 완료 - 남은 버퍼 처리
//         if (buffer.trim()) {
//           const lines = buffer.split('\n');
//           for (const line of lines) {
//             if (line.trim()) {
//               // Non-blocking 처리
//               processor.processLine(line).catch(error => {
//                 console.error('❌ 라인 처리 오류:', error);
//               });
//             }
//           }
//         }

//         await processor.finalize();
//         console.log('🏁 Type2 NonBlocking 스트림 완료');
//         break;
//       }

//       // 청크 디코딩 및 버퍼에 추가
//       buffer += decoder.decode(value, { stream: true });

//       // 완전한 라인들 처리
//       const lines = buffer.split('\n');

//       // 마지막 라인은 불완전할 수 있으므로 버퍼에 보관
//       buffer = lines.pop() || '';

//       // 완전한 라인들 병렬 처리 (순서 보장 안됨)
//       const processPromises = lines.map(line => {
//         if (line.trim()) {
//           return processor.processLine(line).catch(error => {
//             console.error('❌ 라인 처리 오류:', error);
//           });
//         }
//         return Promise.resolve();
//       });

//       // 모든 라인 처리 완료까지 대기하지 않고 계속 진행
//       Promise.all(processPromises).catch(error => {
//         console.error('❌ 라인 처리 배치 오류:', error);
//       });
//     }
//   } finally {
//     reader.releaseLock();
//   }
// };

// // 이벤트별 개별 핸들러를 위한 래퍼
// export class StreamEventRouter {
//   private handlers: Map<string, StreamEventHandler[]> = new Map();

//   // 특정 이벤트 타입에 대한 핸들러 등록
//   on(eventType: string, handler: StreamEventHandler): void {
//     if (!this.handlers.has(eventType)) {
//       this.handlers.set(eventType, []);
//     }
//     this.handlers.get(eventType)!.push(handler);
//   }

//   // 이벤트 처리
//   async handleEvent(event: StreamSSEEventType2): Promise<void> {
//     const handlers = this.handlers.get(event.event);
//     if (handlers) {
//       // 등록된 모든 핸들러 실행
//       await Promise.all(handlers.map(handler => handler(event)));
//     } else {
//       console.log('🔄 처리되지 않은 이벤트:', event.event, event.data);
//     }
//   }

//   // 라우터를 사용한 스트림 처리
//   async processStream(response: Response): Promise<void> {
//     await readStreamType2(response, (event) => this.handleEvent(event));
//   }
// }

// // 사용 예시:
// /*
// const router = new StreamEventRouter();

// // AI 응답 처리
// router.on('ai', (event) => {
//   if (!event.isComplete) {
//     // 실시간 데이터 처리
//     console.log('AI 응답 스트림:', event.data);
//     updateUIIncrementally(event.data);
//   } else {
//     // 완료된 응답 처리
//     console.log('AI 응답 완료:', event.data);
//     finalizeAIResponse(event.data);
//   }
// });

// // 데이터 테이블 처리
// router.on('data', (event) => {
//   if (!event.isComplete) {
//     // 테이블 데이터 한 줄씩 처리
//     console.log('데이터 라인:', event.data);
//     addTableRow(event.data);
//   } else {
//     // 테이블 완료 처리
//     console.log('테이블 완료');
//     finalizeTable();
//   }
// });

// // 완료 이벤트 처리
// router.on('complete', (event) => {
//   if (event.isComplete) {
//     const threadId = event.data;
//     handleCompleteEvent(threadId);
//   }
// });

// // 스트림 처리 시작
// await router.processStream(response);
// */
