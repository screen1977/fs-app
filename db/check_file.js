const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const corpCodesPath = path.join(__dirname, '../data/corpCodes.json');

try {
  // ������ ���̳ʸ��� �б�
  const buffer = fs.readFileSync(corpCodesPath);
  
  // UTF-8�� ���ڵ� �õ�
  let content = buffer.toString('utf8');
  try {
    const companies = JSON.parse(content);
    console.log('UTF-8 ���ڵ� ����');
    processData(companies);
  } catch (e) {
    console.log('UTF-8 ���ڵ� ����, EUC-KR �õ�');
    // EUC-KR�� ���ڵ� �õ�
    content = iconv.decode(buffer, 'euc-kr');
    const companies = JSON.parse(content);
    processData(companies);
  }
} catch (error) {
  console.error('���� ó�� �� ���� �߻�:', error);
}

function processData(companies) {
  console.log('������ Ÿ��:', typeof companies);
  if (Array.isArray(companies)) {
    console.log('�迭 ����:', companies.length);
    console.log('ù ��° �׸�:', companies[0]);
    
    // �Ｚ���� ã��
    const samsung = companies.find(company => company.corp_name && company.corp_name.includes('�Ｚ����'));
    if (samsung) {
      console.log('\n�Ｚ���� ������:', samsung);
    } else {
      console.log('\n�Ｚ���ڸ� ã�� �� �����ϴ�.');
    }
  } else if (typeof companies === 'object') {
    console.log('��ü ����:', Object.keys(companies));
    if (companies.list) {
      console.log('list �迭 ����:', companies.list.length);
      console.log('ù ��° �׸�:', companies.list[0]);
      
      // �Ｚ���� ã��
      const samsung = companies.list.find(company => company.corp_name && company.corp_name.includes('�Ｚ����'));
      if (samsung) {
        console.log('\n�Ｚ���� ������:', samsung);
      } else {
        console.log('\n�Ｚ���ڸ� ã�� �� �����ϴ�.');
      }
    }
  }
} 