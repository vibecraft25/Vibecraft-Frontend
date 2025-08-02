#!/usr/bin/env python3
"""
VibeCraft SSE Server
포트 22041에서 실행되는 Python SSE 서버
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import time
import random
import threading
import queue
import os
from datetime import datetime
from typing import Dict, List, Optional
import uuid

app = Flask(__name__)
CORS(app, origins=["http://localhost:22042"])

# 전역 상태 관리
active_connections: Dict[str, queue.Queue] = {}
session_data: Dict[str, Dict] = {}

# 채팅 기록 저장 디렉토리
CHAT_DATA_DIR = "chat_data"
if not os.path.exists(CHAT_DATA_DIR):
    os.makedirs(CHAT_DATA_DIR)

# 프로세스 상태 타입
PROCESS_STATUS = {
    'TOPIC': 'TOPIC',      # 주제 설정
    'DATA': 'DATA',        # 데이터 수집
    'BUILD': 'BUILD',      # 대시보드 구축
    'DEPLOY': 'DEPLOY'     # 배포
}

# 채팅 메시지 타입
class ChatMessage:
    def __init__(self, message_id: str, session_id: str, content: str, 
                 message_type: str = "server", timestamp: str = None):
        self.message_id = message_id
        self.session_id = session_id
        self.content = content
        self.type = message_type
        self.timestamp = timestamp or datetime.now().isoformat()
    
    def to_dict(self):
        return {
            'messageId': self.message_id,
            'sessionId': self.session_id,
            'content': self.content,
            'type': self.type,
            'timestamp': self.timestamp
        }

# 채팅 기록 관리 함수들
def get_chat_file_path(session_id: str) -> str:
    """세션 ID로 채팅 파일 경로 생성"""
    return os.path.join(CHAT_DATA_DIR, f"{session_id}.json")

def save_chat_message(session_id: str, message: ChatMessage):
    """채팅 메시지를 JSON 파일에 저장"""
    try:
        file_path = get_chat_file_path(session_id)
        messages = []
        
        # 기존 파일이 있으면 로드
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                messages = data.get('messages', [])
        
        # 새 메시지 추가
        messages.append(message.to_dict())
        
        # 파일에 저장
        chat_data = {
            'sessionId': session_id,
            'messages': messages,
            'lastUpdated': datetime.now().isoformat()
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
            
        print(f"💾 채팅 메시지 저장: {session_id} - {len(messages)}개")
        
    except Exception as e:
        print(f"❌ 채팅 메시지 저장 실패: {e}")

def load_chat_history(session_id: str) -> List[Dict]:
    """세션의 채팅 기록 로드"""
    try:
        file_path = get_chat_file_path(session_id)
        
        if not os.path.exists(file_path):
            print(f"📭 채팅 파일 없음: {session_id}")
            return []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            messages = data.get('messages', [])
            print(f"📂 채팅 기록 로드: {session_id} - {len(messages)}개")

            return messages
            
    except Exception as e:
        print(f"❌ 채팅 기록 로드 실패: {e}")
        return []

class SSEServer:
    def __init__(self):
        self.port = 22041
        
    def generate_response(self, message: str, session_id: str) -> int:
        """랜덤한 응답 개수 생성 (1~10번 중 선택)"""
        response_count = random.randint(1, 10)
        return response_count
    
    def send_sequential_messages(self, session_id: str, message_count: int, original_message: str):
        """순차적으로 메시지를 전송하는 스레드 함수"""
        def send_messages():
            for i in range(1, message_count + 1):
                try:
                    # 0.5초 대기
                    time.sleep(0.5)
                    
                    # 메시지 데이터 생성
                    message_id = str(uuid.uuid4())
                    content = f'{session_id}의 응답입니다. ({i}/{message_count})'
                    
                    response_data = {
                        'type': 'chat_response',
                        'sessionId': session_id,
                        'messageId': message_id,
                        'content': content,
                        'sequence': i,
                        'total': message_count,
                        'originalMessage': original_message,
                        'processStatus': session_data.get(session_id, {}).get('process_status', PROCESS_STATUS['TOPIC']),
                        'timestamp': datetime.now().isoformat(),
                    }
                    
                    # 서버 응답 메시지 저장
                    server_message = ChatMessage(
                        message_id=message_id,
                        session_id=session_id,
                        content=content,
                        message_type="server"
                    )
                    save_chat_message(session_id, server_message)
                    
                    # 큐에 메시지 추가
                    if session_id in active_connections:
                        try:
                            active_connections[session_id].put(response_data, timeout=1)
                        except queue.Full:
                            print(f"큐가 가득참: {session_id}")
                            break
                    else:
                        print(f"세션이 더 이상 활성화되지 않음: {session_id}")
                        break
                        
                except Exception as e:
                    print(f"메시지 전송 오류: {e}")
                    break
        
        # 별도 스레드에서 실행
        thread = threading.Thread(target=send_messages, daemon=True)
        thread.start()
    
    def format_sse_message(self, event_type: str, data: dict) -> str:
        """SSE 형식의 메시지 포맷"""
        return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

@app.route('/events/<session_id>')
def sse_stream(session_id: str):
    """SSE 스트림 엔드포인트"""
    def event_generator():
        # 새 연결을 위한 큐 생성
        message_queue = queue.Queue()
        active_connections[session_id] = message_queue
        
        try:
            # 연결 확인 메시지
            yield server.format_sse_message('connected', {
                'sessionId': session_id,
                'message': 'SSE 연결이 성공했습니다.',
                'timestamp': datetime.now().isoformat()
            })
            
            # 하트비트 및 메시지 처리
            while True:
                try:
                    # 큐에서 메시지 대기 (30초 타임아웃)
                    message_data = message_queue.get(timeout=30)
                    yield server.format_sse_message('message', message_data)
                except queue.Empty:
                    # 하트비트 전송
                    yield server.format_sse_message('heartbeat', {
                        'timestamp': datetime.now().isoformat()
                    })
                    
        except GeneratorExit:
            # 연결 종료 시 정리
            if session_id in active_connections:
                del active_connections[session_id]
            if session_id in session_data:
                del session_data[session_id]
                
    return Response(event_generator(), mimetype='text/event-stream')

@app.route('/chat', methods=['POST'])
def handle_chat_message():
    """채팅 메시지 처리"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        message = data.get('message', '')
        user_id = data.get('userId', 'anonymous')
        
        # if not session_id or not message:
        #     return jsonify({'error': '세션 ID와 메시지가 필요합니다.'}), 400
            
        # 세션 데이터 초기화 (필요시)
        if session_id and session_id in session_data:
            # 기존 세션 사용
            print(f"🔄 기존 세션 사용: {session_id}")
        else:
            # 새 세션 ID 생성 (session_id가 없거나 존재하지 않는 경우에만)
            session_id = str(uuid.uuid4())
            print(f"🆕 새 세션 생성: {session_id}")

            session_data[session_id] = {
                'created_at': datetime.now().isoformat(),
                'message_count': 0,
                'user_id': user_id,
                'status': 'created',
                'process_status': PROCESS_STATUS['TOPIC']  # 새 세션은 TOPIC부터 시작
            }
            # 새 연결 추가
            active_connections[session_id] = queue.Queue()
        
        # 메시지 카운트 증가
        session_data[session_id]['message_count'] += 1
        
        # 사용자 메시지 저장
        user_message = ChatMessage(
            message_id=str(uuid.uuid4()),
            session_id=session_id,
            content=message,
            message_type="user"
        )
        save_chat_message(session_id, user_message)
        
        # 응답 개수 생성 및 순차 메시지 전송 시작 (별도 스레드)
        response_count = server.generate_response(message, session_id)
        server.send_sequential_messages(session_id, response_count, message)

        # 즉시 응답 데이터 (시작 알림)
        response_data = {
            'success': True,
            'type': 'chat_started',
            'sessionId': session_id,
            'messageId': str(uuid.uuid4()),
            'content': f'응답을 생성하고 있습니다... (총 {response_count}개 메시지)',
            'messageCount': session_data[session_id]['message_count'],
            'totalResponses': response_count,
            'processStatus': session_data[session_id]['process_status'],
            'timestamp': datetime.now().isoformat(),
        }

        # POST 응답 반환
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'error': f'서버 오류: {str(e)}'}), 500

