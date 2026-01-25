import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { BIBLE_BOOK_CODES } from './bibleMapping'

type Bindings = {
  DB: D1Database
  GOOGLE_SHEETS_API_KEY?: string
  OPENAI_API_KEY?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// PIN 해시 헬퍼
async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Google Sheets 설정
const DEFAULT_SPREADSHEET_ID = '10LSlQ8cj944t3wEZ34fILJMJiz9_takPNFVCK4h0yDM'
const SHEET_NAME = 'Sheet1' // 시트 이름 (필요시 변경)

// Helper to get Sheet ID
async function getSpreadsheetId(db: any) {
  const settings = await db.prepare('SELECT spreadsheet_id FROM admin_settings WHERE id = 1').first()
  return settings?.spreadsheet_id || DEFAULT_SPREADSHEET_ID
}

// 역할 매핑
const ROLE_MAP: Record<string, string> = {
  '담임목사': 'senior_pastor',
  '부목사': 'associate_pastor',
  '교역자': 'minister',
  '담당팀장': 'team_leader',
  '부팀장': 'deputy_leader',
  '팀원': 'member'
}

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 서빙 - _routes.json에서 처리하므로 미들웨어 제거

// API 라우트

// 성경 본문 API (JSON 기반)
let bibleData: Record<string, string> | null = null

// Bible JSON 로드 (캐싱)
async function loadBibleData() {
  if (bibleData) return bibleData

  try {
    const response = await fetch(new URL('/data/bible.json', 'http://localhost').href)
    bibleData = await response.json()
    return bibleData
  } catch (e) {
    console.error('Failed to load bible.json:', e)
    return null
  }
}

// 로그인 (휴대폰 + PIN)
app.post('/api/login', async (c) => {
  const { phone, pin } = await c.req.json()

  if (!phone || !pin) {
    return c.json({ error: '휴대폰 번호와 PIN을 입력해주세요.' }, 400)
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE phone = ?'
  ).bind(phone).first()

  if (!user) {
    return c.json({ error: '등록되지 않은 사용자입니다.' }, 401)
  }

  // PIN 검증
  if (!user.pin_hash || !user.pin_salt) {
    // 마이그레이션 과도기 처리: PIN이 없으면 로그인이 불가하므로 에러 리턴
    return c.json({ error: 'PIN 설정이 필요합니다. 관리자에게 문의하세요.' }, 403)
  }

  const inputHash = await hashPin(pin, user.pin_salt as string)
  if (inputHash !== user.pin_hash) {
    return c.json({ error: 'PIN 번호가 일치하지 않습니다.' }, 401)
  }

  return c.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      // email: user.email, // email은 이제 선택사항
      phone: user.phone,
      team_id: user.team_id,
      church_id: user.church_id,
      streak_count: user.streak_count,
      total_days_read: user.total_days_read,
      role: user.role,
      avatar_emoji: user.avatar_emoji,
      avatar_url: user.avatar_url
    }
  })
})

