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
              <div class="text-xs text-gray-500">${currentUser.team_name || '팀 미지정'}</div>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
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
