/**
 * 채팅 세션 관리자
 * 각 채팅 세션의 생명주기와 LangChain 메모리를 관리합니다.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  ChatSession, 
  ChatMessage, 
  LangChainMemory, 
  ConversationMessage, 
  SessionCleanupConfig,
  VibeCraftError,
  ErrorCode,
} from './types.js';
import { mcpClientManager } from './mcp-client.js';

/**
 * 채팅 세션 관리 클래스
 */
export class ChatSessionManager extends EventEmitter {
  private sessions: Map<string, ChatSession> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  
  private readonly config: SessionCleanupConfig = {
    interval: 5 * 60 * 1000,      // 5분마다 정리 작업
    maxInactiveTime: 60 * 60 * 1000,  // 1시간 비활성
    maxSessionAge: 24 * 60 * 60 * 1000  // 24시간 최대 수명
  };

  constructor() {
    super();
    this.startCleanupTimer();
    this.setupMCPEventHandlers();
  }

  /**
   * MCP 클라이언트 이벤트 핸들러 설정
   */
  private setupMCPEventHandlers(): void {
    mcpClientManager.on('text_response', (data) => {
      this.handleMCPResponse(data.sessionId, data.content);
    });

    mcpClientManager.on('client_error', (error) => {
      this.handleMCPError(error);
    });

    mcpClientManager.on('client_disconnected', (data) => {
      console.log(`[Session] MCP 클라이언트 연결 해제: ${data.sessionId}`);
    });
  }

  /**
   * 새로운 채팅 세션 생성
   */
  async createSession(userId?: string): Promise<ChatSession> {
    const sessionId = uuidv4();
    const now = new Date();

    try {
      console.log(`[Session] 새 세션 생성: ${sessionId}`);

      // LangChain 메모리 초기화
      const langChainMemory: LangChainMemory = {
        sessionId,
        conversationHistory: [],
        maxTokens: 4000,
        currentTokens: 0,
        createdAt: now,
        updatedAt: now
      };

      // 세션 객체 생성
      const session: ChatSession = {
        id: sessionId,
        userId: userId || undefined,
        createdAt: now,
        lastActivity: now,
        mcpClient: null,
        langChainMemory,
        isActive: true,
        messageCount: 0
      };

      // MCP 클라이언트 생성
      try {
        const mcpClient = await mcpClientManager.createClient(sessionId);
        session.mcpClient = mcpClient;
      } catch (error) {
        console.warn(`[Session] MCP 클라이언트 생성 실패 (세션: ${sessionId}):`, error);
        // MCP 없이도 세션은 생성됨
      }

      // 세션 저장
      this.sessions.set(sessionId, session);
      this.messages.set(sessionId, []);

      this.emit('session_created', { session });
      console.log(`[Session] 세션 생성 완료: ${sessionId}`);

      return session;

    } catch (error) {
      const sessionError = this.createError(
        'INTERNAL_SERVER_ERROR',
        `세션 생성 실패: ${error instanceof Error ? error.message : String(error)}`,
        { sessionId, userId, error }
      );
      
      console.error(`[Session] ${sessionError.message}`, sessionError.details);
      this.emit('session_error', sessionError);
      throw sessionError;
    }
  }

  /**
   * 세션 조회
   */
  getSession(sessionId: string): ChatSession | null {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      // 마지막 활동 시간 업데이트
      session.lastActivity = new Date();
    }