// 회원가입
app.post('/api/register', async (c) => {
  const { name, phone, pin, team_id } = await c.req.json()

  if (!name || !phone || !pin) {
    return c.json({ error: '필수 정보를 입력해주세요.' }, 400)
  }

  if (pin.length < 4) {
    return c.json({ error: 'PIN은 4자리 이상이어야 합니다.' }, 400)
  }

  // 중복 확인
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first()
  if (existing) {
    return c.json({ error: '이미 등록된 휴대폰 번호입니다.' }, 400)
  }

  // PIN 해시
  const salt = crypto.randomUUID()
  const pinHash = await hashPin(pin, salt)

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO users (name, phone, pin_hash, pin_salt, team_id, church_id, role, created_at)
       VALUES (?, ?, ?, ?, ?, 1, 'member', CURRENT_TIMESTAMP)
       RETURNING *`
    ).bind(name, phone, pinHash, salt, team_id || null).first()

    if (!result) throw new Error('회원가입 실패')

    return c.json({
      success: true,
      user: {
        id: result.id,
        name: result.name,
        phone: result.phone,
        role: result.role,
        avatar_emoji: result.avatar_emoji
      }
    })
  } catch (e) {
    console.error(e)
    return c.json({ error: '회원가입 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// 사용자 정보 조회
app.get('/api/user/:id', async (c) => {
  const userId = c.req.param('id')

  const user = await c.env.DB.prepare(
    `SELECT u.*, t.name as team_name, ch.name as church_name 
     FROM users u 
     LEFT JOIN teams t ON u.team_id = t.id
     LEFT JOIN churches ch ON u.church_id = ch.id
     WHERE u.id = ?`
  ).bind(userId).first()

  if (!user) {
    return c.json({ error: '사용자를 찾을 수 없습니다.' }, 404)
  }

  return c.json(user)
})

// 오늘의 읽기 기록 조회
app.get('/api/reading/:userId/today', async (c) => {
  const userId = c.req.param('userId')
  const today = new Date().toISOString().split('T')[0]

  const log = await c.env.DB.prepare(
    'SELECT * FROM reading_logs WHERE user_id = ? AND date = ?'
  ).bind(userId, today).first()

  return c.json(log || { chapters_read: 0, completed: false })
})

// 읽기 기록 저장/업데이트
app.post('/api/reading/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const body = await c.req.json()
    const chapters_read = body.chapters_read
    const day_number = body.day_number ? parseInt(body.day_number) : undefined

    if (!userId) throw new Error('User ID is missing');

    const today = new Date().toISOString().split('T')[0]
    const completed = chapters_read >= 5

    // 읽기 기록 저장 (오늘 활동 기록)
    await c.env.DB.prepare(
      `INSERT INTO reading_logs (user_id, date, chapters_read, completed) 
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, date) 
       DO UPDATE SET chapters_read = ?, completed = ?`
    ).bind(userId, today, chapters_read, completed ? 1 : 0, chapters_read, completed ? 1 : 0).run()

    // Streak 및 진행도 계산
    if (completed) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      // 1. 어제 읽었는지 확인 (completed = 1)
      const yesterdayLog = await c.env.DB.prepare(
        'SELECT id FROM reading_logs WHERE user_id = ? AND date = ? AND completed = 1'
      ).bind(userId, yesterdayStr).first()

      // 2. 사용자 정보 조회
      const user = await c.env.DB.prepare(
        'SELECT streak_count, last_read_date, total_days_read FROM users WHERE id = ?'
      ).bind(userId).first()

      if (user) {
        const currentStreak = user.streak_count || 0
        const totalRead = user.total_days_read || 0
        const lastReadDate = user.last_read_date

        let newStreak = currentStreak

        // 오늘 처음 읽는 경우에만 스트릭 로직 적용
        if (lastReadDate !== today) {
          newStreak = 1; // 끊겼으면 1, 이어졌으면 +1
          if (yesterdayLog) {
            newStreak = currentStreak + 1
          } else if (lastReadDate === yesterdayStr) {
            // Should not happen if checking reading_logs, but just in case
            newStreak = currentStreak + 1
          }
        }

        // 진행도 (Total Days Read) 계산
        // day_number가 있으면 그 값으로 업데이트 (Catch-up 지원)
        // 없으면 기존 방식 (하루 1회 제한)
        let newTotalDays = totalRead
        if (day_number) {
          // 현재 진행도보다 높은 날짜를 완료했을 때만 업데이트 (중복 방지)
          if (day_number > totalRead) {
            newTotalDays = day_number;
          }
        } else {
          // Fallback (구버전 호환)
          if (lastReadDate !== today) {
            newTotalDays = totalRead + 1
          }
        }

        await c.env.DB.prepare(
          'UPDATE users SET streak_count = ?, total_days_read = ?, last_read_date = ? WHERE id = ?'
        ).bind(newStreak, newTotalDays, today, userId).run()

        return c.json({ success: true, completed: true, streak: newStreak, total_days_read: newTotalDays })
      }
    }

    return c.json({ success: true, completed: false })
  } catch (e: any) {
    console.error('Reading log error:', e)
    return c.json({ error: e.message || '기록 저장 중 오류가 발생했습니다.' }, 500)
  }
})

// 팀 순위
app.get('/api/leaderboard/teams', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT 
      t.id,
      t.name,
      COUNT(DISTINCT u.id) as member_count,
      SUM(u.total_days_read) as total_reads,
      AVG(u.streak_count) as avg_streak
     FROM teams t
     LEFT JOIN users u ON t.id = u.team_id
     GROUP BY t.id, t.name
     ORDER BY total_reads DESC`
  ).all()

  return c.json(result.results)
})

