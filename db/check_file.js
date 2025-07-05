const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const corpCodesPath = path.join(__dirname, '../data/corpCodes.json');

try {
  // 파일을 바이너리로 읽기
  const buffer = fs.readFileSync(corpCodesPath);
  
  // UTF-8로 디코딩 시도
  let content = buffer.toString('utf8');
  try {
    const companies = JSON.parse(content);
    console.log('UTF-8 디코딩 성공');
    processData(companies);
  } catch (e) {
    console.log('UTF-8 디코딩 실패, EUC-KR 시도');
    // EUC-KR로 디코딩 시도
    content = iconv.decode(buffer, 'euc-kr');
    const companies = JSON.parse(content);
    processData(companies);
  }
} catch (error) {
  console.error('파일 처리 중 오류 발생:', error);
}

function processData(companies) {
  console.log('데이터 타입:', typeof companies);
  if (Array.isArray(companies)) {
    console.log('배열 길이:', companies.length);
    console.log('첫 번째 항목:', companies[0]);
    
    // 삼성전자 찾기
    const samsung = companies.find(company => company.corp_name && company.corp_name.includes('삼성전자'));
    if (samsung) {
      console.log('\n삼성전자 데이터:', samsung);
    } else {
      console.log('\n삼성전자를 찾을 수 없습니다.');
    }
  } else if (typeof companies === 'object') {
    console.log('객체 구조:', Object.keys(companies));
    if (companies.list) {
      console.log('list 배열 길이:', companies.list.length);
      console.log('첫 번째 항목:', companies.list[0]);
      
      // 삼성전자 찾기
      const samsung = companies.list.find(company => company.corp_name && company.corp_name.includes('삼성전자'));
      if (samsung) {
        console.log('\n삼성전자 데이터:', samsung);
      } else {
        console.log('\n삼성전자를 찾을 수 없습니다.');
      }
    }
  }
} 