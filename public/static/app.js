// 전역 상태
let currentUser = null;
let biblePlan = [];
let teamMembers = [];

// 로컬스토리지에서 사용자 정보 불러오기
function loadUser() {
  const stored = localStorage.getItem('harash_user');
  if (stored) {
    currentUser = JSON.parse(stored);
    showMapScreen();
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
              value="test1@example.com"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
            <input 
              type="password" 
              id="password" 
              required
              value="test1234"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
          </div>
          
          <button 
            type="submit"
            class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            로그인
          </button>
        </form>
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
      showMapScreen();
    }
  } catch (error) {
    alert('로그인에 실패했습니다.');
  }
}

// 로그아웃
function logout() {
  localStorage.removeItem('harash_user');
  currentUser = null;
  showLoginScreen();
}

// 듀오링고 스타일 맵 화면
async function showMapScreen() {
  const app = document.getElementById('app');
  
  // 데이터 로드
  const [userInfo, planData, teamData] = await Promise.all([
    axios.get('/api/user/' + currentUser.id),
    axios.get('/api/bible-plan'),
    currentUser.team_id ? axios.get('/api/team/' + currentUser.team_id + '/progress') : Promise.resolve({ data: [] })
  ]);
  
  currentUser = { ...currentUser, ...userInfo.data };
  biblePlan = planData.data;
  teamMembers = teamData.data;
  
  // 관리자 권한 체크
  const isAdmin = ['senior_pastor', 'associate_pastor', 'minister'].includes(currentUser.role);
  const isLeader = ['team_leader', 'deputy_leader'].includes(currentUser.role);
  
  app.innerHTML = `
    <div class="min-h-screen bg-gradient-to-b from-purple-100 to-blue-100">
      <!-- 상단 헤더 -->
      <div class="bg-white shadow-md sticky top-0 z-50">
        <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
              ${currentUser.name[0]}
            </div>
            <div>
              <div class="font-bold text-gray-800">${currentUser.name}</div>
              <div class="text-xs text-gray-500">${getRoleKorean(currentUser.role)}</div>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            ${isAdmin ? '<button onclick="showAdminPanel()" class="text-purple-600 hover:text-purple-700"><i class="fas fa-cog"></i></button>' : ''}
            ${isLeader ? '<button onclick="showTeamPanel()" class="text-blue-600 hover:text-blue-700"><i class="fas fa-users"></i></button>' : ''}
            <div class="flex items-center space-x-1">
              <span class="text-2xl">🔥</span>
              <span class="font-bold text-orange-600">${currentUser.streak_count}</span>
            </div>
            <button onclick="logout()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 듀오링고 스타일 맵 -->
      <div class="max-w-md mx-auto py-8 px-4">
        <div id="bible-map" class="relative">
          ${renderBibleMap()}
        </div>
      </div>
    </div>
  `;
}

// 역할 한글 변환
function getRoleKorean(role) {
  const roleMap = {
    'senior_pastor': '담임목사',
    'associate_pastor': '부목사',
    'minister': '교역자',
    'team_leader': '담당팀장',
    'deputy_leader': '부팀장',
    'member': '팀원'
  };
  return roleMap[role] || '팀원';
}

// 관리자 패널
async function showAdminPanel() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-purple-600 text-white p-6">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <button onclick="showMapScreen()" class="hover:bg-purple-700 px-3 py-2 rounded-lg">
              <i class="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 class="text-2xl font-bold">관리자 패널</h1>
              <p class="text-purple-200 text-sm">교인 관리 및 통계</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="max-w-6xl mx-auto p-6">
        <!-- Google Sheets 동기화 -->
        <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-sync-alt text-green-600 mr-2"></i>
            Google Sheets 동기화
          </h2>
          <p class="text-gray-600 mb-4">
            스프레드시트 ID: <code class="bg-gray-100 px-2 py-1 rounded">1HVxGsugqLzmHASSyCy7dF_ANGfXfe7wQqDVwej3SH3Q</code>
          </p>
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p class="text-sm text-blue-800">
              <strong>Google Sheets 형식:</strong><br>
              A열: 이름 | B열: 이메일 | C열: 비밀번호 | D열: 역할 (담임목사/부목사/교역자/담당팀장/부팀장/팀원) | E열: 팀 이름
            </p>
          </div>
          <button 
            onclick="syncGoogleSheets()"
            id="syncBtn"
            class="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition"
          >
            <i class="fas fa-sync-alt mr-2"></i>
            지금 동기화
          </button>
          <div id="syncResult" class="mt-4"></div>
        </div>
        
        <!-- 통계 대시보드 -->
        <div id="dashboard" class="space-y-6">
          <div class="text-center text-gray-500">
            <i class="fas fa-spinner fa-spin text-4xl mb-2"></i>
            <p>통계를 불러오는 중...</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  loadAdminDashboard();
}

