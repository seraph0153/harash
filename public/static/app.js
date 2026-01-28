// 전역 상태
let currentUser = null;
let biblePlan = [];
let allUsers = [];
let adminSettings = null;

// 성경 데이터 변수
let bibleData = null;

// Inject Fonts
const fontStyle = document.createElement('style');
fontStyle.textContent = `@import url('https://fonts.googleapis.com/css2?family=Gowun+Batang&family=Gowun+Dodum&family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Serif+KR:wght@300;400;700&display=swap');`;
document.head.appendChild(fontStyle);

// PWA Install Prompt Logic
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // If we are on login screen, show the button
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) installBtn.classList.remove('hidden');
});

async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    deferredPrompt = null;
  }
}
window.installPWA = installPWA;

// Bible Book Codes (전체)
const BIBLE_BOOK_CODES = {
  '창세기': 'gen', '창': 'gen',
  '출애굽기': 'exo', '출': 'exo',
  '레위기': 'lev', '레': 'lev',
  '민수기': 'num', '민': 'num',
  '신명기': 'deu', '신': 'deu',
  '여호수아': 'jos', '수': 'jos',
  '사사기': 'jdg', '삿': 'jdg',
  '룻기': 'rut', '룻': 'rut',
  '사무엘상': '1sa', '삼상': '1sa',
  '사무엘하': '2sa', '삼하': '2sa',
  '열왕기상': '1ki', '왕상': '1ki',
  '열왕기하': '2ki', '왕하': '2ki',
  '역대상': '1ch', '대상': '1ch',
  '역대하': '2ch', '대하': '2ch',
  '에스라': 'ezr', '스': 'ezr',
  '느헤미야': 'neh', '느': 'neh',
  '에스더': 'est', '에': 'est',
  '욥기': 'job', '욥': 'job',
  '시편': 'psa', '시': 'psa',
  '잠언': 'pro', '잠': 'pro',
  '전도서': 'ecc', '전': 'ecc',
  '아가': 'son', '아': 'son',
  '이사야': 'isa', '사': 'isa',
  '예레미야': 'jer', '렘': 'jer',
  '예레미야애가': 'lam', '애': 'lam',
  '에스겔': 'eze', '겔': 'eze',
  '다니엘': 'dan', '단': 'dan',
  '호세아': 'hos', '호': 'hos',
  '요엘': 'joe', '욜': 'joe',
  '아모스': 'amo', '암': 'amo',
  '오바댜': 'oba', '옵': 'oba',
  '요나': 'jon', '욘': 'jon',
  '미가': 'mic', '미': 'mic',
  '나훔': 'nah', '나': 'nah',
  '하박국': 'hab', '합': 'hab',
  '스바냐': 'zep', '습': 'zep',
  '학개': 'hag', '학': 'hag',
  '스가랴': 'zec', '슥': 'zec',
  '말라기': 'mal', '말': 'mal',
  '마태복음': 'mat', '마': 'mat',
  '마가복음': 'mar', '막': 'mar',
  '누가복음': 'luk', '눅': 'luk',
  '요한복음': 'joh', '요': 'joh',
  '사도행전': 'act', '행': 'act',
  '로마서': 'rom', '롬': 'rom',
  '고린도전서': '1co', '고전': '1co',
  '고린도후서': '2co', '고후': '2co',
  '갈라디아서': 'gal', '갈': 'gal',
  '에베소서': 'eph', '앱': 'eph',
  '빌립보서': 'phi', '빌': 'phi',
  '골로새서': 'col', '골': 'col',
  '데살로니가전서': '1th', '살전': '1th',
  '데살로니가후서': '2th', '살후': '2th',
  '디모데전서': '1ti', '딤전': '1ti',
  '디모데후서': '2ti', '딤후': '2ti',
  '디도서': 'tit', '딛': 'tit',
  '빌레몬서': 'phm', '몬': 'phm',
  '히브리서': 'heb', '히': 'heb',
  '야고보서': 'jam', '야': 'jam',
  '베드로전서': '1pe', '벧전': '1pe',
  '베드로후서': '2pe', '벧후': '2pe',
  '요한1서': '1jo', '요일': '1jo',
  '요한2서': '2jo', '요이': '2jo',
  '요한3서': '3jo', '요삼': '3jo',
  '유다서': 'jud', '유': 'jud',
  '요한계시록': 'rev', '계': 'rev',
};

