require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 환경 변수 확인
console.log('DART API Key:', process.env.DART_API_KEY ? '설정됨' : '설정되지 않음');
console.log('Gemini API Key:', process.env.GEMINI_API_KEY ? '설정됨' : '설정되지 않음');

const app = express();
const port = process.env.PORT || 3000;

// 데이터베이스 연결
const db = new sqlite3.Database('./db/companies.db');

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Content-Type 설정
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
});

// Bootstrap과 Chart.js 설정
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.use('/chart.js', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));

// Gemini API 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 재무제표 분석 함수
async function analyzeFinancialStatements(data) {
    try {
        // 재무제표 데이터 정리
        const financialData = data.map(item => {
            return `${item.account_nm}: 
            - 당기: ${item.thstrm_amount}원
            - 전기: ${item.frmtrm_amount}원
            - 전전기: ${item.bfefrmtrm_amount}원`;
        }).join('\n');

        const prompt = `
다음은 기업의 재무제표 데이터입니다. 이를 분석하여 다음 내용을 포함한 종합적인 분석을 해주세요:

${financialData}

분석 포인트:
1. 전반적인 기업 실적 (매출, 이익 등의 증감)
2. 재무상태 (자산, 부채, 자본의 변화)
3. 주요 재무비율 분석 (수익성, 안정성, 성장성)
4. 특이사항이나 주목할 만한 변화
5. 향후 전망

전문가가 일반 투자자에게 설명하듯이 쉽게 설명해주세요.
`;

        // Gemini 모델 생성
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        });

        // 프롬프트로 텍스트 생성
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // 줄바꿈을 HTML <br> 태그로 변환하여 반환
        return text.replace(/\n/g, '<br>');

    } catch (error) {
        console.error('Gemini API 오류:', error);
        throw new Error('재무제표 분석 중 오류가 발생했습니다.');
    }
}

// 메인 페이지
app.get('/', (req, res) => {
  res.render('index');
});

// 회사 검색 API
app.get('/api/search', (req, res) => {
  const searchTerm = req.query.term;
  const query = `
    SELECT corp_code, corp_name, stock_code 
    FROM companies 
    WHERE corp_name LIKE ? 
    LIMIT 10
  `;
  
  db.all(query, [`%${searchTerm}%`], (err, rows) => {
    if (err) {
      console.error('검색 오류:', err);
      return res.status(500).json({ error: '검색 중 오류가 발생했습니다.' });
    }
    res.json(rows);
  });
});

// 재무제표 조회 API
app.get('/api/financial-statements', async (req, res) => {
  const { corp_code, bsns_year, reprt_code } = req.query;
  
  try {
    // API 요청 파라미터 로깅
    console.log('재무제표 조회 요청:', {
      corp_code,
      bsns_year,
      reprt_code
    });

    const response = await axios.get('https://opendart.fss.or.kr/api/fnlttSinglAcnt.json', {
      params: {
        crtfc_key: process.env.DART_API_KEY,
        corp_code,
        bsns_year,
        reprt_code,
        fs_div: 'CFS'
      }
    });

    // 응답 데이터 로깅
    console.log('DART API 응답 상태:', response.data.status);
    console.log('DART API 응답 메시지:', response.data.message);
    
    // 상태 코드별 처리
    switch(response.data.status) {
      case '000':
        res.json(response.data);
        break;
      
      case '013':
        try {
          const retryResponse = await axios.get('https://opendart.fss.or.kr/api/fnlttSinglAcnt.json', {
            params: {
              crtfc_key: process.env.DART_API_KEY,
              corp_code,
              bsns_year,
              reprt_code,
              fs_div: 'OFS'
            }
          });
          
          if (retryResponse.data.status === '000') {
            res.json(retryResponse.data);
          } else {
            let reportType;
            switch(reprt_code) {
              case '11013': reportType = '1분기보고서(5월 중순 제출)'; break;
              case '11012': reportType = '반기보고서(8월 중순 제출)'; break;
              case '11014': reportType = '3분기보고서(11월 중순 제출)'; break;
              case '11011': reportType = '사업보고서(3월말 제출)'; break;
              default: reportType = '보고서';
            }
            
            res.json({
              status: '013',
              message: `${bsns_year}년 ${reportType}가 아직 제출되지 않았거나, 제출 대상이 아닙니다.`
            });
          }
        } catch (retryError) {
          console.error('일반재무제표 조회 오류:', retryError.response ? retryError.response.data : retryError.message);
          res.json({
            status: '013',
            message: '해당 보고서의 재무제표 정보를 찾을 수 없습니다.'
          });
        }
        break;
      
      case '010':
        res.json({
          status: '010',
          message: 'API 키가 유효하지 않습니다. 관리자에게 문의하세요.'
        });
        break;
      
      case '011':
        res.json({
          status: '011',
          message: 'API 키가 만료되었습니다. 관리자에게 문의하세요.'
        });
        break;
      
      case '020':
        res.json({
          status: '020',
          message: '일일 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
        });
        break;
      
      case '100':
        res.json({
          status: '100',
          message: '요청 정보가 올바르지 않습니다. 입력 값을 확인해주세요.'
        });
        break;
      
      default:
        res.json({
          status: response.data.status,
          message: '재무제표 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        });
    }
  } catch (error) {
    console.error('재무제표 조회 오류:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
      status: 'error',
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
    });
  }
});

// 재무제표 분석 API
app.get('/api/analyze-financial-statements', async (req, res) => {
    const { corp_code, bsns_year, reprt_code } = req.query;
    
    try {
        const response = await axios.get('https://opendart.fss.or.kr/api/fnlttSinglAcnt.json', {
            params: {
                crtfc_key: process.env.DART_API_KEY,
                corp_code,
                bsns_year,
                reprt_code,
                fs_div: 'CFS'
            }
        });

        if (response.data.status === '000') {
            const analysis = await analyzeFinancialStatements(response.data.list);
            res.json({ 
                status: '000',
                analysis: analysis 
            });
        } else {
            res.json({
                status: response.data.status,
                message: response.data.message
            });
        }
    } catch (error) {
        console.error('재무제표 분석 오류:', error);
        res.status(500).json({ 
            status: 'error',
            message: '재무제표 분석 중 오류가 발생했습니다.' 
        });
    }
});

// 서버 시작
app.listen(port, '0.0.0.0', () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
}); 