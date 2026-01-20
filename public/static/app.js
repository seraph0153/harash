// 전역 상태
let currentUser = null;
let biblePlan = [];
let allUsers = [];
let adminSettings = null;

// 아바타 이모지 목록
const AVATAR_EMOJIS = ['😊', '😁', '🤗', '😎', '🥰', '😇', '🤓', '😋', '🙏', '✨', '🌟', '⭐', '💫', '🔥', '❤️', '💙', '💚', '💛', '💜', '🧡'];

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

// 가로 맵 화면
async function showMapScreen() {
  const app = document.getElementById('app');
  
  // 데이터 로드
  const [userInfo, planData, usersData, settingsData] = await Promise.all([
    axios.get('/api/user/' + currentUser.id),
    axios.get('/api/bible-plan'),
    axios.get('/api/progress/all'),
    axios.get('/api/admin/settings')
  ]);
  
  currentUser = { ...currentUser, ...userInfo.data };
  biblePlan = planData.data;
  allUsers = usersData.data;
  adminSettings = settingsData.data;
  
  const isAdmin = ['senior_pastor', 'associate_pastor', 'minister'].includes(currentUser.role);
  const isLeader = ['team_leader', 'deputy_leader'].includes(currentUser.role);
  
  app.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <!-- 상단 헤더 -->
      <div class="bg-white shadow-md sticky top-0 z-50">
        <div class="max-w-full mx-auto px-6 py-3 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <button onclick="showAvatarSelector()" class="relative group">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl cursor-pointer hover:scale-110 transition-transform">
                ${currentUser.avatar_url ? '<img src="' + currentUser.avatar_url + '" class="w-full h-full rounded-full object-cover">' : currentUser.avatar_emoji || '😊'}
              </div>
              <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                <i class="fas fa-pencil-alt text-xs text-purple-600"></i>
              </div>
            </button>
            <div>
              <div class="font-bold text-gray-800">${currentUser.name}</div>
              <div class="text-xs text-gray-500">${getRoleKorean(currentUser.role)}</div>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            ${isAdmin ? '<button onclick="showAdminSettings()" class="text-purple-600 hover:text-purple-700 text-xl"><i class="fas fa-cog"></i></button>' : ''}
            ${isLeader ? '<button onclick="showTeamPanel()" class="text-blue-600 hover:text-blue-700 text-xl"><i class="fas fa-users"></i></button>' : ''}
            <div class="flex items-center space-x-1 bg-orange-100 px-3 py-1 rounded-full">
              <span class="text-2xl">🔥</span>
              <span class="font-bold text-orange-600">${currentUser.streak_count}</span>
            </div>
            <button onclick="logout()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 가로 스크롤 맵 -->
      <div class="py-8 overflow-x-auto">
        <div class="inline-flex items-start space-x-8 px-8 min-w-full">
          ${renderHorizontalMap()}
        </div>
      </div>
    </div>
  `;
}

// 가로 맵 렌더링 (왼쪽→오른쪽)
function renderHorizontalMap() {
  let html = '';
  
  biblePlan.forEach((day, index) => {
    const dayNumber = day.day_number;
    const userProgress = currentUser.total_days_read;
    
    const isCompleted = dayNumber <= userProgress;
    const isCurrent = dayNumber === userProgress + 1;
    const isLocked = dayNumber > userProgress + 1;
    
    // 이 노드에 있는 사용자들
    const usersHere = allUsers.filter(u => u.total_days_read + 1 === dayNumber || (isCompleted && u.total_days_read === dayNumber));
    
    // 노드 스타일
    let nodeClass = 'bg-gray-300 text-gray-500 border-4 border-gray-400';
    let icon = '🔒';
    let glow = '';
    
    if (isCompleted) {
      nodeClass = 'bg-green-500 text-white border-4 border-green-600 shadow-xl';
      icon = '✓';
    } else if (isCurrent) {
      nodeClass = 'bg-purple-600 text-white border-4 border-purple-800 shadow-2xl';
      icon = '📖';
      glow = 'animate-pulse shadow-purple-500/50';
    }
    
    html += `
      <div class="flex flex-col items-center relative">
        <!-- 날짜 레이블 -->
        <div class="text-center mb-4">
          <div class="text-xs text-gray-500 font-semibold">${day.week_day}</div>
          <div class="text-sm text-gray-600">${day.day_number}일차</div>
        </div>
        
        <!-- 노드 -->
        <button 
          onclick="${isCurrent || isCompleted ? 'showReadingScreen(' + dayNumber + ')' : 'void(0)'}"
          class="relative w-24 h-24 rounded-full ${nodeClass} ${glow} flex flex-col items-center justify-center transition-all transform hover:scale-110 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}"
          ${isLocked ? 'disabled' : ''}
        >
          <div class="text-4xl">${icon}</div>
        </button>
        
        <!-- 말씀 정보 -->
        <div class="mt-4 text-center">
          <div class="font-bold text-gray-800 text-sm">${day.book_name}</div>
          <div class="text-xs text-purple-600">${day.start_chapter}-${day.end_chapter}장</div>
        </div>
        
        <!-- 사용자 아바타들 (위에 표시) -->
        ${usersHere.length > 0 ? `
          <div class="absolute -top-20 flex flex-wrap justify-center gap-2 w-32">
            ${usersHere.slice(0, 6).map(user => {
              const isMe = user.id === currentUser.id;
              return `
                <div class="relative group">
                  <div class="w-10 h-10 rounded-full ${isMe ? 'ring-2 ring-purple-600' : ''} flex items-center justify-center text-2xl bg-white shadow-lg cursor-pointer hover:scale-125 transition-transform" title="${user.name}">
                    ${user.avatar_url ? '<img src="' + user.avatar_url + '" class="w-full h-full rounded-full object-cover">' : user.avatar_emoji || '😊'}
                  </div>
                  ${isCompleted ? '<div class="absolute -top-2 -right-2 cursor-pointer" onclick="showEncouragementDialog(' + user.id + ', ' + dayNumber + ')">💬</div>' : ''}
                </div>
              `;
            }).join('')}
            ${usersHere.length > 6 ? '<div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">+' + (usersHere.length - 6) + '</div>' : ''}
          </div>
        ` : ''}
        
        <!-- 연결선 -->
        ${index < biblePlan.length - 1 ? '<div class="absolute left-full top-12 w-8 h-1 bg-gray-300"></div>' : ''}
      </div>
    `;
  });
  
  return html;
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

// 아바타 선택기
function showAvatarSelector() {
  const app = document.getElementById('app');
  
  let emojisHTML = '';
  AVATAR_EMOJIS.forEach(emoji => {
    const isSelected = currentUser.avatar_emoji === emoji;
    emojisHTML += `
      <button 
        onclick="selectAvatar('${emoji}')"
        class="w-16 h-16 text-4xl hover:scale-125 transition-transform ${isSelected ? 'ring-4 ring-purple-600 rounded-full' : ''}"
      >
        ${emoji}
      </button>
    `;
  });
  
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-purple-600 text-white p-6">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <button onclick="showMapScreen()" class="hover:bg-purple-700 px-3 py-2 rounded-lg">
            <i class="fas fa-arrow-left mr-2"></i>돌아가기
          </button>
          <h1 class="text-2xl font-bold">아바타 선택</h1>
          <div class="w-24"></div>
        </div>
      </div>
      
      <div class="max-w-4xl mx-auto p-6">
        <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">이모지 선택</h3>
          <div class="grid grid-cols-5 gap-4">
            ${emojisHTML}
          </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">사진 업로드 (준비 중)</h3>
          <p class="text-gray-600">곧 사진 업로드 기능이 추가됩니다!</p>
        </div>
      </div>
    </div>
  `;
}