// 개인 순위
app.get('/api/leaderboard/users', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT 
      u.id,
      u.name,
      u.streak_count,
      u.total_days_read,
      t.name as team_name
     FROM users u
     LEFT JOIN teams t ON u.team_id = t.id
     ORDER BY u.total_days_read DESC, u.streak_count DESC
     LIMIT 50`
  ).all()

  return c.json(result.results)
})

// 사용자 배지 조회
app.get('/api/badges/:userId', async (c) => {
  const userId = c.req.param('userId')

  const result = await c.env.DB.prepare(
    `SELECT b.*, ub.earned_at
     FROM user_badges ub
     JOIN badges b ON ub.badge_id = b.id
     WHERE ub.user_id = ?
     ORDER BY ub.earned_at DESC`
  ).bind(userId).all()

  return c.json(result.results)
})

// 성경 읽기 계획 조회
app.get('/api/bible-plan', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM bible_reading_plan ORDER BY day_number'
  ).all()

  return c.json(result.results)
})

// 오늘의 성경 읽기 계획
app.get('/api/bible-plan/today', async (c) => {
  const today = new Date().toISOString().split('T')[0]

  const plan = await c.env.DB.prepare(
    'SELECT * FROM bible_reading_plan WHERE date = ?'
  ).bind(today).first()

  if (!plan) {
    return c.json({ error: '오늘의 계획이 없습니다.' }, 404)
  }

  return c.json(plan)
})

// 성경 본문 조회
app.get('/api/bible/:book/:chapter', async (c) => {
  const book = c.req.param('book')
  const chapter = parseInt(c.req.param('chapter'))

  const result = await c.env.DB.prepare(
    'SELECT * FROM bible_texts WHERE book_name = ? AND chapter = ? ORDER BY verse'
  ).bind(book, chapter).all()

  return c.json(result.results)
})

// 팀원들의 진행도 조회 (맵에 표시용)
app.get('/api/team/:teamId/progress', async (c) => {
  const teamId = c.req.param('teamId')

  const result = await c.env.DB.prepare(
    `SELECT 
      u.id,
      u.name,
      u.total_days_read,
      u.streak_count,
      u.avatar_emoji,
      u.avatar_url
     FROM users u
     WHERE u.team_id = ?
     ORDER BY u.total_days_read DESC`
  ).bind(teamId).all()

  return c.json(result.results)
})

// 관리자 설정 조회
app.get('/api/admin/settings', async (c) => {
  const settings = await c.env.DB.prepare(
    'SELECT * FROM admin_settings WHERE id = 1'
  ).first()

  return c.json(settings || {
    program_start_date: '2026-01-21',
    reading_days: 'mon,tue,wed,thu,fri',
    spreadsheet_id: DEFAULT_SPREADSHEET_ID
  })
})

// 관리자 설정 업데이트
app.post('/api/admin/settings', async (c) => {
  const { program_start_date, reading_days, spreadsheet_id } = await c.req.json()

  await c.env.DB.prepare(
    `INSERT INTO admin_settings (id, program_start_date, reading_days, spreadsheet_id, updated_at)
     VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET 
       program_start_date = ?,
       reading_days = ?,
       spreadsheet_id = ?,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(
    program_start_date,
    reading_days,
    spreadsheet_id || DEFAULT_SPREADSHEET_ID,
    program_start_date,
    reading_days,
    spreadsheet_id || DEFAULT_SPREADSHEET_ID
  ).run()

  return c.json({ success: true })
})

