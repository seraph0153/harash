-- 관리자 설정 테이블
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  program_start_date DATE NOT NULL,
  reading_days TEXT NOT NULL DEFAULT 'mon,tue,wed,thu,fri',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기본 설정 삽입
INSERT OR IGNORE INTO admin_settings (id, program_start_date, reading_days) 
VALUES (1, '2026-01-21', 'mon,tue,wed,thu,fri');

-- 사용자 아이콘 컬럼 추가
ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN avatar_emoji TEXT DEFAULT '😊';

-- 풍선 댓글 테이블
CREATE TABLE IF NOT EXISTS encouragements_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  reading_log_id INTEGER NOT NULL,
  emoji TEXT NOT NULL,
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id),
  FOREIGN KEY (reading_log_id) REFERENCES reading_logs(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_encouragements_to_user ON encouragements_new(to_user_id);
CREATE INDEX IF NOT EXISTS idx_encouragements_from_user ON encouragements_new(from_user_id);
CREATE INDEX IF NOT EXISTS idx_encouragements_log ON encouragements_new(reading_log_id);

-- 성경 읽기 계획 테이블 수정: 텍스트 컬럼 추가
ALTER TABLE bible_reading_plan ADD COLUMN scripture_text TEXT DEFAULT NULL;
