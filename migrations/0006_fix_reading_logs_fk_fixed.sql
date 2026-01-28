-- 0006: reading_logs 테이블의 FK 수정 (TRANSACTION 제거 버전)

PRAGMA foreign_keys=OFF;

-- 1. 기존 테이블 백업
ALTER TABLE reading_logs RENAME TO reading_logs_backup;

-- 2. 새 테이블 생성 (users 테이블 참조)
CREATE TABLE IF NOT EXISTS reading_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL,
  chapters_read INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);

-- 3. 데이터 복사
INSERT INTO reading_logs (id, user_id, date, chapters_read, completed, created_at)
SELECT id, user_id, date, chapters_read, completed, created_at
FROM reading_logs_backup;

-- 4. 백업 테이블 삭제
DROP TABLE reading_logs_backup;

-- 5. 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_reading_logs_user_date ON reading_logs(user_id, date);

PRAGMA foreign_keys=ON;