async function loadBibleData() {
  if (bibleData) return bibleData;
  try {
    const res = await fetch('/data/bible.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bibleData = await res.json();
    return bibleData;
  } catch (e) {
    console.error('Bible load fail:', e);
    // Retry once
    try {
      console.log('Retrying bible load...');
      const res2 = await fetch('/data/bible.json?retry=1');
      bibleData = await res2.json();
      return bibleData;
    } catch (e2) {
      console.error('Retry failed:', e2);
      return null;
    }
  }
}

// 아바타 이모지 목록
const AVATAR_EMOJIS = ['😊', '😁', '🤗', '😎', '🥰', '😇', '🤓', '😋', '🙏', '✨', '🌟', '⭐', '💫', '🔥', '❤️', '💙', '💚', '💛', '💜', '🧡'];

// 로컬스토리지에서 사용자 정보 불러오기
async function loadUser() {
  console.log('[DEBUG] loadUser() started');
  const stored = localStorage.getItem('harash_user');
  console.log('[DEBUG] stored user:', stored);

  if (stored) {
    try {
      currentUser = JSON.parse(stored);
      console.log('[DEBUG] currentUser parsed:', currentUser);
    } catch (e) {
      console.error('[CRITICAL] Failed to parse user data:', e);
      localStorage.removeItem('harash_user');
      showLoginScreen();
      return;
    }

    // 성경 진도표 로드 (필수)
    // MapScreen이나 ReadingScreen 모두 필요함
    console.log('[DEBUG] calling fetchBiblePlan()');
    await fetchBiblePlan();

    // 저장된 읽기 화면 상태 확인 (새로고침 복구)
    const lastDay = localStorage.getItem('harash_last_reading_day');
    console.log('[DEBUG] lastDay:', lastDay);

    if (lastDay) {
      console.log('[DEBUG] showing ReadingScreen');
      showReadingScreen(parseInt(lastDay));
    } else {
      console.log('[DEBUG] showing MapScreen');
      showMapScreen();
    }
  } else {
    console.log('[DEBUG] No user found, showing LoginScreen');
    showLoginScreen();
  }
}

// 성경 진도표 로드 함수 분리/추가
async function fetchBiblePlan() {
  if (biblePlan.length > 0) return;
  try {
    const res = await fetch('/api/bible-plan');
    if (res.ok) {
      biblePlan = await res.json();
    }
  } catch (e) {
    console.error("Failed to load bible plan", e);
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
            <label class="block text-sm font-medium text-gray-700 mb-2">휴대폰 번호</label>
            <input 
              type="tel"
              id="phone"
              required
              placeholder="01012345678"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
            <div class="text-xs text-gray-400 mt-1">하이픈 없이 입력</div>
          </div>
  
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">PIN</label>
            <input 
              type="password"
              id="pin"
              required
              inputmode="numeric"
              maxlength="6"
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
        
        <div class="mt-6 text-center border-t pt-6">
          <p class="text-gray-600 mb-2">아직 계정이 없으신가요?</p>
          <button 
            onclick="showRegisterScreen()"
            class="text-purple-600 font-semibold hover:text-purple-800 transition-colors"
          >
            회원가입하기
          </button>
        </div>

        <div id="installAppBtn" class="hidden mt-4 text-center">
          <button 
            onclick="installPWA()"
            class="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <i class="fas fa-download mr-2"></i> 앱 설치하기 (홈 화면 추가)
          </button>
        </div>

      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  if (deferredPrompt) {
    document.getElementById('installAppBtn')?.classList.remove('hidden');
  }
}

// 로그인 처리
async function handleLogin(e) {
  e.preventDefault();

  const phone = document.getElementById('phone').value;
  const pin = document.getElementById('pin').value;

  try {
    const response = await axios.post('/api/login', { phone, pin });

    if (response.data.success) {
      currentUser = response.data.user;
      localStorage.setItem('harash_user', JSON.stringify(currentUser));
      showMapScreen();
    }
  } catch (error) {
    alert('로그인에 실패했습니다. (휴대폰/PIN 확인)');
  }
}

// 회원가입 화면
function showRegisterScreen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-gray-800 mb-2">회원가입</h1>
          <p class="text-gray-600">하라쉬 성경읽기에 오신 것을 환영합니다.</p>
        </div>
        
        <form id="registerForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">이름 (실명)</label>
            <input 
              type="text"
              id="regName"
              required
              placeholder="예: 홍길동"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">휴대폰 번호</label>
            <input 
              type="tel"
              id="regPhone"
              required
              placeholder="01012345678"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
            <div class="text-xs text-gray-400 mt-1">하이픈 없이 입력해주세요</div>
          </div>
  
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">PIN 설정 (6자리 숫자)</label>
            <input 
              type="password"
              id="regPin"
              required
              inputmode="numeric"
              minlength="4"
              maxlength="6"
              placeholder="****"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
            <div class="text-xs text-gray-400 mt-1">로그인할 때 사용할 비밀번호입니다</div>
          </div>
  
          <button 
            type="submit"
            class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all mt-4"
          >
            가입하기
          </button>
        </form>

        <div class="mt-6 text-center">
          <button onclick="showLoginScreen()" class="text-sm text-gray-500 hover:text-gray-700">
            이미 계정이 있으신가요? 로그인
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

// 회원가입 처리
async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('regName').value;
  const phone = document.getElementById('regPhone').value;
  const pin = document.getElementById('regPin').value;

  if (pin.length < 4) {
    alert('PIN 번호는 4자리 이상으로 설정해주세요.');
    return;
  }

  try {
    const response = await axios.post('/api/register', { name, phone, pin });

    if (response.data.success) {
      alert('회원가입이 완료되었습니다! 설정한 PIN으로 로그인해주세요.');
      showLoginScreen();
    }
  } catch (error) {
    const msg = error.response?.data?.error || '회원가입에 실패했습니다.';
    alert(msg);
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
  // 오디오 정리 (뒤로가기 시 중지)
  if (window.globalTTSAudio) {
    window.globalTTSAudio.pause();
    window.globalTTSAudio.currentTime = 0;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  // 읽기 화면 상태 해제 (필수: 이 코드가 없으면 새로고침 시 계속 읽기화면으로 돌아감)
  localStorage.removeItem('harash_last_reading_day');

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

  // Group users by team
  const teamsMap = {};
  allUsers.forEach(u => {
    const tid = u.team_id || 9999;
    // team_name 이 없는 경우 (가입 직후 등) 처리
    const tname = u.team_name || (tid === 9999 ? '기타 (팀 없음)' : '팀 ' + tid);

    if (!teamsMap[tid]) teamsMap[tid] = { id: tid, name: tname, users: [], avg_days: 0 };
    teamsMap[tid].users.push(u);
  });

  // Convert to array and sort
  const teams = Object.values(teamsMap).sort((a, b) => {
    if (a.id === 9999) return 1;
    if (b.id === 9999) return -1;
    return a.id - b.id; // ID 순 정렬
  });

  // Calculate team stats and sort users
  teams.forEach(t => {
    if (t.users.length > 0) {
      const total = t.users.reduce((acc, u) => acc + u.total_days_read, 0);
      t.avg_days = total / t.users.length;
    }
    // Sort users: 1. Leader first, 2. Progress descending
    t.users.sort((a, b) => {
      const aIsLeader = a.role === 'team_leader';
      const bIsLeader = b.role === 'team_leader';
      if (aIsLeader && !bIsLeader) return -1;
      if (!aIsLeader && bIsLeader) return 1;
      return b.total_days_read - a.total_days_read;
    });
  });

  const isAdmin = ['senior_pastor', 'associate_pastor', 'minister'].includes(currentUser.role);
  const isLeader = ['team_leader', 'deputy_leader'].includes(currentUser.role);

  app.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <!-- 상단 헤더 -->
      <div class="bg-white shadow-md sticky top-0 z-50">
        <div class="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div class="flex items-center space-x-2 md:space-x-3">
            <button onclick="showAvatarSelector()" class="relative group">
              <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl md:text-3xl cursor-pointer hover:scale-110 transition-transform">
                ${currentUser.avatar_url ? '<img src="' + currentUser.avatar_url + '" class="w-full h-full rounded-full object-cover">' : currentUser.avatar_emoji || '😊'}
              </div>
              <div class="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                <i class="fas fa-pencil-alt text-[8px] md:text-xs text-purple-600"></i>
              </div>
            </button>
            <div class="flex flex-col justify-center">
              <div class="font-bold text-gray-800 text-sm md:text-base leading-tight">${currentUser.name}</div>
              <div class="text-[10px] md:text-xs text-gray-500 leading-tight">${getRoleKorean(currentUser.role)}</div>
            </div>
          </div>
          
          <div class="flex items-center space-x-2 md:space-x-4">
            ${isAdmin ? '<button onclick="showAdminSettings()" class="text-purple-600 hover:text-purple-700 text-lg md:text-xl p-1"><i class="fas fa-cog"></i></button>' : ''}
            ${isLeader ? '<button onclick="showTeamPanel()" class="text-blue-600 hover:text-blue-700 text-lg md:text-xl p-1"><i class="fas fa-users"></i></button>' : ''}
            <div class="flex items-center space-x-1 bg-orange-100 px-2 py-0.5 md:px-3 md:py-1 rounded-full">
              <span class="text-lg md:text-2xl">🔥</span>
              <span class="font-bold text-orange-600 text-sm md:text-base">${currentUser.streak_count}</span>
            </div>
            <button onclick="logout()" class="text-gray-500 hover:text-gray-700 p-1">
              <i class="fas fa-sign-out-alt text-lg md:text-xl"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 가로 스크롤 맵 -->
      <div class="py-10 overflow-x-auto scrollbar-hide">
        <div class="inline-flex items-start space-x-0 px-10 min-w-full justify-center">
          ${renderHorizontalMap()}
        </div>
      </div>

      <!-- 하단 교인 현황 리스트 -->
      <div class="max-w-4xl mx-auto px-6 pb-20 space-y-6">
        ${teams.map(team => {
    const isMyTeam = currentUser.team_id === team.id;
    const isLeader = currentUser.role === 'team_leader' && isMyTeam;

    return `
        <div>
          <div class="flex items-center justify-between mb-3 px-2">
            <h2 class="text-lg font-bold text-gray-800 flex items-center">
              <span class="mr-2">${team.name}</span>
              ${isLeader ? `
                <button onclick="editTeamName(${team.id}, '${team.name}')" class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded ml-2 transition">
                  <i class="fas fa-edit mr-1"></i>팀명 변경
                </button>
              ` : ''}
              <span class="text-xs font-normal text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full">
                평균 ${team.avg_days ? Math.round(team.avg_days) : 0}일
              </span>
            </h2>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="divide-y divide-gray-50">
              ${renderUserList(team.users)}
            </div>
          </div>
        </div>
      `}).join('')}
      </div>
    </div>
  `;
}

// 가로 맵 렌더링 (심플 버전 - 아바타 제거)
function renderHorizontalMap() {
  let html = '';

  // 날짜 필터링 (오늘 기준 +/- 3일)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let centerIdx = biblePlan.findIndex(d => d.date === todayStr);
  if (centerIdx === -1) {
    // 오늘 날짜가 없으면(주말 등), 가장 최근의 과거 유효 날짜를 기준으로 보여줌
    const nextIdx = biblePlan.findIndex(d => d.date > todayStr);
    if (nextIdx > 0) {
      centerIdx = nextIdx - 1;
    } else if (nextIdx === 0) {
      centerIdx = 0;
    } else {
      centerIdx = biblePlan.length - 1;
    }
  }

  const startIdx = Math.max(0, centerIdx - 3);
  const endIdx = Math.min(biblePlan.length, centerIdx + 4);

  const viewPlan = biblePlan.slice(startIdx, endIdx);

  if (viewPlan.length === 0 && biblePlan.length > 0) {
    // Fallback
    viewPlan.push(...biblePlan.slice(0, 7));
  }

  if (viewPlan.length === 0) {
    html = '<div class="w-full text-center p-4 text-gray-400">표시할 일정이 없습니다.</div>';
  }

  viewPlan.forEach((day, index) => {
    const dayNumber = day.day_number;
    const userProgress = currentUser.total_days_read;

    const isCompleted = dayNumber <= userProgress;
    const isCurrent = dayNumber === userProgress + 1;

    // 날짜 기반 잠금 해제 (오늘 날짜보다 이전이거나 같으면 열림)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isUnlockedByDate = day.date <= todayStr;

    const isLocked = !isCompleted && !isCurrent && !isUnlockedByDate;

    // 노드 스타일
    let nodeClass = 'bg-gray-100 text-gray-400 border-2 border-gray-300';
    let icon = '🔒';
    let glow = '';
    let scale = 'scale-100';

    if (isCompleted) {
      nodeClass = 'bg-green-100 text-green-600 border-2 border-green-500';
      icon = '<i class="fas fa-check"></i>';
    } else if (isCurrent) {
      nodeClass = 'bg-white text-purple-600 border-4 border-purple-600 shadow-xl';
      icon = dayNumber;
      glow = 'ring-4 ring-purple-100';
      scale = 'scale-110';
    } else if (isUnlockedByDate) {
      // 날짜는 지났으나 아직 안 읽은(건너뛴) 상태
      nodeClass = 'bg-white text-gray-700 border-2 border-gray-400 border-dashed';
      icon = dayNumber;
    } else {
      // Future nodes
      icon = dayNumber;
    }

    // 날짜 포맷팅 (YYYY-MM-DD -> M/D(요일))
    const dateParts = day.date.split('-');
    const dateStr = `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}(${day.week_day})`;

    html += `
      <div class="flex flex-col items-center relative group z-10 w-20 md:w-28 shrink-0">
        <!-- 상단 날짜 -->
        <div class="mb-2 md:mb-3 text-center h-10 md:h-12 flex flex-col justify-end transition-all ${isCurrent ? 'opacity-100 -translate-y-1' : 'opacity-60 group-hover:opacity-100'}">
          <div class="text-[10px] md:text-xs font-bold text-gray-500 mb-0.5 md:mb-1">${dateStr}</div>
          <div class="text-[8px] md:text-[10px] text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5 bg-white">
            ${day.day_number}일차
          </div>
        </div>
        
        <!-- 원형 노드 -->
        <button 
          onclick="${!isLocked ? 'showReadingScreen(' + dayNumber + ')' : 'void(0)'}"
          class="relative w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-sm md:text-xl font-bold transition-all duration-300 ${nodeClass} ${glow} ${scale} ${isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:shadow-lg'} z-20"
        >
          ${icon}
        </button>
        
        <!-- 하단 책 제목 -->
        <div class="mt-2 md:mt-3 text-center w-20 md:w-24">
          <div class="text-[10px] md:text-xs font-bold text-gray-700 truncate">${day.book_name}</div>
          <div class="text-[8px] md:text-[10px] text-gray-500">${day.start_chapter}-${day.end_chapter}</div>
        </div>
        
        <!-- 연결선 -->
        ${index < viewPlan.length - 1 ? `
          <div class="absolute top-[4.5rem] md:top-[5.8rem] left-[50%] w-full h-1 bg-gray-200 -z-10 transform -translate-y-1/2">
            <div class="h-full bg-green-400 transition-all duration-1000" style="width: ${isCompleted ? '100%' : '0%'}"></div>
          </div>
        ` : ''}
      </div>
    `;
  });

  return html;
}

// 교인 랭킹/현황 리스트 렌더링
function renderMemberRanking() {
  // 진행도 순 정렬
  const sortedUsers = [...allUsers].sort((a, b) => b.total_days_read - a.total_days_read || a.name.localeCompare(b.name));

  return sortedUsers.map((user, index) => {
    const isMe = user.id === currentUser.id;
    const progressPercent = Math.min(100, Math.round((user.total_days_read / biblePlan.length) * 100));

    // 칭찬하기 버튼 (나보다 진도가 같거나 높은 사람에게? 혹은 모두에게?)
    // 본인이 아니면 칭찬하기 버튼 노출
    const showEncourage = !isMe;

    // 진행도 (장수) 계산
    const completedPlan = biblePlan.slice(0, user.total_days_read);
    const totalChapters = completedPlan.reduce((sum, day) => sum + (day.end_chapter - day.start_chapter + 1), 0);

    return `
      <div class="flex items-center px-4 md:px-6 py-3 md:py-4 hover:bg-gray-50 transition-colors ${isMe ? 'bg-purple-50' : ''}">
        <div class="w-6 md:w-8 text-center text-gray-400 font-bold mr-2 md:mr-4 text-xs md:text-sm">${index + 1}</div>
        
        <div class="relative mr-3 md:mr-4 flex-shrink-0">
          <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border-2 ${isMe ? 'border-purple-400' : 'border-gray-200'} flex items-center justify-center text-2xl shadow-sm overflow-hidden">
            ${user.avatar_url ? `<img src="${user.avatar_url}" class="w-full h-full object-cover">` : (user.avatar_emoji || '😊')}
          </div>
          ${index < 3 ? '<div class="absolute -top-1 -right-1 text-base md:text-lg">👑</div>' : ''}
        </div>
        
        <div class="flex-1 min-w-0 mr-2">
          <div class="flex items-center mb-0.5 flex-wrap">
            <span class="font-bold text-gray-800 mr-2 text-sm md:text-base truncate max-w-[80px] md:max-w-none">${user.name}</span>
            <span class="text-[10px] md:text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full whitespace-nowrap">${getRoleKorean(user.role)}</span>
          </div>
          <div class="flex flex-col md:flex-row md:items-center text-[10px] md:text-xs text-gray-500 md:space-x-2 leading-tight">
            <span class="truncate">${user.streak_count}일 연속 🔥</span>
            <span class="hidden md:inline">·</span>
            <span class="truncate">${user.total_days_read}일차 완료</span>
          </div>
        </div>
        
        <div class="flex items-center space-x-1 md:space-x-3 shrink-0">
          ${showEncourage ? `
            <button onclick="showEncouragementDialog(${user.id}, ${user.total_days_read})" class="text-gray-400 hover:text-purple-500 transition-colors p-1 md:p-2">
              <i class="far fa-comment-dots text-lg md:text-xl"></i>
            </button>
          ` : ''}
          <div class="text-right w-10 md:w-16">
            <div class="text-xs md:text-sm font-bold text-purple-600 whitespace-nowrap">${totalChapters}장</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
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
window.showRegisterScreen = showRegisterScreen;
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

// 말씀 읽기 화면 (클라이언트 사이드 렌더링)
async function showReadingScreen(dayNumber) {
  // 상태 저장 (새로고침 시 복구용)
  localStorage.setItem('harash_last_reading_day', dayNumber);

  const app = document.getElementById('app');

  const plan = biblePlan.find(p => p.day_number === dayNumber);
  if (!plan) return;
  window.currentPlan = plan; // Expose for TTS

  // 로딩 표시
  app.innerHTML = `
    <div class="min-h-screen bg-purple-50 flex flex-col items-center justify-center">
      <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mb-4"></div>
      <p class="text-gray-600 font-medium">말씀을 불러오는 중입니다...</p>
      <p class="text-sm text-gray-500 mt-2">${plan.book_name} ${plan.start_chapter}장</p>
      <p class="text-xs text-gray-400 mt-1">(최초 로딩 시 시간이 조금 걸릴 수 있습니다)</p>
    </div>
  `;

  try {
    // 1. Bible Data 로드
    let bible = await loadBibleData();
    let html = '';

    // 2. 책 코드 및 약어 찾기
    const bookCode = BIBLE_BOOK_CODES[plan.book_name];
    let bookAbbr = null;
    let audio_url = '';
    let source_url = '';

    if (bible && bookCode) {
      // 약어 찾기 (짧은 것 우선: '창' vs '창세기')
      bookAbbr = Object.entries(BIBLE_BOOK_CODES)
        .filter(([_, code]) => code === bookCode)
        .map(([key, _]) => key)
        .sort((a, b) => a.length - b.length)[0];

      // 3. 본문 파싱 (여러 장 처리)
      const verses = [];
      const bookName = plan.book_name;

      console.log('Parsing Bible Range:', { bookAbbr, bookName, start: plan.start_chapter, end: plan.end_chapter });

      // start_chapter부터 end_chapter까지 반복
      for (let ch = plan.start_chapter; ch <= plan.end_chapter; ch++) {
        let verseNum = 1;

        // 장 구분 표시 (1장 이상일 때만)
        if (plan.end_chapter > plan.start_chapter) {
          verses.push(`<h3 class="text-xl font-bold text-center text-purple-800 mt-8 mb-4 border-b border-purple-100 pb-2">${ch}장</h3>`);
        } else {
          verses.push(`<div class="mt-4"></div>`); // 첫 장 상단 여백
        }

        while (true) {
          // 시도 1: 약어 + 장:절 (예: 창1:1)
          let key1 = `${bookAbbr}${ch}:${verseNum}`;
          // 시도 2: 전체이름 + 장:절 (예: 창세기1:1)
          let key2 = `${bookName}${ch}:${verseNum}`;

          let text = bible[key1] || bible[key2];

          if (!text) break; // 해당 장의 끝
          verses.push(`<p class="mb-1"><b class="text-purple-700 font-bold mr-1">${verseNum}.</b>${text}</p>`);
          verseNum++;
        }
      }

      if (verses.length > 0) {
        html = verses.join('\n');
      } else {
        console.warn(`No verses found. Plan:`, plan);
        if (!bookCode) {
          html = `<div class="p-4 bg-red-50 text-red-600 rounded">
                <p class="font-bold">성경 책 이름을 찾을 수 없습니다.</p>
                <p>데이터 값: ${plan.book_name}</p>
                <p>동기화가 잘못되었을 수 있습니다. 관리자 설정에서 '진도표 동기화'를 다시 진행해주세요.</p>
             </div>`;
        }
      }

      // 오디오는 첫 장만 재생 (또는 UI에서 선택 가능하게 개선 필요 - 일단 첫 장 유지)
      audio_url = `https://www.bskorea.or.kr/bible/listen.php?version=GAE&book=${bookCode}&chap=${plan.start_chapter}`;
      source_url = `https://www.bskorea.or.kr/bible/korbibReadpage.php?version=GAE&book=${bookCode}&chap=${plan.start_chapter}`;
    }

    app.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex flex-col items-center">
        <!-- Header -->
        <div class="w-full bg-purple-600 text-white sticky top-0 z-50 shadow-lg" id="readingHeader">
          <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onclick="showMapScreen()" class="text-white hover:bg-purple-700 px-3 py-2 rounded-lg transition-colors">
              <i class="fas fa-arrow-left mr-2"></i>뒤로
            </button>
            
            <div class="text-center flex-1 mx-2">
              <div class="font-bold text-lg leading-tight truncate">${plan.week_day} · ${plan.book_name} ${plan.start_chapter}-${plan.end_chapter}장</div>
            </div>

            <!-- Settings Button -->
            <button onclick="toggleSettings()" class="text-white hover:bg-purple-700 px-3 py-2 rounded-lg transition-colors" title="화면 설정">
              <i class="fas fa-font text-xl"></i>
            </button>
            
            <!-- Settings Panel -->
            <div id="settingsPanel" class="hidden absolute top-full right-4 mt-2 w-72 bg-white rounded-2xl shadow-2xl p-5 text-gray-800 border-2 border-purple-100 z-50 animate-fade-in-down">
              <h4 class="font-bold text-gray-900 mb-4 flex items-center">
                <i class="fas fa-sliders-h mr-2 text-purple-600"></i>화면 설정
              </h4>
              
              <div class="mb-5">
                <div class="flex justify-between text-sm text-gray-600 mb-2 font-medium">
                  <span>글꼴</span>
                  <span id="fontFamilyDisplay" class="text-xs bg-gray-100 px-2 py-0.5 rounded">기본</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button onclick="updateFontFamily('Noto Sans KR')" class="font-btn px-2 py-2 rounded-lg text-xs border border-gray-200 hover:border-purple-500 font-sans transition-colors">고딕 (기본)</button>
                  <button onclick="updateFontFamily('Noto Serif KR')" class="font-btn px-2 py-2 rounded-lg text-xs border border-gray-200 hover:border-purple-500 font-serif transition-colors" style="font-family: 'Noto Serif KR', serif">명조</button>
                  <button onclick="updateFontFamily('Gowun Batang')" class="font-btn px-2 py-2 rounded-lg text-xs border border-gray-200 hover:border-purple-500 transition-colors" style="font-family: 'Gowun Batang', serif">고운바탕</button>
                  <button onclick="updateFontFamily('Gowun Dodum')" class="font-btn px-2 py-2 rounded-lg text-xs border border-gray-200 hover:border-purple-500 transition-colors" style="font-family: 'Gowun Dodum', sans-serif">고운돋움</button>
                </div>
              </div>

              <div class="mb-5">
                <div class="flex justify-between text-sm text-gray-600 mb-2 font-medium">
                  <span>글자 크기</span>
                  <span id="fontSizeDisplay">20px</span>
                </div>
                <input type="range" min="16" max="32" value="20" class="w-full accent-purple-600 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer" oninput="updateFontSize(this.value)">
              </div>
              
              <div>
                <div class="flex justify-between text-sm text-gray-600 mb-2 font-medium">
                  <span>줄 간격</span>
                  <span id="lineHeightDisplay">1.8</span>
                </div>
                <input type="range" min="1.4" max="2.4" step="0.1" value="1.8" class="w-full accent-purple-600 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer" oninput="updateLineHeight(this.value)">
              </div>
            </div>
          </div>
        </div>
        
        <div class="w-full max-w-4xl px-4 py-6 flex-1 flex flex-col">
          <div class="bg-white rounded-2xl shadow-lg p-6 md:p-10 mb-8 transition-all relative overflow-hidden">
            
            <!-- TTS Audio Player -->
            <div class="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-5 mb-8 border border-purple-100 shadow-sm relative overflow-hidden">
               <div class="flex items-center justify-between relative z-10">
                <div class="flex items-center space-x-4">
                  <button id="ttsPlayBtn" onclick="toggleTTS()" class="w-14 h-14 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 hover:scale-105 active:scale-95 transition-all focus:outline-none ring-4 ring-purple-100">
                    <i class="fas fa-play text-2xl ml-1"></i>
                  </button>
                  <div>
                    <span class="block font-bold text-gray-800 text-lg">듣기 모드</span>
                    <span id="ttsStatus" class="text-xs text-purple-600 font-medium bg-purple-100 px-2 py-0.5 rounded-full">준비됨</span>
                  </div>
                </div>
                
                 <div class="flex flex-col items-end gap-3">
                    <!-- Speed -->
                    <div class="flex flex-col items-end">
                       <span class="text-xs text-gray-500 font-medium mb-1">속도</span>
                       <div class="flex bg-white rounded-xl shadow-sm border border-purple-100 p-1">
                         <button onclick="setTTSSpeed(0.8)" class="speed-btn px-2 py-1 text-xs rounded-lg text-gray-500 hover:bg-purple-50 transition-colors" data-speed="0.8">0.8</button>
                         <button onclick="setTTSSpeed(1.0)" class="speed-btn px-2 py-1 text-xs rounded-lg bg-purple-100 text-purple-700 font-bold shadow-sm transition-colors" data-speed="1.0">1.0</button>
                         <button onclick="setTTSSpeed(1.2)" class="speed-btn px-2 py-1 text-xs rounded-lg text-gray-500 hover:bg-purple-50 transition-colors" data-speed="1.2">1.2</button>
                         <button onclick="setTTSSpeed(1.5)" class="speed-btn px-2 py-1 text-xs rounded-lg text-gray-500 hover:bg-purple-50 transition-colors" data-speed="1.5">1.5</button>
                       </div>
                    </div>
                    
                    <!-- Voice -->
                    <div class="flex flex-col items-end">
                       <div class="flex items-center gap-1 mb-1">
                           <span class="text-xs text-gray-500 font-medium">목소리</span>
                           <button onclick="showVoiceHelp()" class="text-gray-400 hover:text-purple-600 transition-colors" title="목소리 추가 방법"><i class="fas fa-question-circle text-xs"></i></button>
                       </div>
                       <div class="relative">
                           <select id="ttsVoiceSelect" onchange="changeTTSVoice(this.value)" class="text-xs border border-purple-200 rounded-lg py-1.5 pl-2 pr-6 bg-white outline-none focus:ring-2 focus:ring-purple-100 w-36 shadow-sm text-gray-700 cursor-pointer">
                               <option value="auto">자동 (추천)</option>
                               <option value="" disabled>불러오는 중...</option>
                           </select>
                           <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                             <i class="fas fa-chevron-down text-[10px] text-gray-400"></i>
                           </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            <!-- Bible Text -->
            <div id="bibleTextContainer" class="prose prose-lg max-w-none whitespace-pre-wrap text-gray-800 transition-all font-serif">
              ${html ? html : `
                <div class="text-center py-10">
                  <p class="text-gray-600 mb-4 font-medium">성경 본문을 불러오지 못했습니다.</p>
                  <a href="${source_url}" target="_blank" class="inline-flex items-center bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors shadow-sm">
                    <i class="fas fa-external-link-alt mr-2 text-sm"></i>대한성서공회에서 읽기
                  </a>
                </div>
              `}
            </div>
            
            <!-- Complete Button -->
            <div class="mt-12 flex justify-center pb-8 border-t border-gray-100 pt-8">
              <button onclick="completeReading(${plan.day_number})" class="group bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-10 py-4 rounded-2xl text-xl font-bold hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center">
                <span class="mr-2">📖</span> 읽기 완료
                <i class="fas fa-check ml-2 text-sm opacity-50 group-hover:opacity-100 transition-opacity"></i>
              </button>
            </div>

            <!-- Comments Section -->
            <div class="mt-8 border-t border-gray-100 pt-8">
              <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <i class="fas fa-comments text-purple-600 mr-2"></i> 묵상 나눔
              </h3>

              <!-- Comment List -->
              <div id="commentList" class="space-y-4 mb-8">
                <div class="text-center text-gray-400 py-4 text-sm">로딩 중...</div>
              </div>

              <!-- Comment Form -->
              <div class="bg-gray-50 rounded-xl p-4 flex gap-3">
                <div class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center py-2 shrink-0">
                  ${currentUser.avatar_url ? `<img src="${currentUser.avatar_url}" class="w-full h-full rounded-full object-cover">` : currentUser.avatar_emoji || '😊'}
                </div>
                <div class="flex-1">
                  <textarea id="commentInput" rows="2" placeholder="오늘 말씀에서 은혜받은 점을 나누어보세요..." class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none bg-white"></textarea>
                  <div class="flex justify-end mt-2">
                    <button onclick="submitComment(${plan.day_number})" class="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors">
                      나눔하기
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="text-center mt-4">
               <a href="${source_url}" target="_blank" class="inline-flex items-center text-xs text-gray-400 hover:text-purple-600 transition-colors">
                <i class="fas fa-external-link-alt mr-1"></i> 대한성서공회 원문 보기
              </a>
            </div>

          </div>
        </div>
      </div>
    `;

    // Load Comments
    loadComments(plan.day_number);

    // --- Logic Implementation ---

    // 1. Settings Logic
    const savedFontSize = localStorage.getItem('harash_fontSize') || '20';
    const savedLineHeight = localStorage.getItem('harash_lineHeight') || '1.8';
    const savedFontFamily = localStorage.getItem('harash_fontFamily') || 'Noto Sans KR';

    // UI update
    setTimeout(() => {
      const fsInput = document.querySelector('input[oninput="updateFontSize(this.value)"]');
      const lhInput = document.querySelector('input[oninput="updateLineHeight(this.value)"]');
      if (fsInput) fsInput.value = savedFontSize;
      if (lhInput) lhInput.value = savedLineHeight;
      if (window.updateFontFamily) window.updateFontFamily(savedFontFamily, true); // true = skip save, just link UI
    }, 100);

    window.updateFontSize = function (size) {
      const el = document.getElementById('bibleTextContainer');
      const disp = document.getElementById('fontSizeDisplay');
      if (el) el.style.fontSize = size + 'px';
      if (disp) disp.innerText = size + 'px';
      localStorage.setItem('harash_fontSize', size);
    };

    window.updateLineHeight = function (height) {
      const el = document.getElementById('bibleTextContainer');
      const disp = document.getElementById('lineHeightDisplay');
      if (el) el.style.lineHeight = height;
      if (disp) disp.innerText = height;
      localStorage.setItem('harash_lineHeight', height);
    };

    window.updateFontFamily = function (font, skipSave) {
      const el = document.getElementById('bibleTextContainer');
      const disp = document.getElementById('fontFamilyDisplay');

      let family = "sans-serif";
      if (font === 'Noto Serif KR' || font === 'Gowun Batang') family = "serif";

      if (el) el.style.fontFamily = `"${font}", ${family}`;

      // 버튼 UI 업데이트
      const btns = document.querySelectorAll('.font-btn');
      btns.forEach(btn => {
        const btnFont = btn.getAttribute('onclick').match(/'(.*)'/)[1];
        if (btnFont === font) {
          btn.classList.add('bg-purple-100', 'text-purple-700', 'border-purple-500', 'font-bold');
          btn.classList.remove('border-gray-200');
          if (disp) disp.innerText = btn.innerText.replace(' (기본)', '');
        } else {
          btn.classList.remove('bg-purple-100', 'text-purple-700', 'border-purple-500', 'font-bold');
          btn.classList.add('border-gray-200');
        }
      });

      if (!skipSave) localStorage.setItem('harash_fontFamily', font);
    };

    // Apply initial styles
    window.updateFontSize(savedFontSize);
    window.updateLineHeight(savedLineHeight);
    // FontFamily applied via setTimeout to ensure buttons exist

    window.toggleSettings = function () {
      const panel = document.getElementById('settingsPanel');
      if (panel) panel.classList.toggle('hidden');
    };

    // 2. TTS Logic
    let ttsUtterance = null;
    let isPlaying = false;
    let currentSpeed = 1.0;

    const rawText = document.getElementById('bibleTextContainer').innerText;

    let selectedVoiceURI = localStorage.getItem('tts_voice_uri') || 'auto';

    // TTS 텍스트 정제 (절 번호 제거)
    function cleanTextForTTS(text) {
      // 문장 시작이나 줄바꿈 후 나오는 "숫자 + 점/공백" 패턴 제거
      return text.replace(/(^|\n)\s*\d+\.?\s*/g, '$1');
    }

    // 최적의 한국어 목소리 찾기
    // 최적의 한국어 목소리 찾기
    function getBestKoreanVoice() {
      const voices = window.speechSynthesis.getVoices();

      // 사용자가 선택한 목소리가 있으면 우선 사용
      if (selectedVoiceURI && selectedVoiceURI !== 'auto') {
        const exact = voices.find(v => v.voiceURI === selectedVoiceURI);
        if (exact) return exact;
      }

      // 우선순위 키워드 (Google -> Siri -> Premium -> Neural 등)
      const keywords = ['Google', 'Siri', 'Premium', 'Neural', 'Yuna', 'Sora', 'Hyeji'];

      for (const k of keywords) {
        const v = voices.find(v => v.name.includes(k) && v.lang.includes('ko'));
        if (v) return v;
      }

      return voices.find(v => v.lang.includes('ko'));
    }

    // OpenAI Audio Object (Reuse for Original TTS)
    // ttsAudio is now global to prevent overlap
    if (!window.globalTTSAudio) {
      window.globalTTSAudio = new Audio();
    }
    const ttsAudio = window.globalTTSAudio;

    // [New] BSKorea Original Audio Handler
    function handleOriginalTTS() {
      if (isPlaying) {
        ttsAudio.pause();
        isPlaying = false;
        updateTTSButton(false);
        updateStatus('중지됨', 'gray');
        return;
      }

      if (!currentPlan) {
        alert("읽을 본문이 선택되지 않았습니다.");
        return;
      }

      const bookName = currentPlan.book_name;
      const chapter = currentPlan.start_chapter;

      const bookCode = BIBLE_BOOK_CODES[bookName];
      if (!bookCode) {
        alert(`오디오를 찾을 수 없는 성경입니다: ${bookName}`);
        return;
      }

      // URL Pattern: km003_gae_{book}_{chap}.mp3
      const chapStr = String(chapter).padStart(3, '0');
      // Note: URL is case-sensitive, codes in BIBLE_BOOK_CODES are lowercase (e.g. 'gen'), which matches
      const bskoreaUrl = `https://www.bskorea.or.kr/voice/voice/gae/m/km003_gae_${bookCode}_${chapStr}.mp3`;

      // Proxy URL to bypass CORS
      const url = `/api/proxy/audio?url=${encodeURIComponent(bskoreaUrl)}`;

      updateStatus('오디오 로딩 중...', 'active');
      ttsAudio.src = url;
      ttsAudio.playbackRate = currentSpeed;

      ttsAudio.onloadeddata = () => {
        updateStatus('성우 낭독 중...', 'active');
        ttsAudio.play().catch(e => {
          console.error("Play error:", e);
          updateStatus('재생 오류', 'red');
        });
        isPlaying = true;
        updateTTSButton(true);
      };

      ttsAudio.onerror = (e) => {
        console.error("Audio Load Error", url, e);
        updateStatus('오류', 'red');
        alert("오디오 파일을 불러올 수 없습니다.");
        isPlaying = false;
        updateTTSButton(false);
      };

      ttsAudio.onended = () => {
        isPlaying = false;
        updateTTSButton(false);
        updateStatus('완료', 'purple');
      };
    }

    async function handleOpenAITTS() {
      if (isPlaying) {
        ttsAudio.pause();
        isPlaying = false;
        updateTTSButton(false);
        updateStatus('중지됨', 'gray');
        return;
      }

      const apiKey = localStorage.getItem('openai_api_key') || '';

      updateStatus('AI 음성 생성 중...', 'active');
      try {
        const cleanText = cleanTextForTTS(rawText || '');
        const voiceVal = openAIVoices.find(v => v.id === selectedVoiceURI)?.val || 'shimmer';

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText, voice: voiceVal, apiKey })
        });

        if (response.status === 401) {
          updateStatus('인증 필요', 'red');
          if (confirm("서버에 등록된 API Key가 없습니다.\n직접 키를 입력하시겠습니까?")) {
            showApiKeyModal();
          }
          return;
        }

        if (!response.ok) throw new Error('TTS API Request Failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        ttsAudio.src = url;
        ttsAudio.playbackRate = currentSpeed;
        ttsAudio.play();

        ttsAudio.onended = () => {
          isPlaying = false;
          updateTTSButton(false);
          updateStatus('완료', 'purple');
        };

        isPlaying = true;
        updateTTSButton(true);
        updateStatus('AI 읽는 중...', 'active');

      } catch (e) {
        console.error(e);
        updateStatus('오류', 'red');
        alert("음성 생성 실패: 잠시 후 다시 시도해주세요.");
      }
    }

    window.toggleTTS = function () {
      // 0. Original Mode (Default/Priority)
      if (selectedVoiceURI === 'bskorea-original') {
        handleOriginalTTS();
        return;
      }

      // 1. OpenAI 모드 확인
      if (selectedVoiceURI && selectedVoiceURI.startsWith('openai-')) {
        handleOpenAITTS();
        return;
      }

      // 2. 기존 시스템 TTS 로직
      if ('speechSynthesis' in window) {
        if (isPlaying) {
          window.speechSynthesis.cancel();
          isPlaying = false;
          updateTTSButton(false);
          updateStatus('중지됨', 'gray');
        } else {
          if (!ttsUtterance) {
            // 절 번호를 제거한 텍스트 사용
            const cleanText = cleanTextForTTS(rawText || '');
            ttsUtterance = new SpeechSynthesisUtterance(cleanText);

            // 목소리 설정
            const bestVoice = getBestKoreanVoice();
            if (bestVoice) {
              ttsUtterance.voice = bestVoice;
            }

            ttsUtterance.lang = 'ko-KR';
            ttsUtterance.rate = currentSpeed;

            ttsUtterance.onend = function () {
              isPlaying = false;
              updateTTSButton(false);
              updateStatus('완료', 'purple');
              ttsUtterance = null;
            };

            ttsUtterance.onerror = function (e) {
              console.error("TTS Error:", e);
              isPlaying = false;
              updateTTSButton(false);
              updateStatus('오류', 'red');
            };
          }
          window.speechSynthesis.speak(ttsUtterance);
          isPlaying = true;
          updateTTSButton(true);
          updateStatus('읽는 중...', 'active');
        }
      } else {
        alert("음성 읽기를 지원하지 않는 브라우저입니다.");
      }
    };

    window.setTTSSpeed = function (speed) {
      currentSpeed = speed;
      // Audio Element 속도 조절
      if (ttsAudio) {
        try { ttsAudio.playbackRate = speed; } catch (e) { }
      }
      // System TTS 속도 조절 (Not supported dynamically in all browsers, but try)
      if (ttsUtterance && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setTimeout(window.toggleTTS, 50);
      }

      const btns = document.querySelectorAll('.speed-btn');
      btns.forEach(btn => {
        const s = parseFloat(btn.getAttribute('data-speed'));
        if (Math.abs(s - speed) < 0.1) {
          btn.className = "speed-btn px-2 py-1 text-xs rounded-lg bg-purple-100 text-purple-700 font-bold shadow-sm transition-colors";
        } else {
          btn.className = "speed-btn px-2 py-1 text-xs rounded-lg text-gray-500 hover:bg-purple-50 transition-colors";
        }
      });

      if (isPlaying) {
        window.speechSynthesis.cancel();
        ttsUtterance = null;
        setTimeout(window.toggleTTS, 50);
      }
    };

    const openAIVoices = [
      { id: 'bskorea-original', name: 'Original (성우 낭독 - 무료)', val: 'original' }
    ];

    // 목소리 목록 로드 (OpenAI Only)
    window.loadVoiceList = function () {
      const select = document.getElementById('ttsVoiceSelect');
      if (!select) return;

      select.innerHTML = '';

      openAIVoices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.name;
        if (v.id === selectedVoiceURI) opt.selected = true;
        select.appendChild(opt);
      });

      // Default to Original if not set or invalid
      if (!selectedVoiceURI || (!selectedVoiceURI.startsWith('openai-') && selectedVoiceURI !== 'bskorea-original')) {
        selectedVoiceURI = 'bskorea-original';
        select.value = selectedVoiceURI;
        localStorage.setItem('tts_voice_uri', selectedVoiceURI);
      }

      select.onchange = function () {
        window.changeTTSVoice(this.value);
      }
    };

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = window.loadVoiceList;
    }

    window.changeTTSVoice = function (uri) {
      selectedVoiceURI = uri;
      localStorage.setItem('tts_voice_uri', uri);
      if (isPlaying) {
        window.speechSynthesis.cancel();
        ttsUtterance = null;
        setTimeout(window.toggleTTS, 100);
      }
    };

    window.showVoiceHelp = function () {
      const div = document.createElement('div');
      div.id = 'voiceHelpModal';
      div.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in';
      div.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-slide-up max-h-[90vh] overflow-y-auto">
                <button onclick="document.getElementById('voiceHelpModal').remove()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
                
                <div class="text-center mb-6">
                    <div class="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl"><i class="fas fa-volume-up"></i></div>
                    <h3 class="text-lg font-bold text-gray-800">목소리 설정 가이드</h3>
                    <p class="text-sm text-gray-500 mt-1">더 자연스러운 목소리를 원하시나요?</p>
                </div>
                
                <div class="space-y-6 text-sm text-gray-600">
                    <!-- OpenAI Section -->
                    <div class="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-4 shadow-sm">
                        <div class="flex items-center gap-2 mb-2">
                             <div class="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded">AI 성우</div>
                             <h4 class="font-bold text-indigo-900">OpenAI 초고화질 음성</h4>
                        </div>
                        <p class="mb-3 leading-relaxed text-indigo-800">
                           사람과 구분하기 힘들 정도로 자연스러운 목소리입니다.<br>
                           <span class="text-xs opacity-75">(사용하려면 OpenAI API Key가 필요합니다)</span>
                        </p>
                        <button onclick="showApiKeyModal(); document.getElementById('voiceHelpModal').remove()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition shadow-sm mb-1 flex items-center justify-center">
                            <i class="fas fa-key mr-2"></i>API Key 등록하기
                        </button>
                        <p class="text-[10px] text-indigo-400 mt-1 text-center">* 키는 브라우저에만 저장됩니다.</p>
                    </div>

                    <!-- System Section -->
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <h4 class="font-bold text-gray-800 mb-2 flex items-center"><i class="fas fa-mobile-alt mr-2 text-gray-400"></i>무료 시스템 음성</h4>
                        <div class="space-y-3">
                            <div>
                                <strong class="block text-xs text-gray-500 mb-1">🍎 아이폰 / 맥 (iOS/macOS)</strong>
                                <ol class="list-decimal pl-4 space-y-1 text-xs text-gray-600">
                                    <li>설정 > 손쉬운 사용 > 콘텐츠 말하기 > 음성</li>
                                    <li><strong>한국어 > Siri</strong> 음성 다운로드</li>
                                </ol>
                            </div>
                            <div class="border-t border-gray-200 pt-2">
                                <strong class="block text-xs text-gray-500 mb-1">🤖 안드로이드 (Galaxy 등)</strong>
                                <ol class="list-decimal pl-4 space-y-1 text-xs text-gray-600">
                                    <li>설정 > 일반 > 글자 읽어주기</li>
                                    <li>기본 엔진(삼성/Google) 설정 ⚙️</li>
                                    <li>음성 데이터 설치 > 한국어 다운로드</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6">
                    <button onclick="document.getElementById('voiceHelpModal').remove()" class="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">닫기</button>
                </div>
            </div>
        `;
      document.body.appendChild(div);
    };

    // 프로필 설정 모달
    window.showProfileModal = function () {
      const div = document.createElement('div');
      div.id = 'profileModal';
      div.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in';

      const avatarUrl = currentUser.avatar_url || '';
      const isPhoto = !!avatarUrl;

      div.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
                <button onclick="document.getElementById('profileModal').remove()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
                
                <h3 class="text-xl font-bold text-gray-800 mb-6 text-center">프로필 설정</h3>
                
                <div class="flex flex-col items-center mb-6">
                    <div class="relative group cursor-pointer" onclick="document.getElementById('profileInput').click()">
                        <div id="previewContainer" class="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-100 flex items-center justify-center text-4xl bg-purple-50 shadow-inner">
                            ${isPhoto
          ? `<img src="${avatarUrl}" class="w-full h-full object-cover">`
          : currentUser.avatar_emoji || '😊'}
                        </div>
                        <div class="absolute inset-0 bg-black bg-opacity-30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <i class="fas fa-camera text-white text-xl"></i>
                        </div>
                    </div>
                    <input type="file" id="profileInput" accept="image/*" class="hidden" onchange="handleProfileImage(this)">
                    <p class="text-xs text-gray-500 mt-2">터치하여 사진 변경</p>
                </div>

                <div class="grid grid-cols-5 gap-2 mb-6">
                    ${['😊', '🙏', '📖', '✝️', '🕊️', '❤️', '🌿', '⛪', '🙌', '🎵'].map(emoji => `
                        <button onclick="updateProfileEmoji('${emoji}')" class="text-2xl p-2 hover:bg-purple-50 rounded-lg transition ${currentUser.avatar_emoji === emoji && !isPhoto ? 'bg-purple-100 ring-2 ring-purple-400' : ''}">
                            ${emoji}
                        </button>
                    `).join('')}
                </div>

                <button onclick="saveProfile()" class="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition shadow-lg">
                    저장하기
                </button>
            </div>
        `;
      document.body.appendChild(div);
    };

    window.handleProfileImage = function (input) {
      if (input.files && input.files[0]) {
        const file = input.files[0];

        // 용량 제한 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('사진 용량이 너무 큽니다. (5MB 이하)');
          return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          // 이미지 리사이징 (Client-side)
          const img = new Image();
          img.src = e.target.result;
          img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 최대 150px
            const maxSize = 150;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxSize) {
                height *= maxSize / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width *= maxSize / height;
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Base64 (JPEG 70%)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

            // Preview Update
            const preview = document.getElementById('previewContainer');
            preview.innerHTML = `<img src="${dataUrl}" class="w-full h-full object-cover">`;
            preview.dataset.newInfo = JSON.stringify({ type: 'image', value: dataUrl });
          }
        };
        reader.readAsDataURL(file);
      }
    };

    window.updateProfileEmoji = function (emoji) {
      const preview = document.getElementById('previewContainer');
      preview.innerHTML = emoji;
      preview.className = "w-24 h-24 rounded-full overflow-hidden border-4 border-purple-100 flex items-center justify-center text-4xl bg-purple-50 shadow-inner"; // Reset styling in case it was image
      preview.dataset.newInfo = JSON.stringify({ type: 'emoji', value: emoji });
    };

    window.saveProfile = async function () {
      const preview = document.getElementById('previewContainer');
      const newInfoStr = preview.dataset.newInfo;

      if (!newInfoStr) {
        document.getElementById('profileModal').remove();
        return;
      }

      const newInfo = JSON.parse(newInfoStr);
      try {
        await axios.post(`/api/user/${currentUser.id}/avatar`, {
          avatar_emoji: newInfo.type === 'emoji' ? newInfo.value : currentUser.avatar_emoji,
          avatar_url: newInfo.type === 'image' ? newInfo.value : null
        });

        // 로컬 업데이트
        if (newInfo.type === 'emoji') {
          currentUser.avatar_emoji = newInfo.value;
          currentUser.avatar_url = null;
        } else {
          currentUser.avatar_url = newInfo.value;
        }

        localStorage.setItem('user', JSON.stringify(currentUser));
        alert('프로필이 저장되었습니다.');
        document.getElementById('profileModal').remove();

        // 화면 갱신 (리로드 없이)
        if (typeof showMapScreen === 'function') showMapScreen();

      } catch (error) {
        alert('저장 실패: ' + error.message);
      }
    };

    function updateTTSButton(playing) {
      const btn = document.getElementById('ttsPlayBtn');
      if (btn) {
        if (playing) {
          btn.innerHTML = '<i class="fas fa-stop text-2xl ml-0.5"></i>';
          btn.classList.add('animate-pulse');
        } else {
          btn.innerHTML = '<i class="fas fa-play text-2xl ml-1"></i>';
          btn.classList.remove('animate-pulse');
        }
      }
    }

    function updateStatus(text, type) {
      const el = document.getElementById('ttsStatus');
      if (!el) return;
      el.innerText = text;
      if (type === 'active') el.className = "text-xs text-purple-600 font-bold bg-purple-100 px-2 py-0.5 rounded-full animate-pulse";
      else if (type === 'gray') el.className = "text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full";
      else el.className = "text-xs text-purple-600 font-medium bg-purple-100 px-2 py-0.5 rounded-full";
    }

    window.onbeforeunload = function () { window.speechSynthesis.cancel(); };

    if (window.loadVoiceList) setTimeout(window.loadVoiceList, 500);



  } catch (e) {
    console.error('Reading load error:', e);
    app.innerHTML = '<div class="p-4 text-center">오류가 발생했습니다. 다시 시도해주세요.</div>';
  }
}