// 관리자 대시보드 로드
async function loadAdminDashboard() {
  try {
    const response = await axios.get('/api/admin/dashboard');
    const data = response.data;
    
    let rolesHTML = '';
    data.roles.forEach(role => {
      rolesHTML += `
        <div class="bg-gray-50 rounded-xl p-4">
          <div class="text-sm text-gray-500">${getRoleKorean(role.role)}</div>
          <div class="text-3xl font-bold text-purple-600">${role.count}명</div>
          <div class="text-xs text-gray-600 mt-1">평균 ${Math.round(role.avg_days || 0)}일 완독</div>
        </div>
      `;
    });
    
    let teamsHTML = '';
    data.teams.forEach((team, index) => {
      teamsHTML += `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div class="flex items-center space-x-3">
            <div class="text-2xl font-bold text-purple-600">${index + 1}</div>
            <div>
              <div class="font-semibold text-gray-800">${team.team_name}</div>
              <div class="text-sm text-gray-500">${team.member_count}명</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold text-purple-600">${Math.round(team.avg_days || 0)}일</div>
            <div class="text-xs text-gray-500">평균 완독</div>
          </div>
        </div>
      `;
    });
    
    document.getElementById('dashboard').innerHTML = `
      <!-- 전체 통계 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <div class="text-sm text-gray-500 mb-2">전체 교인</div>
          <div class="text-4xl font-bold text-purple-600">${data.total.total_users}</div>
        </div>
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <div class="text-sm text-gray-500 mb-2">활동 중</div>
          <div class="text-4xl font-bold text-green-600">${data.total.active_users}</div>
        </div>
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <div class="text-sm text-gray-500 mb-2">평균 완독</div>
          <div class="text-4xl font-bold text-blue-600">${Math.round(data.total.avg_days || 0)}</div>
        </div>
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <div class="text-sm text-gray-500 mb-2">최대 Streak</div>
          <div class="text-4xl font-bold text-orange-600">${data.total.max_streak || 0}</div>
        </div>
      </div>
      
      <!-- 역할별 통계 -->
      <div class="bg-white rounded-2xl shadow-lg p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">역할별 통계</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          ${rolesHTML}
        </div>
      </div>
      
      <!-- 팀별 순위 -->
      <div class="bg-white rounded-2xl shadow-lg p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">팀별 순위</h3>
        <div class="space-y-3">
          ${teamsHTML}
        </div>
      </div>
    `;
  } catch (error) {
    document.getElementById('dashboard').innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
        통계를 불러오는데 실패했습니다.
      </div>
    `;
  }
}

// Google Sheets 동기화
async function syncGoogleSheets() {
  const btn = document.getElementById('syncBtn');
  const result = document.getElementById('syncResult');
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>동기화 중...';
  
  try {
    const response = await axios.post('/api/admin/sync-google-sheets');
    
    result.innerHTML = `
      <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
        <i class="fas fa-check-circle mr-2"></i>
        ${response.data.message}
      </div>
    `;
    
    // 대시보드 새로고침
    setTimeout(() => loadAdminDashboard(), 1000);
  } catch (error) {
    result.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
        <i class="fas fa-exclamation-triangle mr-2"></i>
        동기화 실패: ${error.response?.data?.error || error.message}
        <p class="text-sm mt-2">Google Sheets를 <strong>공개</strong>로 설정했는지 확인해주세요.</p>
      </div>
    `;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>지금 동기화';
  }
}

