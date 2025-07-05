require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log('DART API Key:', process.env.DART_API_KEY ? 'Set' : 'Not Set');
console.log('Gemini API Key:', process.env.GEMINI_API_KEY ? 'Set' : 'Not Set');

const app = express();
const port = process.env.PORT || 3000;

// SQLite 데이터베이스 연결 (안전한 방식)
const dbPath = path.join(__dirname, 'db', 'companies.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
});

app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.use('/chart.js', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeFinancialStatements(data) {
    try {
        const financialData = data.map(item => {
            return `${item.account_nm}: 당기 ${item.thstrm_amount}원, 전기 ${item.frmtrm_amount}원, 전전기 ${item.bfefrmtrm_amount}원`;
        }).join('\n');

        const prompt = `다음은 기업의 재무제표 데이터입니다. 이를 분석하여 한국어로 종합적인 분석을 해주세요:

${financialData}

분석 포인트:
1. 전반적인 기업 실적 (매출, 이익 등의 증감률과 트렌드)
2. 재무상태 (자산, 부채, 자본의 변화와 건전성)
3. 주요 재무비율 분석 (수익성, 안정성, 성장성 지표)
4. 특이사항이나 주목할 만한 변화점
5. 향후 전망과 투자 시사점

전문가가 일반 투자자에게 설명하듯이 쉽고 명확하게 한국어로 설명해주세요. 
구체적인 수치와 비율을 포함하여 분석해주시고, 긍정적인 부분과 우려사항을 균형있게 제시해주세요.`;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return text.replace(/\n/g, '<br>');

    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error('재무제표 분석 중 오류가 발생했습니다.');
    }
}

app.get('/', (req, res) => {
  res.render('index');
});

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
      console.error('Search error:', err);
      return res.status(500).json({ error: 'Search error occurred.' });
    }
    res.json(rows);
  });
});

app.get('/api/financial-statements', async (req, res) => {
  const { corp_code, bsns_year, reprt_code } = req.query;
  
  try {
    console.log('Financial statement request:', {
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

    console.log('DART API Status:', response.data.status);
    console.log('DART API Message:', response.data.message);
    
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
              case '11013': reportType = 'Q1 Report'; break;
              case '11012': reportType = 'Semi-annual Report'; break;
              case '11014': reportType = 'Q3 Report'; break;
              case '11011': reportType = 'Annual Report'; break;
              default: reportType = 'Report';
            }
            
            res.json({
              status: '013',
              message: `${bsns_year} ${reportType} not yet submitted or not applicable.`
            });
          }
        } catch (retryError) {
          console.error('Retry error:', retryError.response ? retryError.response.data : retryError.message);
          res.json({
            status: '013',
            message: 'Financial statement information not found.'
          });
        }
        break;
      
      case '010':
        res.json({
          status: '010',
          message: 'Invalid API key. Please contact administrator.'
        });
        break;
      
      case '011':
        res.json({
          status: '011',
          message: 'API key expired. Please contact administrator.'
        });
        break;
      
      case '020':
        res.json({
          status: '020',
          message: 'Daily request limit exceeded. Please try again later.'
        });
        break;
      
      case '100':
        res.json({
          status: '100',
          message: 'Invalid request parameters. Please check input values.'
        });
        break;
      
      default:
        res.json({
          status: response.data.status,
          message: 'Error occurred while retrieving financial statements.'
        });
    }
  } catch (error) {
    console.error('Financial statement error:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
      status: 'error',
      message: 'Server error occurred. Please try again later.' 
    });
  }
});

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
        console.error('Financial analysis error:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Financial analysis error occurred.' 
        });
    }
});

// 프로세스 종료 시 데이터베이스 연결 정리
process.on('SIGINT', () => {
    console.log('Closing database connection...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
}); 