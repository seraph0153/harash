-- 성경 읽기 계획 테이블
CREATE TABLE IF NOT EXISTS bible_reading_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_number INTEGER NOT NULL UNIQUE,
  week_day TEXT NOT NULL,
  book_name TEXT NOT NULL,
  start_chapter INTEGER NOT NULL,
  end_chapter INTEGER NOT NULL,
  date DATE
);

-- 성경 본문 캐시 테이블 (개역개정)
CREATE TABLE IF NOT EXISTS bible_texts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_name TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  UNIQUE(book_name, chapter, verse)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_bible_plan_day ON bible_reading_plan(day_number);
CREATE INDEX IF NOT EXISTS idx_bible_plan_date ON bible_reading_plan(date);
CREATE INDEX IF NOT EXISTS idx_bible_texts_book_chapter ON bible_texts(book_name, chapter);
