-- 새롬교회 데이터 삽입
INSERT INTO churches (id, name) VALUES (1, '새롬교회');

-- 기본 배지 데이터
INSERT INTO badges (name, description, icon, requirement_type, requirement_value) VALUES
('첫걸음', '첫 말씀 읽기를 완료했습니다', '🌱', 'total_days', 1),
('일주일 완주', '7일 연속 말씀을 읽었습니다', '🔥', 'streak', 7),
('한달 완주', '30일 연속 말씀을 읽었습니다', '⭐', 'streak', 30),
('백일 완주', '100일 연속 말씀을 읽었습니다', '👑', 'streak', 100),
('꾸준한 독자', '총 50일 말씀을 읽었습니다', '📖', 'total_days', 50),
('헌신된 독자', '총 100일 말씀을 읽었습니다', '📚', 'total_days', 100),
('말씀의 용사', '총 365일 말씀을 읽었습니다', '⚔️', 'total_days', 365);

-- 테스트 팀 데이터 (예시)
INSERT INTO teams (id, name, church_id) VALUES 
(1, '청년부', 1),
(2, '장년부', 1),
(3, '학생부', 1);

-- 테스트 사용자 (비밀번호: test1234)
-- 실제 운영에서는 bcrypt 해시를 사용해야 합니다
INSERT INTO users (name, email, password_hash, team_id, church_id) VALUES
('김성경', 'test1@example.com', 'test1234', 1, 1),
('이말씀', 'test2@example.com', 'test1234', 1, 1),
('박하나님', 'test3@example.com', 'test1234', 2, 1);