// 아바타 선택
async function selectAvatar(emoji) {
  try {
    await axios.post('/api/user/' + currentUser.id + '/avatar', {
      avatar_emoji: emoji,
      avatar_url: null
    });
    
    currentUser.avatar_emoji = emoji;
    localStorage.setItem('harash_user', JSON.stringify(currentUser));
    
    showMapScreen();
  } catch (error) {
    alert('아바타 변경에 실패했습니다.');
  }
}

// 풍선 댓글 다이얼로그
function showEncouragementDialog(toUserId, dayNumber) {
  const EMOJIS = ['❤️', '👍', '🎉', '💪', '🙏', '✨', '🔥', '⭐'];
  
  let html = '<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="this.remove()">';
  html += '<div class="bg-white rounded-2xl p-6 max-w-sm" onclick="event.stopPropagation()">';
  html += '<h3 class="text-xl font-bold text-gray-800 mb-4">응원하기</h3>';
  html += '<div class="grid grid-cols-4 gap-3 mb-4">';
  
  EMOJIS.forEach(emoji => {
    html += '<button onclick="sendEncouragement(' + toUserId + ', ' + dayNumber + ', \'' + emoji + '\')" class="text-4xl hover:scale-125 transition-transform">' + emoji + '</button>';
  });
  
  html += '</div>';
  html += '<button onclick="this.closest(\'.fixed\').remove()" class="w-full bg-gray-300 text-gray-700 py-2 rounded-xl font-semibold">취소</button>';
  html += '</div></div>';
  
  document.body.insertAdjacentHTML('beforeend', html);
}

