const sqlite3 = require('sqlite3').verbose();

// �ܼ� ��� ���ڵ� ����
process.stdout.setEncoding('utf8');

// �����ͺ��̽� ����
const db = new sqlite3.Database('./db/companies.db', (err) => {
  if (err) {
    console.error('�����ͺ��̽� ���� ����:', err);
    return;
  }
  console.log('�����ͺ��̽� ���� ����');
});

// �� ���ڵ� �� Ȯ��
db.get('SELECT COUNT(*) as total FROM companies', [], (err, row) => {
  if (err) {
    console.error('���� ���� ����:', err);
    return;
  }
  console.log('�� ȸ�� ��:', row.total);
  
  // �Ｚ���� ������ Ȯ�� (corp_name�� ���� ��Ȯ�� ��Ī �õ�)
  db.all('SELECT * FROM companies WHERE corp_name = "�Ｚ����" OR corp_name LIKE "%�Ｚ����%"', [], (err, companies) => {
    if (err) {
      console.error('�Ｚ���� �˻� ����:', err);
    } else {
      console.log('�Ｚ���� ���� ������:', companies);
    }
    
    // �����ͺ��̽� ���� ����
    db.close((err) => {
      if (err) {
        console.error('�����ͺ��̽� ���� ���� ����:', err);
        return;
      }
      console.log('�����ͺ��̽� ���� ����');
    });
  });
}); 