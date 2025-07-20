/**
 * MCP (Model Context Protocol) 클라이언트 구현
 * 각 채팅 세션별로 독립적인 MCP 클라이언트 인스턴스를 관리합니다.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  MCPClientInstance, 
  MCPMessage, 
  MCPError, 
  VibeCraftError,
  ErrorCode 
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * MCP 클라이언트 관리 클래스
 */
export class MCPClient extends EventEmitter {
  private clients: Map<string, MCPClientInstance> = new Map();
  private readonly pythonScriptPath: string;
  private readonly maxRetries: number = 3;
  private readonly heartbeatInterval: number = 30000; // 30초
  private heartbeatTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.pythonScriptPath = path.join(__dirname, '../pmc_client.py');
    this.startHeartbeat();
  }

  /**
   * 새로운 MCP 클라이언트 인스턴스 생성
   */
  async createClient(sessionId: string): Promise<MCPClientInstance> {
    try {
      // 기존 클라이언트가 있다면 정리
      await this.destroyClient(sessionId);

      console.log(`[MCP] 세션 ${sessionId}에 대한 새 MCP 클라이언트 생성 중...`);

      const process = spawn('python', [this.pythonScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      const client: MCPClientInstance = {
        id: `mcp_${sessionId}_${Date.now()}`,
        sessionId,
        process,
        isConnected: false,
        isReady: false,
        lastPing: new Date(),
        errorCount: 0
      };

      // 프로세스 이벤트 핸들러 설정
      this.setupProcessHandlers(client);

      // 클라이언트 저장
      this.clients.set(sessionId, client);

      // 초기화 대기
      await this.waitForReady(client);

      console.log(`[MCP] 세션 ${sessionId}의 MCP 클라이언트 준비 완료`);
      this.emit('client_ready', { sessionId, clientId: client.id });

      return client;

    } catch (error) {
      const mcpError = this.createError(
        'MCP_CONNECTION_FAILED',
        `MCP 클라이언트 생성 실패: ${error instanceof Error ? error.message : String(error)}`,
        { sessionId, error }
      );
      
      console.error(`[MCP] ${mcpError.message}`, mcpError.details);
      this.emit('client_error', mcpError);
      throw mcpError;
    }
  }

  /**
   * MCP 클라이언트 프로세스 이벤트 핸들러 설정
   */
  private setupProcessHandlers(client: MCPClientInstance): void {
    const { process: childProcess, sessionId } = client;

    // stdout 처리 - MCP 응답 수신
    childProcess.stdout?.on('data', (data: Buffer) => {
      try {
        const output = data.toString().trim();
        if (output) {
          this.handleMCPOutput(client, output);
        }
      } catch (error) {
        console.error(`[MCP] stdout 처리 오류 (세션: ${sessionId}):`, error);
      }
    });

    // stderr 처리 - 에러 로그
    childProcess.stderr?.on('data', (data: Buffer) => {
      const errorOutput = data.toString().trim();
      if (errorOutput) {
        console.warn(`[MCP] stderr (세션: ${sessionId}): ${errorOutput}`);
        client.errorCount++;
        
        // 에러가 너무 많으면 클라이언트 재시작
        if (client.errorCount > 10) {
          this.restartClient(sessionId);
        }
      }
    });

    // 프로세스 종료 처리
    childProcess.on('close', (code: number | null) => {
      console.log(`[MCP] 프로세스 종료 (세션: ${sessionId}, 코드: ${code})`);
      client.isConnected = false;
      client.isReady = false;
      
      this.emit('client_disconnected', { 
        sessionId, 
        clientId: client.id, 
        exitCode: code 
      });

      // 예상치 못한 종료인 경우 재시작 시도
      if (code !== 0 && code !== null) {
        setTimeout(() => {
          this.restartClient(sessionId);
        }, 5000);
      }
    });

    // 프로세스 에러 처리
    childProcess.on('error', (error: Error) => {
      console.error(`[MCP] 프로세스 오류 (세션: ${sessionId}):`, error);
      client.errorCount++;
      
      const mcpError = this.createError(
        'MCP_CONNECTION_FAILED',
        `MCP 프로세스 오류: ${error.message}`,
        { sessionId, error }
      );
      
      this.emit('client_error', mcpError);
    });
  }

  /**
   * MCP 출력 처리
   */
  private handleMCPOutput(client: MCPClientInstance, output: string): void {
    try {
      // JSON 메시지 파싱 시도
      const message: MCPMessage = JSON.parse(output);
      
      // 연결 준비 신호 확인
      if (message.type === 'notification' && message.method === 'ready') {
        client.isConnected = true;
        client.isReady = true;
        client.lastPing = new Date();
        this.emit('client_connected', { 
          sessionId: client.sessionId, 
          clientId: client.id 
        });
        return;
      }

      // 일반 메시지 처리
      this.emit('message_received', {
        sessionId: client.sessionId,
        clientId: client.id,
        message
      });

    } catch (error) {
      // JSON이 아닌 일반 텍스트 출력 처리
      console.log(`[MCP] 출력 (세션: ${client.sessionId}): ${output}`);
      
      // 특정 패턴으로 준비 상태 확인
      if (output.includes('MCP Ready') || output.includes('Connected')) {
        client.isConnected = true;
        client.isReady = true;
        client.lastPing = new Date();
        this.emit('client_connected', { 
          sessionId: client.sessionId, 
          clientId: client.id 
        });
      } else {
        // 일반 텍스트 응답으로 처리
        this.emit('text_response', {
          sessionId: client.sessionId,
          clientId: client.id,
          content: output
        });
      }
    }
  }

  /**
   * 클라이언트 준비 상태 대기
   */
  private async waitForReady(client: MCPClientInstance, timeout: number = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`MCP 클라이언트 초기화 시간 초과 (세션: ${client.sessionId})`));
      }, timeout);

      const checkReady = () => {
        if (client.isReady) {
          clearTimeout(timer);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  /**
   * 메시지 전송
   */
  async sendMessage(sessionId: string, content: string): Promise<void> {
    const client = this.clients.get(sessionId);
    
    if (!client) {
      throw this.createError(
        'SESSION_NOT_FOUND',
        `세션을 찾을 수 없습니다: ${sessionId}`,
        { sessionId }
      );
    }

    if (!client.isReady || !client.process.stdin) {
      throw this.createError(
        'MCP_CONNECTION_FAILED',
        `MCP 클라이언트가 준비되지 않음 (세션: ${sessionId})`,
        { sessionId }
      );
    }

    try {
      console.log(`[MCP] 메시지 전송 (세션: ${sessionId}): ${content}`);
      
      // 메시지를 stdin으로 전송
      client.process.stdin.write(content + '\n');
      
      // 마지막 활동 시간 업데이트
      client.lastPing = new Date();
      
      this.emit('message_sent', {
        sessionId,
        clientId: client.id,
        content
      });

    } catch (error) {
      const mcpError = this.createError(
        'MCP_TIMEOUT',
        `메시지 전송 실패: ${error instanceof Error ? error.message : String(error)}`,
        { sessionId, content, error }
      );
      
      console.error(`[MCP] ${mcpError.message}`, mcpError.details);
      this.emit('client_error', mcpError);
      throw mcpError;
    }
  }

  /**
   * 클라이언트 상태 확인
   */
  getClientStatus(sessionId: string): {
    exists: boolean;
    isConnected: boolean;
    isReady: boolean;
    lastPing: Date | null;
    errorCount: number;
  } {
    const client = this.clients.get(sessionId);
    
    if (!client) {
      return {
        exists: false,
        isConnected: false,
        isReady: false,
        lastPing: null,
        errorCount: 0
      };
    }

    return {
      exists: true,
      isConnected: client.isConnected,
      isReady: client.isReady,
      lastPing: client.lastPing,
      errorCount: client.errorCount
    };
  }

  /**
   * 클라이언트 재시작
   */
  async restartClient(sessionId: string): Promise<MCPClientInstance> {
    console.log(`[MCP] 클라이언트 재시작 (세션: ${sessionId})`);
    
    try {
      await this.destroyClient(sessionId);
      return await this.createClient(sessionId);
    } catch (error) {
      console.error(`[MCP] 클라이언트 재시작 실패 (세션: ${sessionId}):`, error);
      throw error;
    }
  }

  /**
   * 클라이언트 정리
   */
  async destroyClient(sessionId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    
    if (!client) {
      return;
    }

    console.log(`[MCP] 클라이언트 정리 중 (세션: ${sessionId})`);

    try {
      // 프로세스 종료
      if (client.process && !client.process.killed) {
        client.process.kill('SIGTERM');
        
        // 강제 종료를 위한 타이머
        setTimeout(() => {
          if (!client.process.killed) {
            client.process.kill('SIGKILL');
          }
        }, 5000);
      }

      // 클라이언트 제거
      this.clients.delete(sessionId);
      
      this.emit('client_destroyed', { 
        sessionId, 
        clientId: client.id 
      });

    } catch (error) {
      console.error(`[MCP] 클라이언트 정리 오류 (세션: ${sessionId}):`, error);
    }
  }

  /**
   * 하트비트 시작
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.heartbeatInterval);
  }

  /**
   * 건강 상태 검사
   */
  private performHealthCheck(): void {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5분

    for (const [sessionId, client] of this.clients.entries()) {
      const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
      
      if (timeSinceLastPing > staleThreshold) {
        console.warn(`[MCP] 클라이언트 응답 없음 (세션: ${sessionId}), 재시작 시도`);
        this.restartClient(sessionId).catch(error => {
          console.error(`[MCP] 건강 검사 중 재시작 실패 (세션: ${sessionId}):`, error);
        });
      }
    }
  }

  /**
   * 모든 클라이언트 정리
   */
  async destroyAllClients(): Promise<void> {
    console.log('[MCP] 모든 클라이언트 정리 중...');
    
    const destroyPromises = Array.from(this.clients.keys()).map(sessionId =>
      this.destroyClient(sessionId)
    );

    await Promise.all(destroyPromises);

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    console.log('[MCP] 모든 클라이언트 정리 완료');
  }

  /**
   * 현재 활성 클라이언트 수 반환
   */
  getActiveClientCount(): number {
    return Array.from(this.clients.values()).filter(client => 
      client.isConnected && client.isReady
    ).length;
  }

  /**
   * 모든 클라이언트 상태 반환
   */
  getAllClientStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [sessionId, client] of this.clients.entries()) {
      status[sessionId] = {
        clientId: client.id,
        isConnected: client.isConnected,
        isReady: client.isReady,
        lastPing: client.lastPing,
        errorCount: client.errorCount
      };
    }

    return status;
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
export const mcpClientManager = new MCPClient();