// 응원 보내기
async function sendEncouragement(toUserId, dayNumber, emoji) {
  try {
    // reading_log_id 찾기 (간단히 하기 위해 생략하고 0으로)
    await axios.post('/api/encouragement', {
      from_user_id: currentUser.id,
      to_user_id: toUserId,
      reading_log_id: 0,
      emoji: emoji
    });
    
    document.querySelector('.fixed')?.remove();
    alert('응원을 보냈습니다! ' + emoji);
  } catch (error) {
    alert('응원 보내기에 실패했습니다.');
  }
}

// 앱 시작
window.addEventListener('DOMContentLoaded', loadUser);

// 전역 함수
window.logout = logout;
window.showMapScreen = showMapScreen;
window.showAvatarSelector = showAvatarSelector;
window.selectAvatar = selectAvatar;
window.showEncouragementDialog = showEncouragementDialog;
window.sendEncouragement = sendEncouragement;
window.showReadingScreen = showReadingScreen;
window.playAudio = playAudio;
window.completeReading = completeReading;
window.showAdminSettings = showAdminSettings;
window.saveAdminSettings = saveAdminSettings;
window.showTeamPanel = showTeamPanel;
window.syncGoogleSheets = syncGoogleSheets;

// 말씀 읽기 화면 (Google Sheets에서 텍스트 가져오기)
async function showReadingScreen(dayNumber) {
  const app = document.getElementById('app');
  
  const plan = biblePlan.find(p => p.day_number === dayNumber);
  if (!plan) return;
  
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
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
      
      <div class="max-w-4xl mx-auto px-4 py-8">
        ${plan.scripture_text ? `
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div class="prose prose-lg max-w-none whitespace-pre-wrap leading-relaxed text-gray-800">
              ${plan.scripture_text}
            </div>
          </div>
        ` : `
          <div class="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-xl mb-8">
            <p class="text-yellow-800">
              <i class="fas fa-exclamation-triangle mr-2"></i>
              <strong>관리자님께:</strong> Google Sheets에 오늘의 말씀 텍스트를 추가해주세요.
            </p>
          </div>
        `}
        
        <div class="sticky bottom-4">
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
  
  window.scrollTo(0, 0);
}

// 음성 재생 (TTS - Web Speech API 사용)
function playAudio() {
  const plan = biblePlan.find(p => p.day_number === currentUser.total_days_read + 1);
  if (!plan || !plan.scripture_text) {
    alert('말씀 텍스트가 없습니다.');
    return;
  }
  
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(plan.scripture_text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } else {
    alert('이 브라우저는 음성 재생을 지원하지 않습니다.');
  }
}