// 팀장 패널
async function showTeamPanel() {
  const app = document.getElementById('app');
  
  if (!currentUser.team_id) {
    alert('팀이 배정되지 않았습니다.');
    return;
  }
  
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-blue-600 text-white p-6">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <button onclick="showMapScreen()" class="hover:bg-blue-700 px-3 py-2 rounded-lg">
              <i class="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 class="text-2xl font-bold">팀 관리</h1>
              <p class="text-blue-200 text-sm">${currentUser.team_name}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="max-w-4xl mx-auto p-6">
        <div id="teamDashboard" class="text-center text-gray-500">
          <i class="fas fa-spinner fa-spin text-4xl mb-2"></i>
          <p>팀 정보를 불러오는 중...</p>
        </div>
      </div>
    </div>
  `;
  
  loadTeamDashboard();
}

// 팀 대시보드 로드
async function loadTeamDashboard() {
  try {
    const response = await axios.get('/api/team/' + currentUser.team_id + '/progress');
    const members = response.data;
    
    let membersHTML = '';
    members.forEach((member, index) => {
      const isCurrentUser = member.id === currentUser.id;
      membersHTML += `
        <div class="flex items-center justify-between p-4 bg-white rounded-xl shadow ${isCurrentUser ? 'border-2 border-purple-600' : ''}">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full ${isCurrentUser ? 'bg-purple-600' : 'bg-gray-400'} flex items-center justify-center text-white font-bold">
              ${member.name[0]}
            </div>
            <div>
              <div class="font-semibold text-gray-800">
                ${member.name}
                ${isCurrentUser ? '<span class="text-xs text-purple-600 ml-2">(나)</span>' : ''}
              </div>
              <div class="text-sm text-gray-500">${member.total_days_read}일 완독</div>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-2xl">🔥</span>
            <span class="font-bold text-orange-600">${member.streak_count}</span>
          </div>
        </div>
      `;
    });
    
    const avgDays = members.length > 0 
      ? Math.round(members.reduce((sum, m) => sum + m.total_days_read, 0) / members.length)
      : 0;
    
    document.getElementById('teamDashboard').innerHTML = `
      <!-- 팀 통계 -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <div class="text-sm text-gray-500 mb-2">팀원 수</div>
          <div class="text-4xl font-bold text-blue-600">${members.length}명</div>
        </div>
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <div class="text-sm text-gray-500 mb-2">평균 완독</div>
          <div class="text-4xl font-bold text-purple-600">${avgDays}일</div>
        </div>
      </div>
      
      <!-- 팀원 목록 -->
      <div class="bg-white rounded-2xl shadow-lg p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">팀원 목록</h3>
        <div class="space-y-3">
          ${membersHTML}
        </div>
      </div>
    `;
  } catch (error) {
    document.getElementById('teamDashboard').innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
        팀 정보를 불러오는데 실패했습니다.
      </div>
    `;
  }
}

// 성경 읽기 맵 렌더링 (듀오링고 스타일)
function renderBibleMap() {
  let html = '';
  const userProgress = currentUser.total_days_read;
  
  biblePlan.forEach((day, index) => {
    const dayNumber = day.day_number;
    const isCompleted = dayNumber <= userProgress;
    const isCurrent = dayNumber === userProgress + 1;
    const isLocked = dayNumber > userProgress + 1;
    
    // 지그재그 패턴 (듀오링고처럼)
    const position = index % 2 === 0 ? 'left' : 'right';
    const marginClass = position === 'left' ? 'mr-auto ml-8' : 'ml-auto mr-8';
    
    // 팀원 아바타 (같은 위치에 있는 사람들)
    const membersHere = teamMembers.filter(m => m.total_days_read === dayNumber - 1);
    let avatarsHTML = '';
    if (membersHere.length > 0 && dayNumber !== userProgress + 1) {
      avatarsHTML = '<div class="absolute -top-3 -right-3 flex">';
      membersHere.slice(0, 3).forEach(member => {
        avatarsHTML += `
          <div class="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold -ml-2" title="${member.name}">
            ${member.name[0]}
          </div>
        `;
      });
      avatarsHTML += '</div>';
    }
    
    // 노드 스타일
    let nodeClass = 'bg-gray-300 text-gray-500';
    let icon = '🔒';
    
    if (isCompleted) {
      nodeClass = 'bg-green-500 text-white shadow-lg';
      icon = '✓';
    } else if (isCurrent) {
      nodeClass = 'bg-purple-600 text-white shadow-2xl animate-pulse';
      icon = '📖';
    }
    
    html += `
      <!-- 연결선 -->
      ${index > 0 ? '<div class="h-16 w-1 bg-gray-300 mx-auto"></div>' : ''}
      
      <!-- 노드 -->
      <div class="relative ${marginClass} mb-4">
        <button 
          onclick="${isCurrent || isCompleted ? 'showReadingScreen(' + dayNumber + ')' : 'void(0)'}"
          class="relative w-20 h-20 rounded-full ${nodeClass} flex flex-col items-center justify-center transition-all transform hover:scale-110 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}"
          ${isLocked ? 'disabled' : ''}
        >
          <div class="text-2xl">${icon}</div>
          <div class="text-xs font-bold mt-1">${day.day_number}일</div>
        </button>
        
        <!-- 정보 카드 -->
        <div class="absolute ${position === 'left' ? 'left-24' : 'right-24'} top-1/2 transform -translate-y-1/2 bg-white rounded-xl shadow-lg p-3 w-48">
          <div class="text-xs text-gray-500">${day.week_day}</div>
          <div class="font-bold text-gray-800">${day.book_name}</div>
          <div class="text-sm text-purple-600">${day.start_chapter}-${day.end_chapter}장</div>
        </div>
        
        ${avatarsHTML}
      </div>
    `;
  });
  
  return html;
}

