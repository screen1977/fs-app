const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

// �����ͺ��̽� ����
const db = new sqlite3.Database('./db/companies.db', (err) => {
  if (err) {
    console.error('�����ͺ��̽� ���� ����:', err);
    return;
  }
  console.log('�����ͺ��̽� ���� ����');
});

// ȸ�� ���� ���̺� ����
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS companies (
    corp_code TEXT PRIMARY KEY,
    corp_name TEXT NOT NULL,
    stock_code TEXT,
    modify_date TEXT
  )`);

  // corpCodes.json ���� �б�
  const corpCodesPath = path.join(__dirname, '../data/corpCodes.json');
  console.log('���� ���:', corpCodesPath);
  
  try {
    console.log('���� �б� ����');
    const buffer = fs.readFileSync(corpCodesPath);
    console.log('���� �б� �Ϸ�, ����:', buffer.length);
    
    // UTF-8�� ���ڵ� �õ�
    let content = buffer.toString('utf8');
    let companies;
    
    try {
      companies = JSON.parse(content);
      console.log('UTF-8 ���ڵ� ����');
    } catch (e) {
      console.log('UTF-8 ���ڵ� ����, EUC-KR �õ�');
      // EUC-KR�� ���ڵ� �õ�
      content = iconv.decode(buffer, 'euc-kr');
      companies = JSON.parse(content);
    }

    if (Array.isArray(companies)) {
      console.log('ȸ�� ������ ����:', companies.length);
      
      // ������ ������ ���� prepared statement
      const stmt = db.prepare('INSERT OR REPLACE INTO companies (corp_code, corp_name, stock_code, modify_date) VALUES (?, ?, ?, ?)');

      // ������ ����
      companies.forEach((company, index) => {
        if (company.corp_name && company.corp_name.includes('�Ｚ����')) {
          console.log('�Ｚ���� ������:', company);
        }
        stmt.run(company.corp_code, company.corp_name, company.stock_code, company.modify_date);
        if (index % 1000 === 0) {
          console.log(`${index}�� ȸ�� ���� �Է� �Ϸ�`);
        }
      });

      stmt.finalize();
      console.log('�����ͺ��̽� �ʱ�ȭ �Ϸ�');
    } else {
      console.error('ȸ�� �ڵ� �����Ͱ� �ùٸ� ������ �ƴմϴ�.');
      console.log('������ ����:', JSON.stringify(companies).slice(0, 200) + '...');
    }
  } catch (error) {
    console.error('���� ó�� �� ���� �߻�:', error);
  }
});

// �����ͺ��̽� ���� ����
db.close((err) => {
  if (err) {
    console.error('�����ͺ��̽� ���� ���� ����:', err);
    return;
  }
  console.log('�����ͺ��̽� ���� ����');
}); 