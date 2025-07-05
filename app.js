require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ȯ�� ���� Ȯ��
console.log('DART API Key:', process.env.DART_API_KEY ? '������' : '�������� ����');
console.log('Gemini API Key:', process.env.GEMINI_API_KEY ? '������' : '�������� ����');

const app = express();
const port = process.env.PORT || 3000;

// �����ͺ��̽� ����
const db = new sqlite3.Database('./db/companies.db');

// �̵���� ����
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Content-Type ����
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
});

// Bootstrap�� Chart.js ����
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.use('/chart.js', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));

// Gemini API �ʱ�ȭ
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// �繫��ǥ �м� �Լ�
async function analyzeFinancialStatements(data) {
    try {
        // �繫��ǥ ������ ����
        const financialData = data.map(item => {
            return `${item.account_nm}: 
            - ���: ${item.thstrm_amount}��
            - ����: ${item.frmtrm_amount}��
            - ������: ${item.bfefrmtrm_amount}��`;
        }).join('\n');

        const prompt = `
������ ����� �繫��ǥ �������Դϴ�. �̸� �м��Ͽ� ���� ������ ������ �������� �м��� ���ּ���:

${financialData}

�м� ����Ʈ:
1. �������� ��� ���� (����, ���� ���� ����)
2. �繫���� (�ڻ�, ��ä, �ں��� ��ȭ)
3. �ֿ� �繫���� �м� (���ͼ�, ������, ���强)
4. Ư�̻����̳� �ָ��� ���� ��ȭ
5. ���� ����

�������� �Ϲ� �����ڿ��� �����ϵ��� ���� �������ּ���.
`;

        // Gemini �� ����
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        });

        // ������Ʈ�� �ؽ�Ʈ ����
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // �ٹٲ��� HTML <br> �±׷� ��ȯ�Ͽ� ��ȯ
        return text.replace(/\n/g, '<br>');

    } catch (error) {
        console.error('Gemini API ����:', error);
        throw new Error('�繫��ǥ �м� �� ������ �߻��߽��ϴ�.');
    }
}

// ���� ������
app.get('/', (req, res) => {
  res.render('index');
});

// ȸ�� �˻� API
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
      console.error('�˻� ����:', err);
      return res.status(500).json({ error: '�˻� �� ������ �߻��߽��ϴ�.' });
    }
    res.json(rows);
  });
});

// �繫��ǥ ��ȸ API
app.get('/api/financial-statements', async (req, res) => {
  const { corp_code, bsns_year, reprt_code } = req.query;
  
  try {
    // API ��û �Ķ���� �α�
    console.log('�繫��ǥ ��ȸ ��û:', {
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

    // ���� ������ �α�
    console.log('DART API ���� ����:', response.data.status);
    console.log('DART API ���� �޽���:', response.data.message);
    
    // ���� �ڵ庰 ó��
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
              case '11013': reportType = '1�б⺸��(5�� �߼� ����)'; break;
              case '11012': reportType = '�ݱ⺸��(8�� �߼� ����)'; break;
              case '11014': reportType = '3�б⺸��(11�� �߼� ����)'; break;
              case '11011': reportType = '�������(3���� ����)'; break;
              default: reportType = '����';
            }
            
            res.json({
              status: '013',
              message: `${bsns_year}�� ${reportType}�� ���� ������� �ʾҰų�, ���� ����� �ƴմϴ�.`
            });
          }
        } catch (retryError) {
          console.error('�Ϲ��繫��ǥ ��ȸ ����:', retryError.response ? retryError.response.data : retryError.message);
          res.json({
            status: '013',
            message: '�ش� ������ �繫��ǥ ������ ã�� �� �����ϴ�.'
          });
        }
        break;
      
      case '010':
        res.json({
          status: '010',
          message: 'API Ű�� ��ȿ���� �ʽ��ϴ�. �����ڿ��� �����ϼ���.'
        });
        break;
      
      case '011':
        res.json({
          status: '011',
          message: 'API Ű�� ����Ǿ����ϴ�. �����ڿ��� �����ϼ���.'
        });
        break;
      
      case '020':
        res.json({
          status: '020',
          message: '���� ��û �ѵ��� �ʰ��߽��ϴ�. ��� �� �ٽ� �õ����ּ���.'
        });
        break;
      
      case '100':
        res.json({
          status: '100',
          message: '��û ������ �ùٸ��� �ʽ��ϴ�. �Է� ���� Ȯ�����ּ���.'
        });
        break;
      
      default:
        res.json({
          status: response.data.status,
          message: '�繫��ǥ ��ȸ �� ������ �߻��߽��ϴ�. ��� �� �ٽ� �õ����ּ���.'
        });
    }
  } catch (error) {
    console.error('�繫��ǥ ��ȸ ����:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
      status: 'error',
      message: '���� ������ �߻��߽��ϴ�. ��� �� �ٽ� �õ����ּ���.' 
    });
  }
});

// �繫��ǥ �м� API
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
        console.error('�繫��ǥ �м� ����:', error);
        res.status(500).json({ 
            status: 'error',
            message: '�繫��ǥ �м� �� ������ �߻��߽��ϴ�.' 
        });
    }
});

// ���� ����
app.listen(port, '0.0.0.0', () => {
  console.log(`������ http://localhost:${port} ���� ���� ���Դϴ�.`);
}); 