@app.route('/sessions', methods=['GET'])
def get_sessions():
    """세션 목록 조회"""
    return jsonify({
        'sessions': session_data,
        'active_connections': list(active_connections.keys()),
        'total_sessions': len(session_data),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/sessions/<session_id>/messages', methods=['GET'])
def get_session_messages(session_id: str):
    """세션의 메시지 기록 조회"""
    try:
        # if session_id in session_data:
        #     return jsonify(session_data[session_id])

        # JSON 파일에서 채팅 기록 로드
        messages = load_chat_history(session_id)
        
        # 세션 기록 요청은 해당 세션에 재연결을 의미하므로 session_data 복원
        if messages and session_id not in session_data:
            # 첫 번째 메시지에서 사용자 정보 추출 (있다면)
            first_user_message = next((msg for msg in messages if msg.get('type') == 'user'), None)
            user_id = 'anonymous'  # 기본값
            
            session_data[session_id] = {
                'created_at': messages[0].get('timestamp', datetime.now().isoformat()) if messages else datetime.now().isoformat(),
                'message_count': len([msg for msg in messages if msg.get('type') == 'user']),  # 사용자 메시지만 카운트
                'user_id': user_id,
                'status': 'restored',  # 복원된 세션임을 표시
                'process_status': PROCESS_STATUS['TOPIC']  # 기본값으로 TOPIC 설정 (추후 개선 가능)
            }
            print(f"🔄 세션 데이터 복원: {session_id} - {len(messages)}개 메시지")
        
        return jsonify({
            'success': True,
            'sessionId': session_id,
            'messages': messages,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'error': f'메시지 조회 오류: {str(e)}'}), 500

@app.route('/sessions/<session_id>', methods=['DELETE'])
def delete_session(session_id: str):
    """세션 삭제"""
    try:
        # 메모리에서 세션 데이터 삭제
        if session_id in session_data:
            del session_data[session_id]
        if session_id in active_connections:
            del active_connections[session_id]
        
        # JSON 파일 삭제
        file_path = get_chat_file_path(session_id)
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ 채팅 파일 삭제: {session_id}")
            
        return jsonify({
            'success': True,
            'message': f'세션 {session_id}가 삭제되었습니다.',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'error': f'세션 삭제 오류: {str(e)}'}), 500

if __name__ == '__main__':
    server = SSEServer()
    
    print(f"🚀 VibeCraft SSE Server starting on port {server.port}")
    print(f"📡 SSE Stream: http://localhost:{server.port}/events/<session_id>")  
    print(f"💬 Chat API: http://localhost:{server.port}/chat")
    print(f"🏥 Health Check: http://localhost:{server.port}/health")
    print(f"📊 Sessions: http://localhost:{server.port}/sessions")
    
    app.run(
        host='0.0.0.0',
        port=server.port,
        debug=False,
        threaded=True
    )