// 사용자 아바타 업데이트
app.post('/api/user/:userId/avatar', async (c) => {
  const userId = c.req.param('userId')
  const { avatar_emoji, avatar_url } = await c.req.json()

  await c.env.DB.prepare(
    'UPDATE users SET avatar_emoji = ?, avatar_url = ? WHERE id = ?'
  ).bind(avatar_emoji || null, avatar_url || null, userId).run()

  return c.json({ success: true })
})

// 풍선 댓글 추가
app.post('/api/encouragement', async (c) => {
  const { from_user_id, to_user_id, reading_log_id, emoji, message } = await c.req.json()

  await c.env.DB.prepare(
    'INSERT INTO encouragements_new (from_user_id, to_user_id, reading_log_id, emoji, message) VALUES (?, ?, ?, ?, ?)'
  ).bind(from_user_id, to_user_id, reading_log_id, emoji, message || null).run()

  return c.json({ success: true })
})

// 특정 읽기 로그의 풍선 댓글 조회
app.get('/api/encouragement/log/:logId', async (c) => {
  const logId = c.req.param('logId')

  const result = await c.env.DB.prepare(
    `SELECT e.*, u.name as from_user_name
     FROM encouragements_new e
     JOIN users u ON e.from_user_id = u.id
     WHERE e.reading_log_id = ?
     ORDER BY e.created_at DESC`
  ).bind(logId).all()

  return c.json(result.results)
})