// 성경 읽기 화면
async function showReadingScreen(dayNumber) {
  const app = document.getElementById('app');
  
  // 해당 날짜의 계획 찾기
  const plan = biblePlan.find(p => p.day_number === dayNumber);
  if (!plan) return;
  
  // 로딩 화면
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <div class="text-6xl mb-4">📖</div>
        <div class="text-xl text-gray-600">말씀을 불러오는 중...</div>
      </div>
    </div>
  `;
  
  // 성경 본문 로드 (모든 장)
  const chapters = [];
  for (let ch = plan.start_chapter; ch <= plan.end_chapter; ch++) {
    try {
      const response = await axios.get('/api/bible/' + plan.book_name + '/' + ch);
      chapters.push({ chapter: ch, verses: response.data });
    } catch (error) {
      console.error('Failed to load chapter', ch);
    }
  }
  
  let chaptersHTML = '';
  chapters.forEach(chapterData => {
    chaptersHTML += `
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-purple-600 mb-4 sticky top-0 bg-gray-50 py-2">
          ${plan.book_name} ${chapterData.chapter}장
        </h2>
        <div class="space-y-3">
          ${chapterData.verses.map(v => `
            <div class="flex">
              <span class="text-sm text-gray-400 mr-3 font-mono w-8">${v.verse}</span>
              <p class="text-gray-800 leading-relaxed flex-1">${v.text}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });
  
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- 헤더 -->
      <div class="bg-purple-600 text-white sticky top-0 z-50 shadow-lg">
        <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onclick="showMapScreen()" class="text-white hover:bg-purple-700 px-3 py-2 rounded-lg">
            <i class="fas fa-arrow-left mr-2"></i>돌아가기
          </button>
          <div class="text-center flex-1">
            <div class="font-bold">${plan.book_name} ${plan.start_chapter}-${plan.end_chapter}장</div>
            <div class="text-sm text-purple-200">${plan.week_day} · ${plan.day_number}일차</div>
          </div>
          <button onclick="playAudio()" class="text-white hover:bg-purple-700 px-3 py-2 rounded-lg">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
      
      <!-- 본문 -->
      <div class="max-w-4xl mx-auto px-4 py-8">
        ${chaptersHTML}
        
        <!-- 완료 버튼 -->
        <div class="sticky bottom-4 mt-8">
          <button 
            onclick="completeReading(${dayNumber})"
            class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all"
          >
            <i class="fas fa-check mr-2"></i>
            완독 확인
          </button>
        </div>
      </div>
    </div>
  `;
  
  // 스크롤 맨 위로
  window.scrollTo(0, 0);
}

// 음성 재생 (TTS)
async function playAudio() {
  alert('음성 재생 기능은 곧 추가됩니다! 🎵');
  // TODO: Web Speech API 또는 외부 TTS API 연동
}

// 완독 확인
async function completeReading(dayNumber) {
  try {
    // 5장으로 기록
    await axios.post('/api/reading/' + currentUser.id, {
      chapters_read: 5
    });
    
    // 축하 애니메이션
    confetti();
    
    setTimeout(() => {
      showMapScreen();
    }, 1500);
  } catch (error) {
    alert('기록 저장에 실패했습니다.');
  }
}

// 축하 효과
function confetti() {
  const messages = ['🎉', '✨', '🌟', '⭐', '💫', '🎊'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(container);
  
  for (let i = 0; i < 50; i++) {
    const emoji = document.createElement('div');
    emoji.textContent = messages[Math.floor(Math.random() * messages.length)];
    emoji.style.cssText = 'position:absolute;left:' + (Math.random() * 100) + '%;top:-50px;font-size:2rem;animation: fall ' + (2 + Math.random() * 2) + 's linear;';
    container.appendChild(emoji);
  }
  
  setTimeout(() => container.remove(), 4000);
}

// 애니메이션 CSS
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

// 전역 함수
window.logout = logout;
window.showMapScreen = showMapScreen;
window.showReadingScreen = showReadingScreen;
window.playAudio = playAudio;
window.completeReading = completeReading;
window.showAdminPanel = showAdminPanel;
window.syncGoogleSheets = syncGoogleSheets;
window.showTeamPanel = showTeamPanel;
