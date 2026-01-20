-- 사용자 테이블에 역할(role) 컬럼 추가
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'member';

-- 역할 종류:
-- 'senior_pastor' : 담임목사
-- 'associate_pastor' : 부목사
-- 'minister' : 교역자
-- 'team_leader' : 담당팀장
-- 'deputy_leader' : 부팀장
-- 'member' : 팀원

-- Google Sheets 동기화 로그 테이블
CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