// 전체 팀원 진행도 조회 (가로 맵용)
app.get('/api/progress/all', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT 
      u.id,
      u.name,
      u.total_days_read,
      u.streak_count,
      u.avatar_emoji,
      u.avatar_url,
      t.name as team_name
     FROM users u
     LEFT JOIN teams t ON u.team_id = t.id
     WHERE u.church_id = 1 AND u.active = 1
     ORDER BY u.total_days_read DESC`
  ).all()

  return c.json(result.results)
})

// Google Sheets 동기화 (전체 사용자)
app.post('/api/sync/sheets', async (c) => {
  try {
    const spreadsheetId = await getSpreadsheetId(c.env.DB)
    const apiKey = c.env.GOOGLE_SHEETS_API_KEY
    const range = 'Sheet1!A2:E' // 헤더 제외 데이터만 가져오기

    // API URL 구성
    let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`

    // API 키가 없는 경우 (공개 시트 CSV/JSON 방식 시도)
    if (!apiKey) {
      // Google Sheets JSON endpoint hack for public sheets
      url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Sheet1` // Assuming 'Sheet1' is the default sheet name
    }

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Google Sheets API Error: ${response.statusText}`)
    }

    let rows: any[] = []

    if (apiKey) {
      // 정식 API 사용
      const data = await response.json()
      rows = data.values || []
    } else {
      // 공개 시트 JSON 파싱 (gviz/tq)
      const text = await response.text()

      // HTML 응답(로그인 페이지 등)인지 확인
      if (text.trim().startsWith('<')) {
        throw new Error('구글 시트가 비공개 상태입니다. 시트 우측 상단 [공유] 버튼을 눌러 "링크가 있는 모든 사용자에게 공개"로 설정해주세요.')
      }

      // "/*O_o*/ google.visualization.Query.setResponse({ ... });" 형태 제거
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) {
        throw new Error('Google Sheet 데이터 형식이 올바르지 않습니다.');
      }
      const jsonText = text.substring(start, end + 1);

      const data = JSON.parse(jsonText);
      // gviz 포맷: table.rows[i].c[j].v
      rows = data.table.rows.map((row: any) =>
        row.c.map((cell: any) => cell ? (cell.v ?? '') : '')
      )
    }

    if (rows.length === 0) {
      return c.json({ error: '데이터가 없습니다. Sheet1의 A2부터 데이터를 입력해주세요.' }, 400)
    }

    let syncedCount = 0
    let errorCount = 0

    const syncedPhones = new Set<string>();

    for (const row of rows) {
      try {
        const name = row[0]
        // 전화번호: 숫자만 남기고 제거 (하이픈, 공백 등)
        const phoneRaw = row[1] || ''
        const phone = phoneRaw.replace(/[^0-9]/g, '')

        const pin = row[2] || '1234'
        const roleKr = row[3] || '팀원'
        const teamName = row[4]

        if (!name || !phone) continue

        syncedPhones.add(phone);

        const role = ROLE_MAP[roleKr] || 'member'

        // 팀 찾기 또는 생성
        let teamId = null
        if (teamName) {
          const team = await c.env.DB.prepare(
            'SELECT id FROM teams WHERE name = ? AND church_id = 1'
          ).bind(teamName).first()

          if (team) {
            teamId = team.id
          } else {
            const newTeam = await c.env.DB.prepare(
              'INSERT INTO teams (name, church_id) VALUES (?, 1) RETURNING id'
            ).bind(teamName).first()
            teamId = newTeam?.id
          }
        }

        // PIN 해시 생성
        const salt = phone.substring(0, 6)
        const pinHash = await hashPin(pin, salt)

        // 사용자 생성 또는 업데이트 (active = 1 설정)
        await c.env.DB.prepare(
          `INSERT INTO users (name, phone, pin_hash, role, team_id, church_id, active)
           VALUES (?, ?, ?, ?, ?, 1, 1)
           ON CONFLICT(phone) 
           DO UPDATE SET name = ?, role = ?, team_id = ?, active = 1`
        ).bind(
          name, phone, pinHash, role, teamId,
          name, role, teamId
        ).run()

        syncedCount++
      } catch (err) {
        errorCount++
        console.error('Row sync error:', err)
      }
    }

    // 시트에 없는 사용자 비활성화 (Strict Sync)
    if (syncedPhones.size > 0) {
      // SQLite IN clause limitation workaround or simple join?
      // Since list is small (<500 likely), straight IN clause is fine.
      const placeholders = Array.from(syncedPhones).map(() => '?').join(',');
      await c.env.DB.prepare(
        `UPDATE users SET active = 0 WHERE church_id = 1 AND phone NOT IN (${placeholders})`
      ).bind(...Array.from(syncedPhones)).run();
    }

    // 동기화 로그 저장
    await c.env.DB.prepare(
      'INSERT INTO sync_logs (sync_type, status, message) VALUES (?, ?, ?)'
    ).bind(
      'google_sheets',
      'success',
      `${syncedCount}명 동기화 완료 (Strict Mode), ${errorCount}개 오류`
    ).run()

    return c.json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      message: `${syncedCount}명의 교인 데이터를 동기화했습니다.`
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'

    await c.env.DB.prepare(
      'INSERT INTO sync_logs (sync_type, status, message) VALUES (?, ?, ?)'
    ).bind('google_sheets', 'error', errorMessage).run()

    return c.json({
      error: 'Google Sheets 동기화 실패',
      details: errorMessage
    }, 500)
  }
})

