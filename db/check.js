const sqlite3 = require('sqlite3').verbose();

// 콘솔 출력 인코딩 설정
process.stdout.setEncoding('utf8');

// 데이터베이스 연결
const db = new sqlite3.Database('./db/companies.db', (err) => {
  if (err) {
    console.error('데이터베이스 연결 실패:', err);
    return;
  }
  console.log('데이터베이스 연결 성공');
});

// 총 레코드 수 확인
db.get('SELECT COUNT(*) as total FROM companies', [], (err, row) => {
  if (err) {
    console.error('쿼리 실행 실패:', err);
    return;
  }
  console.log('총 회사 수:', row.total);
  
  // 삼성전자 데이터 확인 (corp_name에 대해 정확한 매칭 시도)
  db.all('SELECT * FROM companies WHERE corp_name = "삼성전자" OR corp_name LIKE "%삼성전자%"', [], (err, companies) => {
    if (err) {
      console.error('삼성전자 검색 실패:', err);
    } else {
      console.log('삼성전자 관련 데이터:', companies);
    }
    
    // 데이터베이스 연결 종료
    db.close((err) => {
      if (err) {
        console.error('데이터베이스 연결 종료 실패:', err);
        return;
      }
      console.log('데이터베이스 연결 종료');
    });
  });
}); 