    return session || null;
  }

  /**
   * 세션 존재 여부 확인
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * 세션에 메시지 추가
   */
  async addMessage(
    sessionId: string, 
    content: string, 
    type: 'user' | 'assistant' | 'system' = 'user',
    userId?: string
  ): Promise<ChatMessage> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw this.createError(
        'SESSION_NOT_FOUND',
        `세션을 찾을 수 없습니다: ${sessionId}`,
        { sessionId }
      );
    }

    const messageId = uuidv4();
    const now = new Date();

    // 메시지 객체 생성
    const message: ChatMessage = {
      id: messageId,
      sessionId,
      userId: userId || undefined,
      content,
      timestamp: now,
      type,
      status: 'sent'
    };

    // 메시지 저장
    const sessionMessages = this.messages.get(sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(sessionId, sessionMessages);

    // 세션 정보 업데이트
    session.lastActivity = now;
    session.messageCount++;

    // LangChain 메모리에 추가
    if (session.langChainMemory) {
      const conversationMessage: ConversationMessage = {
        role: type === 'user' ? 'human' : type === 'assistant' ? 'assistant' : 'system',
        content,
        timestamp: now
      };

      session.langChainMemory.conversationHistory.push(conversationMessage);
      session.langChainMemory.updatedAt = now;
      
      // 토큰 수 추정 (간단한 계산)
      const estimatedTokens = content.length / 4;
      session.langChainMemory.currentTokens += estimatedTokens;

      // 메모리 제한 확인 및 정리
      await this.trimMemoryIfNeeded(session);
    }

    this.emit('message_added', { session, message });

    // 사용자 메시지인 경우 MCP로 전송
    if (type === 'user' && session.mcpClient) {
      try {
        await mcpClientManager.sendMessage(sessionId, content);
        message.status = 'delivered';
      } catch (error) {
        message.status = 'error';
        console.error(`[Session] MCP 메시지 전송 실패 (세션: ${sessionId}):`, error);
      }
    }

    return message;
  }

  /**
   * MCP 응답 처리
   */
  private async handleMCPResponse(sessionId: string, content: string): Promise<void> {
    try {
      const assistantMessage = await this.addMessage(sessionId, content, 'assistant');
      
      this.emit('mcp_response', {
        sessionId,
        message: assistantMessage
      });

      console.log(`[Session] MCP 응답 처리 완료 (세션: ${sessionId})`);

    } catch (error) {
      console.error(`[Session] MCP 응답 처리 오류 (세션: ${sessionId}):`, error);
    }
  }

  /**
   * MCP 에러 처리
   */
  private handleMCPError(error: VibeCraftError): void {
    const sessionId = error.sessionId;
    
    if (sessionId) {
      // 에러 메시지를 세션에 추가
      this.addMessage(
        sessionId, 
        `시스템 오류: ${error.message}`, 
        'system'
      ).catch(err => {
        console.error(`[Session] MCP 에러 메시지 추가 실패:`, err);
      });
    }

    this.emit('mcp_error', error);
  }

  /**
   * 세션 메시지 히스토리 조회
   */
  getSessionMessages(sessionId: string): ChatMessage[] {
    return this.messages.get(sessionId) || [];
  }

  /**
   * 세션 메모리 정리
   */
  private async trimMemoryIfNeeded(session: ChatSession): Promise<void> {
    if (!session.langChainMemory) return;

    const { langChainMemory } = session;
    
    // 토큰 제한 초과 시 오래된 메시지 제거
    if (langChainMemory.currentTokens > langChainMemory.maxTokens) {
      console.log(`[Session] 메모리 정리 시작 (세션: ${session.id})`);
      
      // 시스템 메시지는 보존하고 오래된 대화만 제거
      const systemMessages = langChainMemory.conversationHistory.filter(
        msg => msg.role === 'system'
      );
      
      const conversationMessages = langChainMemory.conversationHistory.filter(
        msg => msg.role !== 'system'
      );

      // 최근 메시지들만 유지 (토큰 기준)
      let currentTokens = 0;
      const recentMessages: ConversationMessage[] = [];
      
      for (let i = conversationMessages.length - 1; i >= 0; i--) {
        const message = conversationMessages[i];
        const messageTokens = message.content.length / 4;
        
        if (currentTokens + messageTokens <= langChainMemory.maxTokens * 0.8) {
          recentMessages.unshift(message);
          currentTokens += messageTokens;
        } else {
          break;
        }
      }

      // 메모리 업데이트
      langChainMemory.conversationHistory = [...systemMessages, ...recentMessages];
      langChainMemory.currentTokens = currentTokens;
      langChainMemory.updatedAt = new Date();

      console.log(`[Session] 메모리 정리 완료 (세션: ${session.id}), 토큰: ${currentTokens}`);
    }
  }

  /**
   * 세션 삭제
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return;
    }

    console.log(`[Session] 세션 삭제: ${sessionId}`);

    try {
      // MCP 클라이언트 정리
      if (session.mcpClient) {
        await mcpClientManager.destroyClient(sessionId);
      }

      // 세션 데이터 삭제
      this.sessions.delete(sessionId);
      this.messages.delete(sessionId);

      this.emit('session_destroyed', { sessionId });

    } catch (error) {
      console.error(`[Session] 세션 삭제 오류 (${sessionId}):`, error);
    }
  }

  /**
   * 정리 타이머 시작
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.interval);

    console.log(`[Session] 정리 타이머 시작 (${this.config.interval / 1000}초 간격)`);
  }

  /**
   * 비활성 세션 정리
   */
  private async performCleanup(): Promise<void> {
    const now = new Date();
    const sessionsToDelete: string[] = [];

    console.log(`[Session] 정리 작업 시작 (총 세션: ${this.sessions.size})`);

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      const sessionAge = now.getTime() - session.createdAt.getTime();

      // 비활성 시간 또는 최대 수명 초과 확인
      if (inactiveTime > this.config.maxInactiveTime || 
          sessionAge > this.config.maxSessionAge) {
        
        console.log(`[Session] 정리 대상: ${sessionId} (비활성: ${Math.round(inactiveTime / 60000)}분)`);
        sessionsToDelete.push(sessionId);
      }
    }

    // 세션 삭제
    for (const sessionId of sessionsToDelete) {
      await this.destroySession(sessionId);
    }

    if (sessionsToDelete.length > 0) {
      console.log(`[Session] 정리 완료: ${sessionsToDelete.length}개 세션 삭제`);
    }
  }

  /**
   * 모든 세션 삭제
   */
  async destroyAllSessions(): Promise<void> {
    console.log('[Session] 모든 세션 삭제 중...');

    const sessionIds = Array.from(this.sessions.keys());
    
    for (const sessionId of sessionIds) {
      await this.destroySession(sessionId);
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    console.log('[Session] 모든 세션 삭제 완료');
  }

  /**
   * 세션 통계 조회
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
  } {
    const totalSessions = this.sessions.size;
    const activeSessions = Array.from(this.sessions.values()).filter(
      session => session.isActive
    ).length;
    
    const totalMessages = Array.from(this.messages.values()).reduce(
      (sum, messages) => sum + messages.length, 0
    );

    const averageMessagesPerSession = totalSessions > 0 
      ? Math.round(totalMessages / totalSessions) 
      : 0;

    return {
      totalSessions,
      activeSessions,
      totalMessages,
      averageMessagesPerSession
    };
  }

  /**
   * 모든 세션 목록 조회
   */
  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 사용자별 세션 조회
   */
  getUserSessions(userId: string): ChatSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.userId === userId
    );
  }

  /**
   * 에러 객체 생성 헬퍼
   */
  private createError(code: ErrorCode, message: string, details?: any): VibeCraftError {
    return {
      code,
      message,
      details,
      timestamp: new Date()
    };
  }
}

// 싱글톤 인스턴스 생성
export const chatSessionManager = new ChatSessionManager();