// 완독 확인
async function completeReading(dayNumber) {
  try {
    await axios.post('/api/reading/' + currentUser.id, {
      chapters_read: 5
    });
    
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
  const messages = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '👏', '🙌'];
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

// 관리자 설정 화면
async function showAdminSettings() {
  const app = document.getElementById('app');
  
  const settings = await axios.get('/api/admin/settings');
  adminSettings = settings.data;
  
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
  const selectedDays = adminSettings.reading_days.split(',');
  
  let daysHTML = '';
  days.forEach((day, index) => {
    const isChecked = selectedDays.includes(day);
    daysHTML += `
      <label class="flex items-center space-x-2 cursor-pointer">
        <input type="checkbox" value="${day}" ${isChecked ? 'checked' : ''} class="w-5 h-5 text-purple-600 rounded">
        <span>${dayNames[index]}요일</span>
      </label>
    `;
  });
  
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-purple-600 text-white p-6">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <button onclick="showMapScreen()" class="hover:bg-purple-700 px-3 py-2 rounded-lg">
            <i class="fas fa-arrow-left mr-2"></i>돌아가기
          </button>
          <h1 class="text-2xl font-bold">프로그램 설정</h1>
          <div class="w-24"></div>
        </div>
      </div>
      
      <div class="max-w-4xl mx-auto p-6 space-y-6">
        <!-- 시작 날짜 설정 -->
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-calendar-alt text-purple-600 mr-2"></i>
            프로그램 시작 날짜
          </h3>
          <input 
            type="date" 
            id="startDate" 
            value="${adminSettings.program_start_date}"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
          >
          <p class="text-sm text-gray-600 mt-2">
            1일차가 시작되는 날짜를 설정합니다.
          </p>
        </div>
        
        <!-- 읽기 요일 설정 -->
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-check-square text-purple-600 mr-2"></i>
            읽기 진행 요일
          </h3>
          <div id="readingDays" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${daysHTML}
          </div>
          <p class="text-sm text-gray-600 mt-4">
            선택한 요일에만 진도가 나갑니다. (기본: 월~금)
          </p>
        </div>
        
        <!-- Google Sheets 동기화 -->
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-sync-alt text-green-600 mr-2"></i>
            Google Sheets 동기화
          </h3>
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p class="text-sm text-blue-800">
              <strong>Sheet 2 (말씀텍스트)</strong><br>
              A열: 날짜 | B열: 요일 | C열: 성경구절 | D열: 본문텍스트
            </p>
          </div>
          <button 
            onclick="syncGoogleSheets()"
            class="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700"
          >
            <i class="fas fa-sync-alt mr-2"></i>
            교인 & 말씀 동기화
          </button>
        </div>
        
        <!-- 저장 버튼 -->
        <div class="sticky bottom-4">
          <button 
            onclick="saveAdminSettings()"
            class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-2xl"
          >
            <i class="fas fa-save mr-2"></i>
            설정 저장
          </button>
        </div>
      </div>
    </div>
  `;
}

// 관리자 설정 저장
async function saveAdminSettings() {
  const startDate = document.getElementById('startDate').value;
  const checkboxes = document.querySelectorAll('#readingDays input:checked');
  const readingDays = Array.from(checkboxes).map(cb => cb.value).join(',');
  
  if (!readingDays) {
    alert('최소 1개 이상의 요일을 선택해주세요.');
    return;
  }
  
  try {
    await axios.post('/api/admin/settings', {
      program_start_date: startDate,
      reading_days: readingDays
    });
    
    alert('설정이 저장되었습니다!');
    showMapScreen();
  } catch (error) {
    alert('설정 저장에 실패했습니다.');
  }
}

// Google Sheets 동기화 (기존 코드 재사용)
async function syncGoogleSheets() {
  alert('Google Sheets 동기화 기능은 관리자 패널에서 사용해주세요.');
}

// 팀장 패널 (기존 코드 유지)
function showTeamPanel() {
  alert('팀장 패널은 기존 관리자 패널에서 사용해주세요.');
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
