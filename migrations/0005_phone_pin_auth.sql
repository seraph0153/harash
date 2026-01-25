-- 0005: phone+pin 인증 전환 + 외부ID 컬럼 추가 + 시작일 보정

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- churches/teams/users에 외부 ID(시트의 C001/T001/U001 같은 값) 저장용 컬럼 추가
ALTER TABLE churches ADD COLUMN external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_churches_external_id ON churches(external_id);

ALTER TABLE teams ADD COLUMN external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_external_id ON teams(external_id);

-- users 테이블을 새 스키마로 재구성 (email/password는 선택으로 남기고, phone/pin_hash/pin_salt 추가)
ALTER TABLE users RENAME TO users_old;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,            -- U001 같은 외부 식별자
  name TEXT NOT NULL,

  phone TEXT UNIQUE,                 -- 로그인 키 (하이픈 없는 숫자 문자열 권장)
  pin_hash TEXT,                     -- SHA-256 해시
  pin_salt TEXT,                     -- 사용자별 salt

  email TEXT UNIQUE,                 -- (구버전 호환용, 선택)
  password_hash TEXT,                -- (구버전 호환용, 선택)

  team_id INTEGER,
  church_id INTEGER NOT NULL,

  role TEXT DEFAULT 'member',
  avatar_url TEXT DEFAULT NULL,
  avatar_emoji TEXT DEFAULT '😊',

  streak_count INTEGER DEFAULT 0,
  total_days_read INTEGER DEFAULT 0,
  last_read_date DATE,

  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (church_id) REFERENCES churches(id)
);

-- 기존 데이터 복사(있으면 유지). phone/pin은 비워둠.
INSERT INTO users (
  id, name, email, password_hash, team_id, church_id,
  streak_count, total_days_read, last_read_date, created_at,
  role, avatar_url, avatar_emoji
)
SELECT
  id, name, email, password_hash, team_id, church_id,
  streak_count, total_days_read, last_read_date, created_at,
  role, avatar_url, avatar_emoji
FROM users_old;

DROP TABLE users_old;

-- 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 기본 교회 외부ID는 일단 C001로(원하면 바꿔도 됨)
UPDATE churches SET external_id = 'C001' WHERE id = 1 AND (external_id IS NULL OR external_id = '');

-- 프로그램 시작일(관리자 설정) 오늘 시작으로 보정 (원하신 시작일: 2026-01-19)
UPDATE admin_settings SET program_start_date = '2026-01-19' WHERE id = 1;

COMMIT;
PRAGMA foreign_keys=ON;
