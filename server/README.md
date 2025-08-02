# VibeCraft SSE Server

Python Flask 기반 SSE(Server-Sent Events) 서버

## 설치 및 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python sse_server.py
```

## API 엔드포인트

- **SSE Stream**: `GET /events/<session_id>` - SSE 연결
- **Chat**: `POST /chat` - 채팅 메시지 전송
- **Health**: `GET /health` - 서버 상태 확인
- **Sessions**: `GET /sessions` - 세션 목록 조회
- **Delete Session**: `DELETE /sessions/<session_id>` - 세션 삭제

## 포트

- 서버: 22041
- 클라이언트 CORS 허용: 22042