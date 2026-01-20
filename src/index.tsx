import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
  GOOGLE_SHEETS_API_KEY?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Google Sheets 설정
const SPREADSHEET_ID = '1HVxGsugqLzmHASSyCy7dF_ANGfXfe7wQqDVwej3SH3Q'
const SHEET_NAME = 'Sheet1' // 시트 이름 (필요시 변경)

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

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }))

// API 라우트

// 로그인
app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json()
  
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ? AND password_hash = ?'
  ).bind(email, password).first()
  
  if (!user) {
    return c.json({ error: '이메일 또는 비밀번호가 잘못되었습니다.' }, 401)
  }
  
  return c.json({ 
    success: true, 
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      team_id: user.team_id,
      church_id: user.church_id,
      streak_count: user.streak_count,
      total_days_read: user.total_days_read
    }
  })
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
  const userId = c.req.param('userId')
  const { chapters_read } = await c.req.json()
  const today = new Date().toISOString().split('T')[0]
  const completed = chapters_read >= 5
  
  // 읽기 기록 저장
  await c.env.DB.prepare(
    `INSERT INTO reading_logs (user_id, date, chapters_read, completed) 
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, date) 
     DO UPDATE SET chapters_read = ?, completed = ?`
  ).bind(userId, today, chapters_read, completed ? 1 : 0, chapters_read, completed ? 1 : 0).run()
  
  // Streak 계산
  if (completed) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    const yesterdayLog = await c.env.DB.prepare(
      'SELECT * FROM reading_logs WHERE user_id = ? AND date = ? AND completed = 1'
    ).bind(userId, yesterdayStr).first()
    
    const user = await c.env.DB.prepare(
      'SELECT streak_count, last_read_date, total_days_read FROM users WHERE id = ?'
    ).bind(userId).first()
    
    let newStreak = 1
    let newTotalDays = (user?.total_days_read || 0) + 1
    
    if (user?.last_read_date === yesterdayStr && yesterdayLog) {
      newStreak = (user?.streak_count || 0) + 1
    }
    
    // 사용자 통계 업데이트
    await c.env.DB.prepare(
      'UPDATE users SET streak_count = ?, total_days_read = ?, last_read_date = ? WHERE id = ?'
    ).bind(newStreak, newTotalDays, today, userId).run()
    
    return c.json({ success: true, completed: true, streak: newStreak })
  }
  
  return c.json({ success: true, completed: false, chapters_read })
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
      u.streak_count
     FROM users u
     WHERE u.team_id = ?
     ORDER BY u.total_days_read DESC`
  ).bind(teamId).all()
  
  return c.json(result.results)
})

// Google Sheets에서 교인 데이터 동기화
app.post('/api/admin/sync-google-sheets', async (c) => {
  try {
    // Google Sheets API 키가 없으면 공개 시트로 접근 시도
    const apiKey = c.env.GOOGLE_SHEETS_API_KEY || ''
    
    // Google Sheets API 호출
    const url = apiKey 
      ? `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${apiKey}`
      : `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      return c.json({ 
        error: 'Google Sheets 접근 실패. 시트를 공개로 설정하거나 API 키를 설정해주세요.',
        details: await response.text()
      }, 400)
    }
    
    let rows: any[] = []
    
    if (apiKey) {
      // 정식 API 사용
      const data = await response.json()
      rows = data.values || []
    } else {
      // 공개 시트 JSON 파싱
      const text = await response.text()
      const jsonText = text.substring(47).slice(0, -2)
      const data = JSON.parse(jsonText)
      rows = data.table.rows.map((row: any) => 
        row.c.map((cell: any) => cell?.v || '')
      )
    }
    
    if (rows.length < 2) {
      return c.json({ error: '데이터가 없습니다.' }, 400)
    }
    
    // 첫 번째 행은 헤더
    const headers = rows[0]
    const dataRows = rows.slice(1)
    
    let syncedCount = 0
    let errorCount = 0
    
    for (const row of dataRows) {
      try {
        const name = row[0]
        const email = row[1]
        const password = row[2] || 'welcome1234'
        const roleKr = row[3] || '팀원'
        const teamName = row[4]
        
        if (!name || !email) continue
        
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
        
        // 사용자 생성 또는 업데이트
        await c.env.DB.prepare(
          `INSERT INTO users (name, email, password_hash, role, team_id, church_id)
           VALUES (?, ?, ?, ?, ?, 1)
           ON CONFLICT(email) 
           DO UPDATE SET name = ?, role = ?, team_id = ?`
        ).bind(
          name, email, password, role, teamId,
          name, role, teamId
        ).run()
        
        syncedCount++
      } catch (err) {
        errorCount++
        console.error('Row sync error:', err)
      }
    }
    
    // 동기화 로그 저장
    await c.env.DB.prepare(
      'INSERT INTO sync_logs (sync_type, status, message) VALUES (?, ?, ?)'
    ).bind(
      'google_sheets',
      'success',
      `${syncedCount}명 동기화 완료, ${errorCount}개 오류`
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

export default app