// 성경 읽기표 동기화 (Google Sheets Sheet2)
app.post('/api/sync/bible', async (c) => {
  try {
    const spreadsheetId = await getSpreadsheetId(c.env.DB)
    const apiKey = c.env.GOOGLE_SHEETS_API_KEY
    const range = 'Sheet2!A2:D' // A:날짜, B:요일, C:범위, D:본문

    // API URL 구성
    let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`

    if (!apiKey) {
      url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Sheet2`
    }

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Google Sheets API Error: ${response.statusText}`)
    }

    let rows: any[] = []

    if (apiKey) {
      const data = await response.json()
      rows = data.values || []
    } else {
      const text = await response.text()
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) {
        throw new Error('Google Sheet 데이터 형식이 올바르지 않습니다.');
      }
      const jsonText = text.substring(start, end + 1);
      const data = JSON.parse(jsonText)
      rows = data.table.rows.map((row: any) =>
        row.c.map((cell: any) => cell ? (cell.v ?? '') : '')
      )
    }

    if (rows.length === 0) {
      return c.json({ error: '데이터가 없습니다.' }, 400)
    }

    // 데이터 유효성 검사 (Safety Check)
    // 실수로 Sheet1(회원정보)을 읽어왔는지 확인
    const firstRow = rows[0];
    const headerString = JSON.stringify(firstRow);

    // 헤더에 '이름', '전화번호', '직분' 등이 포함되어 있다면 Sheet1임
    // 또는 첫번째 열이 날짜가 아니라 사람 이름인 경우
    if (headerString.includes('이름') || headerString.includes('전화번호') || headerString.includes('직분') || headerString.includes('010')) {
      throw new Error('시트 데이터가 올바르지 않습니다. 현재 [강해 설교]가 아닌 [회원 명단]을 읽고 있는 것 같습니다. 구글 시트 하단의 탭 이름이 "Sheet2"가 맞는지 확인해주세요. (탭이 없으면 새로 만들어야 합니다)');
    }

    // 기존 데이터 삭제 (전체 재동기화)
    await c.env.DB.prepare('DELETE FROM bible_reading_plan').run()

    let syncedCount = 0
    let errorCount = 0
    const stmt = c.env.DB.prepare(
      `INSERT INTO bible_reading_plan (day_number, week_day, book_name, start_chapter, end_chapter, date, scripture_text)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )

    const batch = []
    let firstError = null;

    // Start Date: Jan 5, 2026 (Mon)
    const startDateObj = new Date(2026, 0, 5);

    for (const [index, row] of rows.entries()) {
      try {
        // [DayNum, Date(Broken), Weekday, Range, Content]
        const dayNumRaw = String(row[0] || '');
        let dayNum = index + 1;

        if (dayNumRaw.match(/^\d+$/)) {
          dayNum = parseInt(dayNumRaw);
        }

        // Calculate Date (Mon-Fri schedule)
        const weeks = Math.floor((dayNum - 1) / 5);
        const remainder = (dayNum - 1) % 5;
        const addDays = weeks * 7 + remainder;

        const targetDate = new Date(startDateObj);
        targetDate.setDate(startDateObj.getDate() + addDays);

        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dayVal = String(targetDate.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${dayVal}`;

        const weekDay = row[2];
        const rangeText = row[3];
        const content = row[4];

        if (!rangeText) continue;

        // 범위 파싱: "창세기 1-5장" 또는 "창세기 1장"
        // 1. 책 이름 추출 (숫자 앞까지)
        const bookMatch = rangeText.match(/^([가-힣]+)/)
        if (!bookMatch) throw new Error('책 이름을 찾을 수 없습니다.')
        const bookName = bookMatch[1]

        // 2. 장 추출
        let startChap = 1
        let endChap = 1

        const chapterMatch = rangeText.match(/(\d+)(?:-(\d+))?/)
        if (chapterMatch) {
          startChap = parseInt(chapterMatch[1])
          endChap = chapterMatch[2] ? parseInt(chapterMatch[2]) : startChap
        }

        batch.push(stmt.bind(
          index + 1, // day_number
          weekDay,
          bookName,
          startChap,
          endChap,
          date,
          content || null
        ))

        syncedCount++
      } catch (e: any) {
        console.error(`Row ${index} error:`, e)
        if (!firstError) firstError = `Row ${index}: ${e.message}`;
        errorCount++
      }
    }

    if (batch.length > 0) {
      await c.env.DB.batch(batch)
      // Update start date
      await c.env.DB.prepare(
        `UPDATE admin_settings SET program_start_date = (SELECT date FROM bible_reading_plan ORDER BY day_number ASC LIMIT 1) WHERE id = 1`
      ).run();
    }

    return c.json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      message: `${syncedCount}일치 성경 읽기표를 동기화했습니다.`,
      first_error: firstError
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    return c.json({ error: '성경 읽기표 동기화 실패', details: errorMessage }, 500)
  }
})

// 관리자 대시보드 - 전체 교인 현황
app.get('/api/admin/dashboard', async (c) => {
  // 역할별 통계
  const roleStats = await c.env.DB.prepare(
    `SELECT 
      role,
      COUNT(*) as count,
      AVG(total_days_read) as avg_days,
      AVG(streak_count) as avg_streak
     FROM users
     GROUP BY role`
  ).all()

  // 팀별 통계
  const teamStats = await c.env.DB.prepare(
    `SELECT 
      t.name as team_name,
      COUNT(u.id) as member_count,
      AVG(u.total_days_read) as avg_days,
      MAX(u.total_days_read) as max_days
     FROM teams t
     LEFT JOIN users u ON t.id = u.team_id
     GROUP BY t.id, t.name
     ORDER BY avg_days DESC`
  ).all()

  // 전체 통계
  const totalStats = await c.env.DB.prepare(
    `SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN total_days_read > 0 THEN 1 ELSE 0 END) as active_users,
      AVG(total_days_read) as avg_days,
      MAX(streak_count) as max_streak
     FROM users`
  ).first()

  return c.json({
    roles: roleStats.results,
    teams: teamStats.results,
    total: totalStats
  })
})

// 메인 페이지
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>하라쉬 말씀읽기 - 새롬교회</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          }
          .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .card-hover {
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.15);
          }
          .progress-ring {
            transform: rotate(-90deg);
          }
          .streak-fire {
            animation: flicker 1.5s infinite alternate;
          }
          @keyframes flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})




app.get('/api/bible/text', async (c) => {
  const book = c.req.query('book')
  const chapter = c.req.query('chapter')

  if (!book || !chapter) {
    return c.json({ error: 'Book and chapter are required' }, 400)
  }

  const bookCode = BIBLE_BOOK_CODES[book]
  if (!bookCode) {
    return c.json({ error: `Unknown book: ${book}` }, 400)
  }

  // 대한성서공회 오디오 URL
  const audioUrl = `https://www.bskorea.or.kr/bible/listen.php?version=GAE&book=${bookCode}&chap=${chapter}`
  const sourceUrl = `https://www.bskorea.or.kr/bible/korbibReadpage.php?version=GAE&book=${bookCode}&chap=${chapter}`

  try {
    // Bible JSON 로드
    const bible = await loadBibleData()
    if (!bible) {
      console.error('Bible data check failed: bible is null')
      return c.json({
        html: '',
        audio_url: audioUrl,
        source_url: sourceUrl,
        debug: 'Bible data load failed'
      })
    }

    // 책 약어 매핑 (예: 창세기 -> 창)
    // BIBLE_BOOK_CODES에는 '창세기': 'gen', '창': 'gen' 둘 다 있으므로
    // 길이가 짧은 것('창')을 찾아야 JSON 키('창1:1')와 일치함
    const bookAbbr = Object.entries(BIBLE_BOOK_CODES)
      .filter(([_, code]) => code === bookCode)
      .map(([key, _]) => key)
      .sort((a, b) => a.length - b.length)[0]

    if (!bookAbbr) {
      console.error('Book abbreviation not found for:', bookCode)
      return c.json({
        html: '',
        audio_url: audioUrl,
        source_url: sourceUrl,
        debug: `No abbr found for ${bookCode}`
      })
    }

    console.log(`Fetching bible text for: ${bookAbbr} ${chapter}장`)

    // 해당 장의 모든 절 가져오기
    const verses: string[] = []
    let verseNum = 1

    // 디버그: 첫 번째 키 확인
    const firstKey = `${bookAbbr}${chapter}:${verseNum}`
    const firstVal = bible[firstKey]
    if (!firstVal) {
      console.warn(`First verse not found: ${firstKey}`)
      // 샘플 키 확인
      const sampleKeys = Object.keys(bible).slice(0, 5)
      return c.json({
        html: '',
        audio_url: audioUrl,
        source_url: sourceUrl,
        debug: `Verse not found: ${firstKey}`,
        sample_keys: sampleKeys,
        data_size: Object.keys(bible).length
      })
    }

    while (true) {
      const key = `${bookAbbr}${chapter}:${verseNum}`
      const text = bible[key]

      if (!text) break

      verses.push(`<p class="mb-3"><b class="text-purple-700">${verseNum}.</b> ${text}</p>`)
      verseNum++
    }

    if (verses.length === 0) {
      return c.json({
        html: '',
        audio_url: audioUrl,
        source_url: sourceUrl
      })
    }

    const html = verses.join('\n')

    return c.json({
      html,
      audio_url: audioUrl,
      source_url: sourceUrl
    })

  } catch (e) {
    console.error('Bible fetch error:', e)
    return c.json({ error: 'Failed to fetch bible text' }, 500)
  }
})

// SPA Fallback (모든 기타 요청은 index.html 반환)
app.get('*', async (c) => {
  return c.html(await (await fetch(new URL('/index.html', c.req.url).origin + '/static/index.html')).text())
})

// 또는 더 간단하게 로컬 파일 읽기 (Wrangler 환경)
// 하지만 serveStatic이 이미 /static/*을 처리하므로, 여기서는 루트의 index.html을 서빙해야 함.
// wrangler pages dev에서는 _worker.js가 dist/index.html을 직접 서빙하기 어려울 수 있음.
// 가장 확실한 방법은 클라이언트 라우팅을 HashRouter로 바꾸는 것이지만,
// 일단 서버 사이드에서 index.html을 반환하도록 시도.

// OpenAI TTS Proxy
app.post('/api/tts', async (c) => {
  try {
    const body = await c.req.json()
    const { text, voice } = body
    // 서버 키 확인
    const serverKey = c.env.OPENAI_API_KEY
    console.log(`[TTS Debug] Client Key: ${body.apiKey ? 'Yes' : 'No'}, Server Key: ${serverKey ? 'Yes (' + serverKey.length + ')' : 'No'}`)

    const apiKey = body.apiKey || serverKey

    if (!apiKey) {
      console.error('[TTS Debug] No API Key available')
      return c.json({ error: 'API Key Missing' }, 401)
    }

    console.log(`[TTS Debug] Relaying to OpenAI... Text len: ${text?.length}, Voice: ${voice}`)

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[TTS Debug] OpenAI Error:', err)
      return c.json({ error: err }, 500)
    }

    console.log('[TTS Debug] Success! Streaming audio...')
    return new Response(response.body, {
      headers: { 'Content-Type': 'audio/mpeg' }
    })

  } catch (e) {
    console.error('[TTS Debug] Exception:', e)
    return c.json({ error: String(e) }, 500)
  }
})

// Audio Proxy for BSKorea (CORS Bypass)
app.get('/api/proxy/audio', async (c) => {
  const url = c.req.query('url')
  if (!url) return c.text('Missing URL', 400)

  // Security: Only allow specific domain
  if (!url.includes('bskorea.or.kr')) return c.text('Invalid Domain', 403)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      return c.text(`Upstream Error: ${response.status}`, response.status)
    }

    // Proxy the response body with CORS headers
    const newHeaders = new Headers(response.headers)
    newHeaders.set('Access-Control-Allow-Origin', '*')
    newHeaders.set('Cache-Control', 'public, max-age=31536000') // Cache like crazy

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    })
  } catch (e) {
    return c.text('Proxy Error', 500)
  }
})

export default app
