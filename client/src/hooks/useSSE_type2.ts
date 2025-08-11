// import { useState, useEffect, useCallback, useRef } from "react";
// import {
//   ThreadState,
//   ProcessStatus,
//   InputType,
//   SSEConnectionState,
// } from "../types/session";
// import { getNextProcessStatus } from "@/utils/processStatus";
// import {
//   ApiEndpoint,
//   API_ENDPOINTS,
//   getApiResponse,
//   fetchTableMetadata,
// } from "@/utils/apiEndpoints";
// import {
//   readStreamType2,
//   StreamSSEEventType2,
//   StreamEventRouter
// } from "@/utils/streamProcessorType2";
// import { generateId } from "@/stores/chatStore";
// import { useChatStore } from "@/stores/chatStore";
// import { useChannel } from "./useChannel";

// // Export types
// export type { StreamSSEEventType2 } from "@/utils/streamProcessorType2";

// // 컴포넌트 타입 정의
// export type ComponentType =
//   | "MENU"
//   | "DATA_UPLOAD"
//   | "BUILD_RESULT"
//   | "DEPLOY_STATUS"
//   | "DATA_TABLE";

// // 테이블 메타데이터 타입
// export interface TableMetadata {
//   created_at: string;
//   column_mapping: Record<string, string>; // "상호명" -> "Store_Name"
// }

// // 테이블 데이터 타입
// export interface TableData {
//   title: string; // "📊 최종 데이터프레임 요약:"
//   rawHeaders: string[]; // ["상호명", "주소_동", "위도", ...]
//   englishHeaders: string[]; // ["Store_Name", "Address_Dong", ...]
//   rows: string[][]; // 파싱된 데이터 행들
//   metadata: TableMetadata; // 메타데이터
//   threadId: string; // 어떤 thread의 데이터인지
// }

// // SSE 메시지 타입
// export interface SSEMessage {
//   messageId: string;
//   threadId: string;
//   timestamp?: Date;
//   type: "human" | "ai";
//   content: string | string[] | TableData;
//   componentType?: ComponentType;
// }

// // useSSE 훅 설정 타입
// export interface UseSSEType2Config {
//   serverUrl: string;
//   threadId?: string;
//   autoConnect?: boolean;
//   autoRestore?: boolean;
//   maxRetries?: number;
//   retryInterval?: number;
// }

// // useSSE 훅 반환 타입
// export interface UseSSEType2Return {
//   // 상태
//   threadState: ThreadState;
//   connectionState: SSEConnectionState;
//   inputType: InputType;
//   processStatus: ProcessStatus;
//   channelId?: string;
//   messages: SSEMessage[];
//   chatItems: any[];

//   // 액션
//   switchChannel: (channelId: string) => void;
//   addMessage: (
//     message: string | string[],
//     type: "human" | "ai",
//     componentType?: ComponentType
//   ) => void;
//   setNextProcessStatus: () => void;
//   sendMessage: (message: string) => Promise<boolean>;
//   startNewChat: () => void;
//   fetchProcess: (status: ProcessStatus) => void;
// }

// export const useSSEType2 = (config: UseSSEType2Config): UseSSEType2Return => {
//   const { serverUrl, threadId: providedThreadId, autoRestore = true } = config;

//   // 채널 관리 훅
//   const {
//     chatItems,
//     currentChannelId,
//     lastThreadId,
//     createNewChannel,
//     switchChannel,
//     updateChannel,
//     updateChatChannel,
//     startNewChat: storeStartNewChat,
//     saveCurrentMessages,
//     loadChannelMessages,
//   } = useChannel();

//   // 초기 데이터 로드만 직접 사용
//   const { loadInitialData } = useChatStore();

//   // 로컬 상태 (UI 관련)
//   const [threadState, setThreadState] = useState<ThreadState>("IDLE");
//   const [connectionState, setConnectionState] =
//     useState<SSEConnectionState>("DISCONNECTED");
//   const [inputType] = useState<InputType>("TEXT");
//   const [processStatus, setProcessStatus] = useState<ProcessStatus>("TOPIC");

//   // 테이블 데이터 임시 저장 상태
//   const [pendingTableData, setPendingTableData] = useState<string[] | null>(null);

//   // Type2: 실시간 AI 응답 버퍼
//   const [streamingMessage, setStreamingMessage] = useState<string>("");
//   const [isStreaming, setIsStreaming] = useState<boolean>(false);

//   // 응답 버퍼 - 응답 임시 저장 후 thread ID update 와 함께 messageBuffer로 전달
//   const [responseBuffer, setResponseBuffer] = useState<SSEMessage[]>([]);
//   // 메시지 버퍼 - 임시로 저장 (채팅 채널이 변경되기 전까지 메시지를 유지)
//   const [messageBuffer, setMessageBuffer] = useState<SSEMessage[]>([]);