// 완독 확인
async function completeReading(dayNumber) {
  try {
    if (!currentUser) {
      alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
      showLoginScreen();
      return;
    }

    // 서버로 완독 요청 전송
    await axios.post('/api/reading/' + currentUser.id, {
      chapters_read: 5,
      day_number: dayNumber // 진도 체크용
    });

    confetti();

    // 지도로 이동
    setTimeout(() => {
      showMapScreen();
    }, 1500);
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.error || '기록 저장에 실패했습니다.';
    alert(msg);
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

// 조직도 그래프 보기
window.showAdminGraph = async function () {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="flex items-center justify-center h-screen"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>';

  try {
    const res = await axios.get('/api/admin/graph');
    const { nodes, links } = res.data;

    app.innerHTML = `
      <div class="relative w-full h-screen bg-gray-900 overflow-hidden">
        <div class="absolute top-4 left-4 z-10 flex space-x-2">
            <button onclick="showMapScreen()" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
                <i class="fas fa-arrow-left mr-2"></i> 돌아가기
            </button>
            <div class="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
                <span class="mr-3"><span class="inline-block w-3 h-3 rounded-full bg-purple-500 mr-1"></span>담임목사</span>
                <span class="mr-3"><span class="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>팀</span>
                <span class="mr-3"><span class="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>팀장</span>
                <span><span class="inline-block w-3 h-3 rounded-full bg-gray-400 mr-1"></span>팀원</span>
            </div>
        </div>
        <div id="graph-container"></div>
      </div>
    `;

    const Graph = ForceGraph()
      (document.getElementById('graph-container'))
      .graphData({ nodes, links })
      .nodeLabel('label')
      .nodeColor(node => {
        if (node.type === 'master') return '#a855f7'; // Purple
        if (node.type === 'team') return '#3b82f6';   // Blue
        if (node.type === 'leader') return '#22c55e'; // Green
        return '#9ca3af'; // Gray
      })
      .nodeVal(node => {
        if (node.type === 'master') return 20;
        if (node.type === 'team') return 15;
        if (node.type === 'leader') return 10;
        return 5;
      })
      .linkColor(() => 'rgba(255,255,255,0.2)')
      .linkWidth(2)
      .nodeCanvasObject((node, ctx, globalScale) => {
        const label = node.label;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

        // Circle
        ctx.beginPath();
        const r = node.type === 'master' ? 8 : (node.type === 'team' ? 6 : 4);
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
        ctx.fillStyle = node.color || (node.type === 'master' ? '#a855f7' : (node.type === 'team' ? '#3b82f6' : (node.type === 'leader' ? '#22c55e' : '#9ca3af')));
        ctx.fill();

        // Image/Emoji?
        if (node.emoji) {
          ctx.font = `${r * 1.5}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'white';
          // ctx.fillText(node.emoji, node.x, node.y); 
          // Emoji rendering might be tricky on canvas, stick to circles for now or use node.emoji if desired
        }

        // Text Label
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(label, node.x, node.y + r + fontSize);

        node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
      })
      .onNodeClick(node => {
        // Zoom to fit?
        Graph.centerAt(node.x, node.y, 1000);
        Graph.zoom(8, 2000);
      });

  } catch (e) {
    alert('조직도 데이터를 불러오는데 실패했습니다.');
    console.error(e);
    showMapScreen();
  }
};

// 관리자 설정 화면
async function showAdminSettings() {
  const app = document.getElementById('app');

  const settings = await axios.get('/api/admin/settings');
  adminSettings = settings.data;

  const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const dayNames = ['월', '화', '수', '목', '금'];
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
          <button type="button" onclick="showMapScreen()" class="hover:bg-purple-700 px-3 py-2 rounded-lg">
            <i class="fas fa-arrow-left mr-2"></i>돌아가기
          </button>
          <h1 class="text-2xl font-bold">프로그램 설정</h1>
          <div class="w-24"></div>
        </div>
      </div>
      
      <div class="max-w-4xl mx-auto p-6 space-y-6">
        <!-- Google Sheet ID 설정 -->
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-table text-green-600 mr-2"></i>
            Google Sheet ID
          </h3>
          <input 
            type="text" 
            id="settingSheetId" 
            value="${adminSettings.spreadsheet_id || ''}"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            placeholder="Google Sheet URL 또는 ID 입력"
          >
          <p class="text-sm text-gray-600 mt-2">
            연동할 구글 시트의 ID 또는 전체 URL을 입력해주세요.
          </p>
        </div>

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
            <p class="text-xs text-blue-800 space-y-1">
              <strong>Sheet 1 (회원정보):</strong> A열:이름 | B열:전화번호 | C열:비밀번호 | D열:직분 | E열:팀<br>
              <strong>Sheet 2 (말씀진도):</strong> A열:날짜 | B열:요일 | C열:성경범위 | D열:본문<br>
              <strong>Apps Script:</strong> 데이터를 앱에서 시트로 내보내려면 스크립트 연결이 필요합니다.
            </p>
          </div>
          
          <div class="mb-4">
             <label class="block text-sm font-bold text-gray-700 mb-1">Google Apps Script 웹 앱 URL</label>
             <input 
                type="text" 
                id="settingAppsScriptUrl" 
                value="${adminSettings.apps_script_url || ''}"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder="https://script.google.com/macros/s/..."
             >
             <p class="text-[10px] text-gray-500 mt-1">
               * 시트 확장 프로그램 > Apps Script > 배포 > 웹 앱 URL을 복사해 붙여넣으세요.
             </p>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-4">
            <button 
              type="button"
              onclick="syncGoogleSheets()"
              class="flex flex-col items-center justify-center bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors border border-gray-200"
            >
              <i class="fas fa-arrow-down text-lg mb-1 text-green-600"></i>
              <span class="font-bold text-sm">시트에서 가져오기</span>
              <span class="text-[10px] text-gray-500">(회원 추가/수정)</span>
            </button>
            <button 
              type="button"
              onclick="exportUsersToSheet()"
              class="flex flex-col items-center justify-center bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors border border-gray-200"
            >
              <i class="fas fa-arrow-up text-lg mb-1 text-blue-600"></i>
              <span class="font-bold text-sm">시트로 내보내기</span>
              <span class="text-[10px] text-gray-500">(앱 명단 ➡ 시트)</span>
            </button>
          </div>

          <button 
            type="button"
            onclick="syncBiblePlan()"
            class="w-full bg-indigo-50 text-indigo-700 px-4 py-3 rounded-xl font-semibold hover:bg-indigo-100 transition-colors border border-indigo-200"
          >
            <i class="fas fa-book-open mr-2"></i>
            진도표 가져오기 (초기화 주의)
          </button>
        </div>
        
        <!-- 저장 버튼 -->
        <div class="sticky bottom-4">
          <button
            type="button"
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

// 팀 이름 변경 (팀장용)
async function editTeamName(teamId, currentName) {
  const newName = prompt('변경할 팀 이름을 입력하세요:', currentName);
  if (!newName || newName === currentName) return;

  try {
    await axios.put(`/api/teams/${teamId}`, { name: newName });
    alert('팀 이름이 변경되었습니다.');
    showMapScreen(); // 화면 갱신
  } catch (error) {
    alert('팀 이름 변경 실패: 권한이 없거나 오류가 발생했습니다.');
  }
}

// 관리자 설정 저장
async function saveAdminSettings() {
  const startDate = document.getElementById('startDate').value;
  let sheetId = document.getElementById('settingSheetId').value.trim();
  const appsScriptUrl = document.getElementById('settingAppsScriptUrl').value.trim();

  // URL에서 ID 추출 로직
  // https://docs.google.com/spreadsheets/d/ID_HERE/edit...
  const urlMatch = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    sheetId = urlMatch[1];
  }

  const selectedDays = Array.from(document.querySelectorAll('#readingDays input:checked'))
    .map(cb => cb.value)
    .join(',');

  if (!selectedDays) {
    alert('최소 1개 이상의 요일을 선택해주세요.');
    return;
  }

  try {
    await axios.post('/api/admin/settings', {
      program_start_date: startDate,
      reading_days: selectedDays,
      spreadsheet_id: sheetId,
      apps_script_url: appsScriptUrl
    });

    alert('설정이 저장되었습니다!');
    showMapScreen();
  } catch (error) {
    alert('설정 저장에 실패했습니다.');
  }
}

// Google Sheets: 회원 동기화
async function syncGoogleSheets() {
  if (!confirm('Google Sheet1에서 회원 정보를 동기화하시겠습니까?')) return;

  try {
    const response = await axios.post('/api/sync/sheets');
    alert(response.data.message);
  } catch (error) {
    alert(error.response?.data?.error || '회원 동기화 실패');
  }
}

// Google Sheets: 성경 진도표 동기화
async function syncBiblePlan() {
  if (!confirm('Google Sheet2에서 성경 읽기표를 동기화하시겠습니까?\n기존 데이터는 초기화됩니다.')) return;

  try {
    const response = await axios.post('/api/sync/bible');
    alert(response.data.message);
  } catch (error) {
    alert(error.response?.data?.error || '진도표 동기화 실패');
  }
}

// Google Sheets: 회원 명단 내보내기
async function exportUsersToSheet() {
  if (!confirm('현재 앱에 저장된 모든 회원 명단을 구글 시트(Sheet1)로 내보내겠습니까?\n(기존 시트 명단은 업데이트됩니다.)')) return;

  try {
    // 1. 설정 확인 (URL 있는지)
    const settings = await axios.get('/api/admin/settings');
    if (!settings.data.apps_script_url) {
      alert('설정에 "Apps Script URL"이 입력되지 않았습니다.\n먼저 스크립트를 배포하고 URL을 저장해주세요.');
      return;
    }

    const response = await axios.post('/api/sync/export/users');

    if (response.data.success) {
      alert('구글 시트로 명단을 성공적으로 내보냈습니다!');
    } else {
      alert('내보내기 실패: ' + (response.data.error || '알 수 없는 오류'));
    }
  } catch (error) {
    console.error(error);
    alert('내보내기 중 오류가 발생했습니다. (Apps Script URL을 제데로 입력했는지 확인해주세요)');
  }
}

// 팀장 패널 (기존 코드 유지)
function showTeamPanel() {
  alert('팀장 패널은 기존 관리자 패널에서 사용해주세요.');
}

// 댓글 로드
async function loadComments(dayNumber) {
  const listEl = document.getElementById('commentList');
  if (!listEl) return;

  try {
    const res = await axios.get('/api/comments/' + dayNumber);
    const comments = res.data;

    if (comments.length === 0) {
      listEl.innerHTML = '<div class="text-center text-gray-400 py-4 text-xs">아직 작성된 나눔이 없습니다. 첫 번째 나눔을 남겨보세요!</div>';
      return;
    }

    listEl.innerHTML = comments.map(c => `
      <div class="flex gap-3 animate-fade-in-up">
        <div class="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
          ${c.avatar_url ? `<img src="${c.avatar_url}" class="w-full h-full object-cover">` : c.avatar_emoji || '😊'}
        </div>
        <div class="flex-1 bg-gray-50 rounded-2xl rounded-tl-none p-3 relative group hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-gray-900 text-sm">${c.user_name} <span class="text-xs text-gray-500 font-normal ml-1">${getRoleKorean(c.role)}</span></span>
            <span class="text-[10px] text-gray-400">${new Date(c.created_at).toLocaleDateString()}</span>
          </div>
          <p class="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">${c.content}</p>
        </div>
      </div>
    `).join('');

  } catch (e) {
    console.error(e);
    listEl.innerHTML = '<div class="text-center text-red-400 py-2 text-xs">댓글을 불러오지 못했습니다.</div>';
  }
}

// 댓글 작성
async function submitComment(dayNumber) {
  const input = document.getElementById('commentInput');
  const content = input.value.trim();

  if (!content) {
    alert('내용을 입력해주세요.');
    return;
  }

  try {
    await axios.post('/api/comments', {
      user_id: currentUser.id,
      day_number: dayNumber,
      content: content
    });

    input.value = '';
    loadComments(dayNumber); // 목록 새로고침
  } catch (e) {
    alert('나눔 등록에 실패했습니다.');
  }
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
