# VibeCraft 테스트 데이터 템플릿

테스트 응답을 커스터마이징하기 위해 아래 템플릿을 사용하세요.

## test-responses.json 파일 구조

```json
{
  "responses": [
    {
      "id": "response-1",
      "type": "streaming",
      "content": "여기에 AI 응답 텍스트를 입력하세요.",
      "delayMs": 10000,
      "artifact": {
        "show": true,
        "url": "http://localhost:3001",
        "title": "아티팩트 제목",
        "description": "아티팩트 설명"
      }
    }
  ]
}
```

## 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 응답의 고유 ID (필수) |
| `type` | string | 응답 타입 (현재: "streaming") |
| `content` | string | 스트리밍으로 출력될 텍스트 (줄바꿈: `\n`) |
| `delayMs` | number | 응답 시작 전 지연 시간 (밀리초) |
| `artifact.show` | boolean | 아티팩트 표시 여부 |
| `artifact.url` | string | 아티팩트 URL |
| `artifact.title` | string | 아티팩트 제목 |
| `artifact.description` | string | 아티팩트 설명 |

## 예제

### 예제 1: 간단한 응답 (아티팩트 없음)

```json
{
  "id": "simple-1",
  "type": "streaming",
  "content": "안녕하세요! 도움을 드리겠습니다.",
  "delayMs": 5000,
  "artifact": {
    "show": false
  }
}
```

### 예제 2: 상세 분석 응답

```json
{
  "id": "analysis-1",
  "type": "streaming",
  "content": "파일을 분석했습니다.\n\n주요 결과:\n- 데이터 품질: 95%\n- 이상치: 3개\n- 추천: 라인 차트로 시각화\n\n아래 대시보드를 참고하세요.",
  "delayMs": 12000,
  "artifact": {
    "show": true,
    "url": "http://localhost:3001",
    "title": "데이터 분석 결과",
    "description": "파일 분석 결과 및 통계"
  }
}
```

### 예제 3: 여러 줄 응답

```json
{
  "id": "multi-line-1",
  "type": "streaming",
  "content": "첫 번째 섹션\n\n두 번째 섹션\n\n세 번째 섹션\n\n결론",
  "delayMs": 15000,
  "artifact": {
    "show": true,
    "url": "http://localhost:3001",
    "title": "분석 보고서",
    "description": "상세 분석 보고서"
  }
}
```

## 텍스트 포맷팅

### 줄바꿈
- 줄바꿈: `\n` 사용
- 문단 분리: `\n\n` (빈 줄) 사용

### Markdown 지원
테스트 응답에서는 다음 Markdown 형식을 지원합니다:

```
# 제목
## 부제목
**굵은 글자**
*기울임 글자*
- 리스트 항목
```

## 예제로 테스트하기

1. `public/test-data/test-responses.json` 파일 수정
2. `npm run dev:test` 실행
3. 파일 업로드 후 프롬프트 입력
4. 전송 버튼 클릭

응답이 10~15초 후에 스트리밍으로 표시됩니다.

## 여러 응답 추가

`responses` 배열에 여러 응답을 추가하면, 매번 다른 응답이 랜덤하게 선택됩니다.

```json
{
  "responses": [
    { "id": "response-1", ... },
    { "id": "response-2", ... },
    { "id": "response-3", ... }
  ]
}
```

매번 프롬프트를 전송할 때마다 위 중 하나가 랜덤으로 선택되어 표시됩니다.

## 팁

- **지연 시간**: 5000 ~ 15000ms 권장 (5초 ~ 15초)
- **텍스트 길이**: 짧은 텍스트 (1-3문단)가 더 자연스럽습니다
- **아티팩트 URL**: localhost:3001이 실행 중일 때만 보입니다