//   // threadId는 개별 메시지용, channelId는 전체 세션용으로 분리
//   const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();
//   const [channelId, setChannelId] = useState<string>();

//   // 스트림 이벤트 라우터 ref
//   const eventRouterRef = useRef<StreamEventRouter>(new StreamEventRouter());

//   // 메시지 추가 헬퍼 - messageBuffer에 추가 후 채널 변경시 저장
//   const addMessage = useCallback(
//     (
//       message: string | string[],
//       type: "human" | "ai",
//       componentType?: ComponentType
//     ) => {
//       console.log("📥 메시지 추가:", message);

//       const myMessage: SSEMessage = {
//         messageId: generateId(),
//         threadId: currentThreadId || "", // 현재 활성 스레드 ID 사용
//         content: message,
//         timestamp: new Date(),
//         componentType,
//         type: type,
//       };
//       setMessageBuffer((prev) => [...prev, myMessage]);
//     },
//     [currentThreadId]
//   );

//   const addResponseMessage = useCallback(
//     (
//       message: string | string[] | TableData,
//       type: "human" | "ai",
//       componentType?: ComponentType
//     ) => {
//       console.log("📥 응답 메시지 추가:", message);

//       const myMessage: SSEMessage = {
//         messageId: generateId(),
//         threadId: currentThreadId || "", // 현재 활성 스레드 ID 사용
//         content: message,
//         timestamp: new Date(),
//         componentType,
//         type: type,
//       };
//       setResponseBuffer((prev) => [...prev, myMessage]);
//     },
//     [currentThreadId]
//   );

//   const setNextProcessStatus = useCallback(() => {
//     // 다음 프로세스 단계로 자동 진행
//     const nextProcess = getNextProcessStatus(processStatus);
//     if (nextProcess !== processStatus) {
//       setProcessStatus(nextProcess);
//       console.log(
//         "📊 다음 프로세스 단계로 진행:",
//         processStatus,
//         "→",
//         nextProcess
//       );

//       // 현재 채널이 있으면 storage 업데이트
//       if (channelId) {
//         updateChatChannel(channelId, "", nextProcess);
//         console.log("💾 채널 프로세스 상태 업데이트:", channelId, nextProcess);
//       }
//     }
//   }, [processStatus, channelId, updateChatChannel]);

//   // 채널 변경 핸들러
//   const handleSwitchChannel = useCallback(
//     (channelId: string) => {
//       setThreadState("IDLE");
//       setChannelId(channelId);
//       switchChannel(channelId);
//     },
//     [switchChannel]
//   );

//   // Type2: 실시간 AI 응답 처리
//   const handleAIStreamEvent = useCallback(
//     (event: StreamSSEEventType2, componentType?: ComponentType) => {
//       if (!event.isComplete) {
//         // 실시간 스트리밍 - 한 단어씩 추가
//         setIsStreaming(true);
//         setStreamingMessage((prev) => prev + event.data + " ");
//         console.log("🤖 AI 응답 스트림:", event.data);
//       } else {
//         // 스트리밍 완료 - 최종 메시지 저장
//         const finalContent = componentType ? event.data : streamingMessage + event.data;
//         addResponseMessage(finalContent, "ai", componentType);

//         // 스트리밍 상태 초기화
//         setIsStreaming(false);
//         setStreamingMessage("");

//         console.log("✅ AI 응답 완료:", finalContent);
//       }
//     },
//     [streamingMessage, addResponseMessage]
//   );

//   // Type2: 데이터 테이블 실시간 처리
//   const handleDataStreamEvent = useCallback(
//     (event: StreamSSEEventType2) => {
//       if (!event.isComplete) {
//         // 데이터 라인 실시간 수집
//         setPendingTableData((prev) => {
//           const newData = prev ? [...prev, event.data] : [event.data];
//           console.log("📊 테이블 데이터 라인 추가:", event.data);
//           return newData;
//         });
//       } else {
//         // 데이터 수집 완료
//         console.log("✅ 테이블 데이터 수집 완료");
//       }
//     },
//     []
//   );

//   // Type2: 완료 이벤트 처리
//   const handleCompleteStreamEvent = useCallback(
//     (event: StreamSSEEventType2) => {
//       if (event.isComplete) {
//         const newThreadId = event.data;
//         setCurrentThreadId(newThreadId);

//         console.log("🎯 Complete 이벤트:", processStatus, newThreadId);

//         switch (processStatus) {
//           case "TOPIC":
//             if (channelId) {
//               updateChannel(channelId, newThreadId, "TOPIC", "submit api 적용예정");
//             }
//             break;
//           case "DATA":
//             if (channelId) {
//               updateChannel(channelId, newThreadId, "DATA");
//             }
//             break;
//           case "BUILD":
//             break;
//           case "DEPLOY":
//             break;
//           default:
//             console.warn("알 수 없는 프로세스 상태:", processStatus);
//         }

