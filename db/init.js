const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

// 데이터베이스 연결
const db = new sqlite3.Database('./db/companies.db', (err) => {
  if (err) {
    console.error('데이터베이스 연결 실패:', err);
    return;
  }
  console.log('데이터베이스 연결 성공');
});

// 회사 정보 테이블 생성
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS companies (
    corp_code TEXT PRIMARY KEY,
    corp_name TEXT NOT NULL,
    stock_code TEXT,
    modify_date TEXT
  )`);

  // corpCodes.json 파일 읽기
  const corpCodesPath = path.join(__dirname, '../data/corpCodes.json');
  console.log('파일 경로:', corpCodesPath);
  
  try {
    console.log('파일 읽기 시작');
    const buffer = fs.readFileSync(corpCodesPath);
    console.log('파일 읽기 완료, 길이:', buffer.length);
    
    // UTF-8로 디코딩 시도
    let content = buffer.toString('utf8');
    let companies;
    
    try {
      companies = JSON.parse(content);
      console.log('UTF-8 디코딩 성공');
    } catch (e) {
      console.log('UTF-8 디코딩 실패, EUC-KR 시도');
      // EUC-KR로 디코딩 시도
      content = iconv.decode(buffer, 'euc-kr');
      companies = JSON.parse(content);
    }

    if (Array.isArray(companies)) {
      console.log('회사 데이터 개수:', companies.length);
      
      // 데이터 삽입을 위한 prepared statement
      const stmt = db.prepare('INSERT OR REPLACE INTO companies (corp_code, corp_name, stock_code, modify_date) VALUES (?, ?, ?, ?)');

      // 데이터 삽입
      companies.forEach((company, index) => {
        if (company.corp_name && company.corp_name.includes('삼성전자')) {
          console.log('삼성전자 데이터:', company);
        }
        stmt.run(company.corp_code, company.corp_name, company.stock_code, company.modify_date);
        if (index % 1000 === 0) {
          console.log(`${index}개 회사 정보 입력 완료`);
        }
      });

      stmt.finalize();
      console.log('데이터베이스 초기화 완료');
    } else {
      console.error('회사 코드 데이터가 올바른 형식이 아닙니다.');
      console.log('데이터 구조:', JSON.stringify(companies).slice(0, 200) + '...');
    }
  } catch (error) {
    console.error('파일 처리 중 오류 발생:', error);
  }
});

// 데이터베이스 연결 종료
db.close((err) => {
  if (err) {
    console.error('데이터베이스 연결 종료 실패:', err);
    return;
  }
  console.log('데이터베이스 연결 종료');
}); 