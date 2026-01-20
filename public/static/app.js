// 전역 상태
let currentUser = null;

// 로컬스토리지에서 사용자 정보 불러오기
function loadUser() {
  const stored = localStorage.getItem('harash_user');
  if (stored) {
    currentUser = JSON.parse(stored);
    showMainApp();
  } else {
    showLoginScreen();
  }
}

// 로그인 화면
function showLoginScreen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="text-6xl mb-4">📖</div>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">하라쉬 말씀읽기</h1>
          <p class="text-gray-600">새롬교회 성경읽기 프로그램</p>
        </div>
        
        <form id="loginForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">이메일</label>
            <input 
              type="email" 
              id="email" 
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="example@email.com"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
            <input 
              type="password" 
              id="password" 
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="비밀번호"
            >
          </div>
          
          <button 
            type="submit"
            class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            로그인
          </button>
        </form>
        
        <div class="mt-6 text-center text-sm text-gray-600">
          <p>테스트 계정: test1@example.com / test1234</p>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

// 로그인 처리
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const response = await axios.post('/api/login', { email, password });
    
    if (response.data.success) {
      currentUser = response.data.user;
      localStorage.setItem('harash_user', JSON.stringify(currentUser));
      showMainApp();
    }
  } catch (error) {
    alert('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
  }
}

// 로그아웃
function logout() {
  localStorage.removeItem('harash_user');
  currentUser = null;
  showLoginScreen();
}

