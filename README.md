# 재무제표 조회 웹 애플리케이션

DART API와 Google Gemini AI를 활용한 기업 재무제표 분석 시스템입니다.

## ? 주요 기능

- **기업 검색**: 67,460개 국내 기업 실시간 검색
- **재무제표 조회**: 사업보고서, 반기보고서, 분기보고서 조회
- **데이터 시각화**: Chart.js를 활용한 직관적인 차트
- **AI 재무분석**: Google Gemini API를 통한 전문적인 재무분석
- **재무비율 계산**: 수익성, 안정성, 성장성 지표 자동 계산

## ?? 기술 스택

### Backend
- Node.js + Express.js
- SQLite3 (회사 데이터)
- EJS (템플릿 엔진)

### Frontend
- HTML5/CSS3 + JavaScript
- Bootstrap 5.3.2
- Chart.js 4.4.1

### API
- OPEN DART API (금융감독원)
- Google Gemini API (AI 분석)

## ? 로컬 실행 방법

1. **저장소 클론**
```bash
git clone <repository-url>
cd fs-project2
```

2. **의존성 설치**
```bash
npm install
```

3. **환경변수 설정**
`.env` 파일을 생성하고 다음 내용을 추가:
```
DART_API_KEY=your_dart_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

4. **서버 실행**
```bash
npm run dev  # 개발 모드
npm start    # 프로덕션 모드
```

5. **브라우저에서 접속**
```
http://localhost:3000
```

## ? 데이터베이스

- **SQLite3** 사용
- **67,460개** 기업 정보 보유
- 회사명, 회사코드, 주식코드 저장

## ? API 키 발급 방법

### DART API 키
1. [DART 개발자센터](https://opendart.fss.or.kr/) 접속
2. 회원가입 후 API 키 발급 신청
3. 승인 후 API 키 사용

### Gemini API 키
1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. Google 계정으로 로그인
3. API 키 생성

## ? 배포

이 애플리케이션은 다음 플랫폼에서 배포 가능합니다:
- Railway
- Heroku
- Render
- Vercel

## ? 라이선스

MIT License

## ? 기여

이슈 제보나 기능 개선 제안은 언제든 환영합니다! 