//         setThreadState("READY");
//         setConnectionState("CONNECTED");
//       }
//     },
//     [processStatus, channelId, updateChannel]
//   );

//   // 테이블 데이터 처리 함수
//   const processTableData = useCallback(
//     async (rawTableData: string[], threadId: string) => {
//       try {
//         console.log("📊 테이블 데이터 처리 시작:", threadId);

//         // 1. 메타데이터 API 호출
//         const metadata = await fetchTableMetadata(serverUrl, threadId);

//         // 2. 원본 데이터 파싱
//         const [title, headerLine, ...dataLines] = rawTableData;

//         // 3. 헤더 파싱 (메타데이터 기준)
//         const rawHeaders = Object.keys(metadata.column_mapping);

//         // 4. 데이터 행 파싱
//         const rows = dataLines.map((line) => {
//           const parts = line.trim().split(/\s+/);
//           return parts;
//         });

//         // 5. TableData 생성
//         const tableData: TableData = {
//           title,
//           rawHeaders,
//           englishHeaders: rawHeaders.map(
//             (h) => metadata.column_mapping[h] || h
//           ),
//           rows,
//           metadata,
//           threadId,
//         };

//         // 6. 응답 메시지로 추가
//         addResponseMessage(tableData, "ai", "DATA_TABLE");

//         console.log("✅ 테이블 데이터 처리 완료:", tableData);
//       } catch (error) {
//         console.error("❌ 테이블 데이터 처리 실패:", error);

//         // 실패시 원본 텍스트로 fallback
//         const fallbackContent = rawTableData.join("\n");
//         addResponseMessage(fallbackContent, "ai");
//       }
//     },
//     [serverUrl, addResponseMessage]
//   );

//   // Type2: 스트림 이벤트 라우터 설정
//   useEffect(() => {
//     const router = eventRouterRef.current;

//     // AI 응답 처리
//     router.on('ai', (event) => handleAIStreamEvent(event));

//     // 메뉴 응답 처리
//     router.on('menu', (event) => handleAIStreamEvent(event, "MENU"));

//     // 데이터 테이블 처리
//     router.on('data', (event) => handleDataStreamEvent(event));

//     // 완료 이벤트 처리
//     router.on('complete', (event) => handleCompleteStreamEvent(event));

//     return () => {
//       // cleanup - 새 라우터 인스턴스 생성
//       eventRouterRef.current = new StreamEventRouter();
//     };
//   }, [handleAIStreamEvent, handleDataStreamEvent, handleCompleteStreamEvent]);

//   // API 별 파라미터 custom
//   const getAdditionParams = useCallback(
//     (message: string): Record<string, string> | undefined => {
//       switch (processStatus) {
//         case "TOPIC":
//           return { query: message };
//         case "DATA":
//           return currentThreadId ? { thread_id: currentThreadId } : undefined;
//         case "DATA_PROCESS":
//           return currentThreadId
//             ? { thread_id: currentThreadId, query: message }
//             : undefined;
//         default:
//           return {};
//       }
//     },
//     [processStatus, currentThreadId]
//   );

//   // Type2: 메시지 전송
//   const sendMessage = useCallback(
//     async (message: string): Promise<boolean> => {
//       console.log("📤 Type2 메시지 전송 요청:", message);

//       try {
//         let activeChannelId = channelId;

//         // 채널이 없으면 임시 채널 생성
//         if (!channelId) {
//           console.log("🆕 새 채널로 메시지 전송...");
//           activeChannelId = `temp-${generateId()}`;

//           createNewChannel(activeChannelId, message);
//           setChannelId(activeChannelId);
//           setConnectionState("CREATING_THREAD");
//           setThreadState("CONNECTING");
//         }

//         if (!activeChannelId) {
//           throw new Error("채팅 생성에 오류가 발생했습니다.");
//         }

//         // 사용자 메시지 즉시 표시
//         addMessage(message, "human");

//         setThreadState("SENDING");

//         // API 호출
//         const response = await getApiResponse(
//           serverUrl,
//           API_ENDPOINTS[processStatus],
//           getAdditionParams(message)
//         );

//         if (!response.body) {
//           throw new Error("응답 스트림을 받을 수 없습니다.");
//         }

//         // Type2 스트림 처리
//         setThreadState("RECEIVING");
//         setConnectionState("CONNECTED");

//         // 스트림 이벤트 라우터를 통한 처리
//         await eventRouterRef.current.processStream(response);

//         // 실제 채널에서 메시지를 보낸 경우에만 ChatItem 업데이트
//         if (activeChannelId && !activeChannelId.startsWith("temp-")) {
//           updateChatChannel(activeChannelId, message, processStatus);
//           console.log("📝 기존 채널 ChatItem 업데이트:", activeChannelId);
//         }

