/**
 * VibeCraft WebSocket 서버
 * 채팅 세션별 독립적인 MCP 통신을 지원하는 WebSocket 서버
 */

import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  WebSocketMessage,
  WebSocketResponse,
  WebSocketConnection,
  ServerConfig,
  VibeCraftError,
  MESSAGE_TYPES
} from './types.js';
import { chatSessionManager } from './chat-session-manager.js';
import { mcpClientManager } from './mcp-client.js';

/**
 * WebSocket 서버 클래스
 */
export class VibeCraftWebSocketServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private connections: Map<string, WebSocketConnection> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  private readonly config: ServerConfig = {
    port: 8080,
    corsOrigins: ['http://localhost:3000', 'http://localhost:5173'],
    sessionTimeout: 60 * 60 * 1000, // 1시간
    maxConnectionsPerSession: 5,
    maxMessageLength: 10000,
    rateLimitWindow: 60 * 1000, // 1분
    rateLimitMax: 30, // 분당 30개 메시지
    enableLogging: true,
    logLevel: 'info'
  };

  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.app = express();
    this.setupExpress();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    });
    
    this.setupWebSocket();
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  /**
   * Express 서버 설정
   */
  private setupExpress(): void {
    // CORS 설정
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true
    }));

    this.app.use(express.json());
    this.app.use(express.static('public'));

    // 헬스 체크 엔드포인트
    this.app.get('/health', (req, res) => {
      const stats = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connections: this.connections.size,
        sessions: chatSessionManager.getStats(),
        mcpClients: mcpClientManager.getActiveClientCount()
      };
      
      res.json(stats);
    });

    // 세션 정보 조회 엔드포인트
    this.app.get('/sessions', (req, res) => {
      const stats = chatSessionManager.getStats();
      res.json(stats);
    });

    // 연결 정보 조회 엔드포인트
    this.app.get('/connections', (req, res) => {
      const connectionStats = {
        total: this.connections.size,
        active: Array.from(this.connections.values()).filter(conn => conn.isAlive).length,
        connections: Array.from(this.connections.values()).map(conn => ({
          id: conn.id,
          sessionId: conn.sessionId,
          userId: conn.userId,
          connectedAt: conn.connectedAt,
          lastActivity: conn.lastActivity,
          isAlive: conn.isAlive
        }))
      };
      
      res.json(connectionStats);
    });
  }

  /**
   * WebSocket 서버 설정
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const connectionId = uuidv4();
      const clientIP = req.socket.remoteAddress || 'unknown';
      
      console.log(`[WS] 새 연결: ${connectionId} (IP: ${clientIP})`);

      // 연결 객체 생성
      const connection: WebSocketConnection = {
        id: connectionId,
        socket: ws,
        connectedAt: new Date(),
        lastActivity: new Date(),
        isAlive: true
      };

      this.connections.set(connectionId, connection);

      // WebSocket 이벤트 핸들러 설정
      this.setupWebSocketEvents(connection);

      // 연결 확인 메시지 전송
      this.sendMessage(connection, {
        type: 'joined',
        sessionId: '',
        message: 'WebSocket 연결이 설정되었습니다',
        timestamp: new Date().toISOString()
      });
    });

    console.log(`[WS] WebSocket 서버 설정 완료 (경로: /ws)`);
  }

  /**
   * WebSocket 연결별 이벤트 핸들러 설정
   */
  private setupWebSocketEvents(connection: WebSocketConnection): void {
    const { socket, id: connectionId } = connection;

    // 메시지 수신 처리
    socket.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        await this.handleMessage(connection, message);
      } catch (error) {
        console.error(`[WS] 메시지 파싱 오류 (연결: ${connectionId}):`, error);
        this.sendError(connection, 'INVALID_MESSAGE', '잘못된 메시지 형식입니다');
      }
    });

    // 연결 종료 처리
    socket.on('close', (code: number, reason: Buffer) => {
      console.log(`[WS] 연결 종료: ${connectionId} (코드: ${code}, 이유: ${reason.toString()})`);
      this.handleDisconnection(connection);
    });

    // 에러 처리
    socket.on('error', (error: Error) => {
      console.error(`[WS] WebSocket 오류 (연결: ${connectionId}):`, error);
      this.handleDisconnection(connection);
    });

    // Ping/Pong 처리
    socket.on('pong', () => {
      connection.isAlive = true;
      connection.lastActivity = new Date();
    });
  }

  /**
   * 메시지 처리
   */
  private async handleMessage(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    const { id: connectionId } = connection;
    
    try {
      // Rate limiting 확인
      if (!this.checkRateLimit(connectionId)) {
        this.sendError(connection, 'RATE_LIMIT_EXCEEDED', '메시지 전송 제한을 초과했습니다');
        return;
      }

      // 메시지 길이 확인
      if (message.content && message.content.length > this.config.maxMessageLength) {
        this.sendError(connection, 'INVALID_MESSAGE', '메시지가 너무 깁니다');
        return;
      }

      // 마지막 활동 시간 업데이트
      connection.lastActivity = new Date();

      console.log(`[WS] 메시지 수신 (연결: ${connectionId}): ${message.type}`);

      // 메시지 타입별 처리
      switch (message.type) {
        case MESSAGE_TYPES.JOIN_CHAT:
          await this.handleJoinChat(connection, message);
          break;

        case MESSAGE_TYPES.CHAT_MESSAGE:
          await this.handleChatMessage(connection, message);
          break;

        case MESSAGE_TYPES.LEAVE_CHAT:
          await this.handleLeaveChat(connection, message);
          break;

        default:
          this.sendError(connection, 'INVALID_MESSAGE', `알 수 없는 메시지 타입: ${message.type}`);
      }

    } catch (error) {
      console.error(`[WS] 메시지 처리 오류 (연결: ${connectionId}):`, error);
      this.sendError(
        connection, 
        'INTERNAL_SERVER_ERROR', 
        '메시지 처리 중 오류가 발생했습니다'
      );
    }
  }

  /**
   * 채팅 참여 처리
   */
  private async handleJoinChat(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    let sessionId = message.sessionId;
    let session;

    try {
      // 세션이 없거나 존재하지 않으면 새로 생성
      if (!sessionId || !chatSessionManager.hasSession(sessionId)) {
        session = await chatSessionManager.createSession(message.userId);
        sessionId = session.id;
        
        this.sendMessage(connection, {
          type: 'session_created',
          sessionId,
          message: '새로운 채팅 세션이 생성되었습니다',
          timestamp: new Date().toISOString()
        });
      } else {
        session = chatSessionManager.getSession(sessionId);
      }

      // 연결에 세션 정보 저장
      connection.sessionId = sessionId;
      connection.userId = message.userId;

      // 참여 완료 응답
      this.sendMessage(connection, {
        type: 'joined',
        sessionId,
        message: '채팅에 참여했습니다',
        timestamp: new Date().toISOString(),
        userId: message.userId
      });

      console.log(`[WS] 채팅 참여 완료 (연결: ${connection.id}, 세션: ${sessionId})`);

    } catch (error) {
      console.error(`[WS] 채팅 참여 오류 (연결: ${connection.id}):`, error);
      this.sendError(connection, 'INTERNAL_SERVER_ERROR', '채팅 참여에 실패했습니다');
    }
  }

  /**
   * 채팅 메시지 처리
   */
  private async handleChatMessage(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    const { sessionId, content, userId } = message;

    if (!sessionId || !content) {
      this.sendError(connection, 'INVALID_MESSAGE', '세션 ID와 메시지 내용이 필요합니다');
      return;
    }

    if (!chatSessionManager.hasSession(sessionId)) {
      this.sendError(connection, 'SESSION_NOT_FOUND', '세션을 찾을 수 없습니다');
      return;
    }

    try {
      // 메시지를 세션에 추가
      const chatMessage = await chatSessionManager.addMessage(sessionId, content, 'user', userId);
      
      // 메시지 전송 확인 응답
      this.sendMessage(connection, {
        type: 'chat_response',
        sessionId,
        content: `메시지가 전송되었습니다: ${chatMessage.id}`,
        timestamp: new Date().toISOString()
      });

      console.log(`[WS] 채팅 메시지 처리 완료 (세션: ${sessionId})`);

    } catch (error) {
      console.error(`[WS] 채팅 메시지 처리 오류 (세션: ${sessionId}):`, error);
      this.sendError(connection, 'INTERNAL_SERVER_ERROR', '메시지 처리에 실패했습니다');
    }
  }

  /**
   * 채팅 나가기 처리
   */
  private async handleLeaveChat(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    const { sessionId } = message;

    if (connection.sessionId) {
      connection.sessionId = undefined;
      connection.userId = undefined;
    }

    this.sendMessage(connection, {
      type: 'left',
      sessionId: sessionId || '',
      message: '채팅에서 나갔습니다',
      timestamp: new Date().toISOString()
    });

    console.log(`[WS] 채팅 나가기 완료 (연결: ${connection.id})`);
  }

  /**
   * 연결 해제 처리
   */
  private handleDisconnection(connection: WebSocketConnection): void {
    const { id: connectionId, sessionId } = connection;

    // 연결 제거
    this.connections.delete(connectionId);

    // Rate limit 정보 정리
    this.rateLimitMap.delete(connectionId);

    console.log(`[WS] 연결 정리 완료: ${connectionId}`);
  }

  /**
   * Rate limiting 확인
   */
  private checkRateLimit(connectionId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimitMap.get(connectionId);

    if (!limit || now > limit.resetTime) {
      // 새로운 제한 기간 시작
      this.rateLimitMap.set(connectionId, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow
      });
      return true;
    }

    if (limit.count >= this.config.rateLimitMax) {
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * 세션 관리자 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    // MCP 응답을 클라이언트로 전달
    chatSessionManager.on('mcp_response', (data) => {
      this.broadcastToSession(data.sessionId, {
        type: 'chat_response',
        sessionId: data.sessionId,
        content: data.message.content,
        timestamp: data.message.timestamp.toISOString()
      });
    });

    // MCP 에러를 클라이언트로 전달
    chatSessionManager.on('mcp_error', (error: VibeCraftError) => {
      if (error.sessionId) {
        this.broadcastToSession(error.sessionId, {
          type: 'error',
          sessionId: error.sessionId,
          message: error.message,
          timestamp: error.timestamp.toISOString()
        });
      }
    });

    // 세션 생성 알림
    chatSessionManager.on('session_created', (data) => {
      console.log(`[WS] 세션 생성 알림: ${data.session.id}`);
    });

    // 세션 삭제 알림
    chatSessionManager.on('session_destroyed', (data) => {
      console.log(`[WS] 세션 삭제 알림: ${data.sessionId}`);
    });
  }

  /**
   * 특정 세션의 모든 연결에 메시지 브로드캐스트
   */
  private broadcastToSession(sessionId: string, response: WebSocketResponse): void {
    const sessionConnections = Array.from(this.connections.values()).filter(
      conn => conn.sessionId === sessionId && conn.isAlive
    );

    console.log(`[WS] 세션 ${sessionId}에 브로드캐스트 (연결: ${sessionConnections.length}개)`);

    for (const connection of sessionConnections) {
      this.sendMessage(connection, response);
    }
  }

  /**
   * 개별 연결에 메시지 전송
   */
  private sendMessage(connection: WebSocketConnection, response: WebSocketResponse): void {
    if (connection.socket.readyState === WebSocket.OPEN) {
      try {
        connection.socket.send(JSON.stringify(response));
      } catch (error) {
        console.error(`[WS] 메시지 전송 오류 (연결: ${connection.id}):`, error);
      }
    }
  }

  /**
   * 에러 메시지 전송
   */
  private sendError(connection: WebSocketConnection, code: string, message: string): void {
    this.sendMessage(connection, {
      type: 'error',
      sessionId: connection.sessionId || '',
      message: `[${code}] ${message}`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 하트비트 시작
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, 30000); // 30초마다

    console.log('[WS] 하트비트 시작');
  }

  /**
   * 하트비트 수행
   */
  private performHeartbeat(): void {
    const deadConnections: string[] = [];

    for (const [connectionId, connection] of this.connections.entries()) {
      if (!connection.isAlive) {
        deadConnections.push(connectionId);
        continue;
      }

      connection.isAlive = false;
      
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.ping();
      } else {
        deadConnections.push(connectionId);
      }
    }

    // 죽은 연결 정리
    for (const connectionId of deadConnections) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        console.log(`[WS] 죽은 연결 정리: ${connectionId}`);
        this.handleDisconnection(connection);
      }
    }
  }

  /**
   * 서버 시작
   */
  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log(`[WS] VibeCraft WebSocket 서버 시작`);
        console.log(`[WS] HTTP 서버: http://localhost:${this.config.port}`);
        console.log(`[WS] WebSocket 서버: ws://localhost:${this.config.port}/ws`);
        console.log(`[WS] 헬스 체크: http://localhost:${this.config.port}/health`);
        resolve();
      });
    });
  }

  /**
   * 서버 종료
   */
  public async stop(): Promise<void> {
    console.log('[WS] 서버 종료 중...');

    // 하트비트 정지
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // 모든 WebSocket 연결 종료
    for (const connection of this.connections.values()) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.close(1001, 'Server shutting down');
      }
    }

    // WebSocket 서버 종료
    this.wss.close();

    // 세션 관리자 정리
    await chatSessionManager.destroyAllSessions();

    // MCP 클라이언트 정리
    await mcpClientManager.destroyAllClients();

    // HTTP 서버 종료
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('[WS] 서버 종료 완료');
        resolve();
      });
    });
  }
}

// 서버 인스턴스 생성 및 시작
const server = new VibeCraftWebSocketServer();

// 프로세스 종료 시 정리
process.on('SIGTERM', async () => {
  console.log('[WS] SIGTERM 수신, 서버 종료 시작...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[WS] SIGINT 수신, 서버 종료 시작...');
  await server.stop();
  process.exit(0);
});

// 서버 시작
server.start().catch((error) => {
  console.error('[WS] 서버 시작 실패:', error);
  process.exit(1);
});

export default server;