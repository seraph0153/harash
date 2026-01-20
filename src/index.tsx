import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

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

// 메인 페이지
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>하라쉬 말씀읽기 - 새롬교회</title>
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