// 메인 앱 화면
async function showMainApp() {
  const app = document.getElementById('app');
  
  // 오늘의 읽기 기록 조회
  const todayLog = await axios.get('/api/reading/' + currentUser.id + '/today');
  const chaptersRead = todayLog.data.chapters_read || 0;
  const isCompleted = todayLog.data.completed || false;
  
  // 사용자 최신 정보 조회
  const userInfo = await axios.get('/api/user/' + currentUser.id);
  currentUser = { ...currentUser, ...userInfo.data };
  
  const progress = (chaptersRead / 5) * 100;
  const dashoffset = 565.48 - (565.48 * progress / 100);
  
  let chaptersHTML = '';
  for (let i = 1; i <= 5; i++) {
    const isChecked = chaptersRead >= i;
    chaptersHTML += `
      <button 
        onclick="checkChapter(${i})"
        class="chapter-btn ${isChecked ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'} 
               py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all"
        ${isChecked ? 'disabled' : ''}
      >
        ${isChecked ? '✓' : i + '장'}
      </button>
    `;
  }
  
  const completedHTML = isCompleted ? `
    <div class="bg-green-50 border-2 border-green-500 rounded-xl p-4 text-center mb-4">
      <div class="text-4xl mb-2">🎉</div>
      <div class="text-green-800 font-semibold">오늘의 말씀을 완독하셨습니다!</div>
      <div class="text-green-600 text-sm mt-1">주님께서 기뻐하십니다</div>
    </div>
  ` : `
    <div class="grid grid-cols-5 gap-2 mb-4">
      ${chaptersHTML}
    </div>
  `;
  
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- 헤더 -->
      <div class="gradient-bg text-white p-6 rounded-b-3xl shadow-lg">
        <div class="max-w-4xl mx-auto">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h1 class="text-2xl font-bold">안녕하세요, ${currentUser.name}님! 👋</h1>
              <p class="text-purple-100 text-sm">${currentUser.team_name || '팀 미지정'} · ${currentUser.church_name}</p>
            </div>
            <button onclick="logout()" class="bg-white/20 px-4 py-2 rounded-xl hover:bg-white/30 transition">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          </div>
          
          <!-- Streak 정보 -->
          <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="text-4xl streak-fire">🔥</div>
                <div>
                  <div class="text-3xl font-bold">${currentUser.streak_count}일</div>
                  <div class="text-sm text-purple-100">연속 읽기</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold">${currentUser.total_days_read}일</div>
                <div class="text-sm text-purple-100">총 완독</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 메인 컨텐츠 -->
      <div class="max-w-4xl mx-auto p-6 space-y-6">
        <!-- 오늘의 말씀 읽기 -->
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-book-open text-purple-600 mr-2"></i>
              오늘의 말씀 읽기
            </h2>
            <div class="text-sm text-gray-500">
              ${new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </div>
          </div>
          
          <!-- 진행 원형 차트 -->
          <div class="flex items-center justify-center mb-6">
            <div class="relative">
              <svg width="200" height="200" class="progress-ring">
                <circle cx="100" cy="100" r="90" stroke="#e5e7eb" stroke-width="12" fill="none"/>
                <circle 
                  cx="100" 
                  cy="100" 
                  r="90" 
                  stroke="url(#gradient)" 
                  stroke-width="12" 
                  fill="none"
                  stroke-dasharray="565.48"
                  stroke-dashoffset="${dashoffset}"
                  stroke-linecap="round"
                  style="transition: stroke-dashoffset 0.5s ease"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                  </linearGradient>
                </defs>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <div class="text-5xl font-bold text-purple-600">${chaptersRead}</div>
                <div class="text-gray-500 text-sm">/ 5장</div>
              </div>
            </div>
          </div>
          
          ${completedHTML}
          
          <div class="text-center text-sm text-gray-500 mt-4">
            <i class="fas fa-info-circle mr-1"></i>
            하루에 5장씩 읽으면 1년에 성경을 완독할 수 있습니다
          </div>
        </div>
        
        <!-- 탭 메뉴 -->
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div class="flex border-b">
            <button onclick="showTab('team')" id="tab-team" class="flex-1 py-4 px-6 font-semibold bg-purple-50 text-purple-600 border-b-2 border-purple-600">
              <i class="fas fa-users mr-2"></i>팀 순위
            </button>
            <button onclick="showTab('personal')" id="tab-personal" class="flex-1 py-4 px-6 font-semibold text-gray-600 hover:bg-gray-50">
              <i class="fas fa-trophy mr-2"></i>개인 순위
            </button>
          </div>
          
          <div id="tab-content" class="p-6">
            <!-- 동적으로 채워짐 -->
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 기본 탭 표시
  showTab('team');
}

// 장 체크인
async function checkChapter(chapter) {
  try {
    const response = await axios.post('/api/reading/' + currentUser.id, {
      chapters_read: chapter
    });
    
    if (response.data.completed) {
      // 완독 축하 애니메이션
      confetti();
      setTimeout(() => {
        showMainApp();
      }, 1000);
    } else {
      showMainApp();
    }
  } catch (error) {
    alert('기록 저장에 실패했습니다.');
  }
}

// 탭 전환
async function showTab(tab) {
  const teamBtn = document.getElementById('tab-team');
  const personalBtn = document.getElementById('tab-personal');
  const content = document.getElementById('tab-content');
  
  if (tab === 'team') {
    teamBtn.className = 'flex-1 py-4 px-6 font-semibold bg-purple-50 text-purple-600 border-b-2 border-purple-600';
    personalBtn.className = 'flex-1 py-4 px-6 font-semibold text-gray-600 hover:bg-gray-50';
    
    const response = await axios.get('/api/leaderboard/teams');
    const teams = response.data;
    
    let teamsHTML = '';
    teams.forEach((team, index) => {
      const rankColor = index < 3 ? 'text-purple-600' : 'text-gray-400';
      teamsHTML += `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
          <div class="flex items-center space-x-4">
            <div class="text-2xl font-bold ${rankColor}">
              ${index + 1}
            </div>
            <div>
              <div class="font-semibold text-gray-800">${team.name}</div>
              <div class="text-sm text-gray-500">${team.member_count}명</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold text-purple-600">${team.total_reads || 0}일</div>
            <div class="text-sm text-gray-500">총 완독</div>
          </div>
        </div>
      `;
    });
    
    content.innerHTML = `<div class="space-y-3">${teamsHTML}</div>`;
  } else {
    teamBtn.className = 'flex-1 py-4 px-6 font-semibold text-gray-600 hover:bg-gray-50';
    personalBtn.className = 'flex-1 py-4 px-6 font-semibold bg-purple-50 text-purple-600 border-b-2 border-purple-600';
    
    const response = await axios.get('/api/leaderboard/users');
    const users = response.data;
    
    let usersHTML = '';
    users.forEach((user, index) => {
      const rankColor = index < 3 ? 'text-purple-600' : 'text-gray-400';
      const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1);
      usersHTML += `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
          <div class="flex items-center space-x-4">
            <div class="text-2xl font-bold ${rankColor}">
              ${rankIcon}
            </div>
            <div>
              <div class="font-semibold text-gray-800">${user.name}</div>
              <div class="text-sm text-gray-500">${user.team_name || '팀 미지정'}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center space-x-2">
              <span class="text-2xl">🔥</span>
              <span class="font-bold text-orange-600">${user.streak_count}</span>
            </div>
            <div class="text-sm text-gray-500">${user.total_days_read}일 완독</div>
          </div>
        </div>
      `;
    });
    
    content.innerHTML = `<div class="space-y-3">${usersHTML}</div>`;
  }
}

// 간단한 축하 효과 (Confetti 대체)
function confetti() {
  const messages = ['🎉', '✨', '🌟', '⭐', '💫'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(container);
  
  for (let i = 0; i < 30; i++) {
    const emoji = document.createElement('div');
    emoji.textContent = messages[Math.floor(Math.random() * messages.length)];
    emoji.style.cssText = 'position:absolute;left:' + (Math.random() * 100) + '%;top:-50px;font-size:2rem;animation: fall ' + (2 + Math.random() * 2) + 's linear;';
    container.appendChild(emoji);
  }
  
  setTimeout(() => container.remove(), 4000);
}

// 애니메이션 CSS 추가
const style = document.createElement('style');
style.textContent = `
  @keyframes fall {
    to {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// 앱 시작
window.addEventListener('DOMContentLoaded', loadUser);

// 전역 함수로 노출
window.logout = logout;
window.checkChapter = checkChapter;
window.showTab = showTab;
