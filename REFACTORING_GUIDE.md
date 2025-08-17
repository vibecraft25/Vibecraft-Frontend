# VibeCraft Core 리팩토링 가이드

## 🎯 리팩토링 완료 요약

### Phase 1: SSE 관련 역할 분리
- ✅ **MessageService 생성**: SSE 메시지 송수신 로직 분리
- ✅ **StreamService 생성**: 스트림 처리 및 이벤트 핸들링 분리
- ✅ **SSEService 정리**: 순수 연결 관리만 담당 (send 메서드 제거)
- ✅ **SSEStore 단순화**: 상태 관리에 집중, 비즈니스 로직 분리

### Phase 2: 데이터 관리 및 로딩 상태 분리
- ✅ **DataService 생성**: 영속성 로직 중앙화
- ✅ **LoadingStore 생성**: 로딩 상태 중앙 관리
- ✅ **ChannelStore 경량화**: 메타데이터 관리에 집중

## 📁 새로운 파일 구조

```
client/src/core/
├── services/
│   ├── sseService.ts         # 연결 관리만
│   ├── messageService.ts     # 🆕 메시지 송수신
│   ├── streamService.ts      # 🆕 스트림 처리
│   ├── dataService.ts        # 🆕 데이터 영속성
│   └── storageService.ts     # 기존 유지
├── stores/
│   ├── sseStore.ts           # 🔄 간소화됨
│   ├── channelStore.ts       # 🔄 경량화됨
│   ├── loadingStore.ts       # 🆕 로딩 상태 관리
│   └── chatStore.ts          # 기존 유지
└── types/                    # 기존 유지
```

## 🔄 주요 변경사항

### 1. SSEStore 변경사항

#### 이전 (479라인)
```typescript
// 거대한 sendMessageToStatus 메서드
sendMessageToStatus: async (message, status, endpoint, additionalParams) => {
  // 복잡한 API 호출, 스트림 처리, 이벤트 핸들링이 모두 섞임
  // ... 수백 라인의 복잡한 로직
}
```

#### 이후 (간소화)
```typescript
// 서비스 위임을 통한 간소화
sendMessageToStatus: async (message, status, endpoint, additionalParams) => {
  const response = await MessageService.sendMessageToStatus(message, status, endpoint, additionalParams);
  
  if (response && response.body) {
    await StreamService.processStream(response, {
      onAIEvent: (data, id) => get().handleMessage(MessageService.transformSSEEvent("ai", data, id)),
      // ... 다른 이벤트 핸들러
    });
  }
}
```

### 2. 새로운 서비스 역할

#### MessageService
- HTTP 메시지 송수신
- SSE 이벤트 변환
- 메시지 유효성 검증

#### StreamService
- 스트림 데이터 처리
- 이벤트 타입별 파싱
- 데이터 테이블 변환

#### DataService
- 채널 데이터 영속성
- 백업/복원 기능
- 사용량 통계

#### LoadingStore
- 중앙화된 로딩 상태
- 진행률 추적
- 커스텀 로딩 상태

## 🚀 마이그레이션 단계

### 1. 기존 코드 호환성 확인

레거시 파일들이 백업되어 있습니다:
- `sseStore.legacy.ts`
- `channelStore.legacy.ts`

### 2. 점진적 마이그레이션

```typescript
// 기존 사용법 (여전히 작동)
const { sendMessageToStatus } = useSSEActions();

// 새로운 사용법 (권장)
import { MessageService, StreamService } from '@/core/services';
import { useLoadingActions } from '@/core/stores';
```

### 3. 새로운 LoadingStore 활용

```typescript
// 기존: ChannelStore에서 로딩 상태 관리
const { isChannelLoading, isApiLoading } = useChannelState();

// 새로운: LoadingStore에서 중앙 관리
const { isChannelLoading, isApiLoading } = useLoadingState();
// 또는
const isChannelLoading = useChannelLoading();
const isApiLoading = useApiLoading();
```

## 🛠️ 호환성 및 타입 안전성

### 기존 인터페이스 유지
모든 기존 hook과 메서드 시그니처는 동일하게 유지됩니다:

```typescript
// 모두 기존과 동일하게 작동
const { connect, disconnect, sendMessage } = useSSEActions();
const { createChannel, switchChannel } = useChannelActions();
const { status, isConnected } = useSSEState();
```

### 새로운 타입 추가
```typescript
import type { 
  LoadingType, 
  MessageParams, 
  StreamEndpoint,
  ChannelData 
} from '@/core';
```

## 🧪 테스트 전략

### 1. 기능 검증
- [ ] SSE 연결/해제 테스트
- [ ] 메시지 송수신 테스트
- [ ] 채널 생성/전환 테스트
- [ ] 로딩 상태 관리 테스트

### 2. 성능 검증
- [ ] 메모리 사용량 개선 확인
- [ ] 렌더링 성능 측정
- [ ] 코드 복잡도 감소 확인

### 3. 타입 안전성
- [ ] TypeScript 컴파일 오류 없음
- [ ] 런타임 오류 없음
- [ ] IDE 자동완성 정상 작동

## 📊 개선 효과

### 코드 복잡도 감소
- SSEStore: 479라인 → 200라인 미만 (-58%)
- ChannelStore: 복잡한 영속성 로직 → DataService로 분리
- 각 모듈의 단일 책임 원칙 준수

### 유지보수성 향상
- 명확한 역할 분리
- 서비스별 독립적 테스트 가능
- 의존성 순환 제거

### 확장성 개선
- 새로운 이벤트 타입 추가 용이
- 로딩 상태 관리 확장 가능
- 데이터 백업/복원 기능 내장

## 🎉 다음 단계 권장사항

### 1. 추가 개선 가능 영역
- API 통합 서비스 생성
- 에러 처리 중앙화
- 캐싱 레이어 추가

### 2. 모니터링
- 성능 메트릭 수집
- 에러 로깅 개선
- 사용자 행동 분석

### 3. 문서화
- API 문서 업데이트
- 개발 가이드 작성
- 아키텍처 다이어그램 생성

이제 VibeCraft Core는 더 깔끔하고 유지보수하기 쉬운 아키텍처를 가지게 되었습니다! 🚀