//         return true;
//       } catch (error) {
//         console.error("❌ Type2 스트림 처리 오류:", error);

//         // 에러 발생시 responseBuffer 초기화
//         setResponseBuffer([]);
//         setIsStreaming(false);
//         setStreamingMessage("");
//         console.log("🗑️ 에러로 인한 버퍼 초기화");

//         setConnectionState("ERROR");
//         setThreadState("ERROR");
//         return false;
//       }
//     },
//     [
//       serverUrl,
//       channelId,
//       processStatus,
//       addMessage,
//       updateChatChannel,
//       createNewChannel,
//       getAdditionParams,
//     ]
//   );

//   // 프로세스 변경
//   const fetchProcess = useCallback(
//     (status: ProcessStatus) => {
//       console.log("🔄 프로세스 변경:", processStatus, "→", status);
//       setProcessStatus(status);
//     },
//     [processStatus]
//   );

//   // 새 채팅 시작
//   const startNewChat = useCallback(async () => {
//     console.log("🆕 Type2 새 채팅 시작");

//     // 현재 메시지들 저장 후 초기화
//     if (channelId && messageBuffer.length > 0) {
//       await saveCurrentMessages(messageBuffer, channelId);
//     }

//     storeStartNewChat();
//     setChannelId(undefined);
//     setCurrentThreadId(undefined);
//     setMessageBuffer([]);
//     setResponseBuffer([]);
//     setPendingTableData(null);
//     setStreamingMessage("");
//     setIsStreaming(false);
//     setProcessStatus("TOPIC");
//     setThreadState("IDLE");
//     setConnectionState("DISCONNECTED");
//   }, [
//     storeStartNewChat,
//     channelId,
//     messageBuffer,
//     saveCurrentMessages,
//   ]);

//   // currentChannelId 변경시 store와 동기화 및 채널 메시지 로드
//   useEffect(() => {
//     const setStatueSynchronize = async () => {
//       if (currentChannelId) {
//         if (currentChannelId && channelId && channelId !== currentChannelId) {
//           // 이전 채널 메시지 저장
//           if (messageBuffer.length > 0) {
//             await saveCurrentMessages(messageBuffer, channelId);
//           }
//         }

//         // 실제 채널의 메시지 로드
//         const messages = await loadChannelMessages(currentChannelId);
//         setMessageBuffer(messages);

//         console.log(
//           "✅ Type2 채널 전환 및 메시지 로드 완료:",
//           currentChannelId,
//           messages.length,
//           "개"
//         );
//       }
//     };

//     setStatueSynchronize();
//   }, [currentChannelId]);

//   // currentThreadId 변경시 responseBuffer를 messageBuffer로 이관
//   useEffect(() => {
//     if (currentThreadId && responseBuffer.length > 0) {
//       console.log(
//         "📬 Type2 응답 버퍼를 메시지 버퍼로 이관 시작:",
//         responseBuffer.length,
//         "개"
//       );

//       // responseBuffer의 모든 메시지를 messageBuffer로 이관
//       setMessageBuffer((prev) => [
//         ...prev,
//         ...responseBuffer.map((msg) => ({
//           ...msg,
//           threadId: currentThreadId,
//         })),
//       ]);

//       // responseBuffer 초기화
//       setResponseBuffer([]);

//       console.log("✅ Type2 응답 버퍼를 메시지 버퍼로 이관 완료");
//     }
//   }, [currentThreadId, responseBuffer]);

//   // pendingTableData 처리
//   useEffect(() => {
//     if (currentThreadId && pendingTableData) {
//       processTableData(pendingTableData, currentThreadId);
//       setPendingTableData(null);
//     }
//   }, [currentThreadId, pendingTableData, processTableData]);

//   // 초기화
//   const initializedRef = useRef(false);
//   useEffect(() => {
//     if (!initializedRef.current) {
//       loadInitialData();
//       initializedRef.current = true;
//     }
//   }, [loadInitialData]);

//   // Type2: 실시간 스트리밍 메시지를 messages에 포함
//   const allMessages = [...messageBuffer];
//   if (isStreaming && streamingMessage) {
//     allMessages.push({
//       messageId: 'streaming',
//       threadId: currentThreadId || '',
//       content: streamingMessage,
//       timestamp: new Date(),
//       type: 'ai' as const,
//     });
//   }

//   return {
//     // 상태
//     threadState,
//     connectionState,
//     inputType,
//     processStatus,
//     channelId: channelId,
//     messages: allMessages,
//     chatItems,

//     // 액션
//     switchChannel: handleSwitchChannel,
//     addMessage,
//     setNextProcessStatus,
//     sendMessage,
//     startNewChat,
//     fetchProcess,
//   };
// };
