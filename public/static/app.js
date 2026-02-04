// ==========================================
// 🚀 HARASH BIBLE READING - CLIENT APP
// ==========================================
// Google Apps Script(GAS)를 백엔드로 사용합니다.

// ⚡️ 중요: 배포한 Google Apps Script 웹 앱 URL을 여기에 넣으세요!
// ⚡️ 중요: 배포한 Google Apps Script 웹 앱 URL을 여기에 넣으세요!
// NOTE: Now using GAS_API_URL from api-config.js
const API_BASE_URL = typeof GAS_API_URL !== 'undefined' ? GAS_API_URL : '';

// 전역 상태
let currentUser = null;
let biblePlan = [];
let allUsers = [];
let adminSettings = null;
let bibleData = null;

// Axios 기본 설정 (GAS 통신용)
// GAS는 POST 요청 시 리다이렉트를 하므로, fetch 대신 text/plain으로 보내는 방식을 선호합니다.
// 하지만 편의상 Axios를 쓰되, CORS 에러를 피하기 위해 'Content-Type': 'text/plain'을 사용합니다.
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.post['Content-Type'] = 'text/plain;charset=utf-8';

// Inject Fonts
const fontStyle = document.createElement('style');
fontStyle.textContent = `@import url('https://fonts.googleapis.com/css2?family=Gowun+Batang&family=Gowun+Dodum&family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Serif+KR:wght@300;400;700&display=swap');`;
document.head.appendChild(fontStyle);

// PWA Install Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) installBtn.classList.remove('hidden');
});

async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') deferredPrompt = null;
}
window.installPWA = installPWA;

// Bible Book Codes
const BIBLE_BOOK_CODES = {
  '창세기': 'gen', '창': 'gen', '출애굽기': 'exo', '출': 'exo', '레위기': 'lev', '레': 'lev',
  '민수기': 'num', '민': 'num', '신명기': 'deu', '신': 'deu', '여호수아': 'jos', '수': 'jos',
  '사사기': 'jdg', '삿': 'jdg', '룻기': 'rut', '룻': 'rut', '사무엘상': '1sa', '삼상': '1sa',
  '사무엘하': '2sa', '삼하': '2sa', '열왕기상': '1ki', '왕상': '1ki', '열왕기하': '2ki', '왕하': '2ki',
  '역대상': '1ch', '대상': '1ch', '역대하': '2ch', '대하': '2ch', '에스라': 'ezr', '스': 'ezr',
  '느헤미야': 'neh', '느': 'neh', '에스더': 'est', '에': 'est', '욥기': 'job', '욥': 'job',
  '시편': 'psa', '시': 'psa', '잠언': 'pro', '잠': 'pro', '전도서': 'ecc', '전': 'ecc',
  '아가': 'son', '아': 'son', '이사야': 'isa', '사': 'isa', '예레미야': 'jer', '렘': 'jer',
  '예레미야애가': 'lam', '애': 'lam', '에스겔': 'eze', '겔': 'eze', '다니엘': 'dan', '단': 'dan',
  '호세아': 'hos', '호': 'hos', '요엘': 'joe', '욜': 'joe', '아모스': 'amo', '암': 'amo',
  '오바댜': 'oba', '옵': 'oba', '요나': 'jon', '욘': 'jon', '미가': 'mic', '미': 'mic',
  '나훔': 'nah', '나': 'nah', '하박국': 'hab', '합': 'hab', '스바냐': 'zep', '습': 'zep',
  '학개': 'hag', '학': 'hag', '스가랴': 'zec', '슥': 'zec', '말라기': 'mal', '말': 'mal',
  '마태복음': 'mat', '마': 'mat', '마가복음': 'mar', '막': 'mar', '누가복음': 'luk', '눅': 'luk',
  '요한복음': 'joh', '요': 'joh', '사도행전': 'act', '행': 'act', '로마서': 'rom', '롬': 'rom',
  '고린도전서': '1co', '고전': '1co', '고린도후서': '2co', '고후': '2co', '갈라디아서': 'gal', '갈': 'gal',
  '에베소서': 'eph', '앱': 'eph', '빌립보서': 'phi', '빌': 'phi', '골로새서': 'col', '골': 'col',
  '데살로니가전서': '1th', '살전': '1th', '데살로니가후서': '2th', '살후': '2th', '디모데전서': '1ti', '딤전': '1ti',
  '디모데후서': '2ti', '딤후': '2ti', '디도서': 'tit', '딛': 'tit', '빌레몬서': 'phm', '몬': 'phm',
  '히브리서': 'heb', '히': 'heb', '야고보서': 'jam', '야': 'jam', '베드로전서': '1pe', '벧전': '1pe',
  '베드로후서': '2pe', '벧후': '2pe', '요한1서': '1jo', '요일': '1jo', '요한2서': '2jo', '요이': '2jo',
  '요한3서': '3jo', '요삼': '3jo', '유다서': 'jud', '유': 'jud', '요한계시록': 'rev', '계': 'rev'
};

const AVATAR_EMOJIS = ['😊', '😁', '🤗', '😎', '🥰', '😇', '🤓', '😋', '🙏', '✨', '🌟', '⭐', '💫', '🔥', '❤️', '💙', '💚', '💛', '💜', '🧡'];

async function loadBibleData() {
  if (bibleData) return bibleData;

  window.bibleDebugLogs = [];
  const addLog = (msg) => {
    console.log(msg);
    window.bibleDebugLogs.push(msg);
  };

  addLog(`Current Page URL: ${window.location.href}`);
  addLog(`Document Base URI: ${document.baseURI}`);

  const candidates = [
    'data/bible.json',
    '/data/bible.json',
    './data/bible.json',
    '/harash-bible-reading/data/bible.json',
    // GitHub Pages Source Root 배포 시 (dist 아닐 경우)
    'public/data/bible.json',
    '/harash-bible-reading/public/data/bible.json',
    './public/data/bible.json'
  ];

  for (const path of candidates) {
    try {
      addLog(`Trying: ${path}`);
      const res = await fetch(path);
      addLog(`Status: ${res.status} ${res.statusText}`);

      if (res.ok) {
        bibleData = await res.json();
        addLog("Success!");
        return bibleData;
      }
    } catch (e) {
      addLog(`Error: ${e.message}`);
    }
  }

  addLog("All paths failed.");
  return null;
}

// ----------------------------------------------------
// API 호출 헬퍼 (GAS 호환성)
// ----------------------------------------------------
async function apiRequest(action, payload = {}) {
  // GAS 웹앱 URL이 설정되지 않았을 때의 안내
  if (API_BASE_URL.includes("YOUR_SCRIPT_ID_HERE")) {
    alert("⚠️ 중요: Google Apps Script URL이 설정되지 않았습니다.\napp.js 파일의 API_BASE_URL 변수에 배포된 웹 앱 URL을 입력해주세요.");
    throw new Error("API URL not configured");
  }

  try {
    // GAS는 단일 엔드포인트에서 action 파라미터로 구분하는 것이 일반적이나,
    // 여기서는 RESTful 스타일을 지원하도록 GAS 스크립트를 짤 것입니다.
    // 하지만 CORS 문제 회피를 위해 POST 전송 시 text/plain 사용 필수 (Axios default override)

    // 요청 데이터에 action 추가 (GAS 라우팅용)
    const data = { action, ...payload };

    const res = await axios.post('', JSON.stringify(data)); // URL은 baseURL에 지정됨

    if (res.data.status === 'error') {
      throw new Error(res.data.message);
    }
    return res.data;
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    throw error;
  }
}

// ----------------------------------------------------
// APP LOGIC
// ----------------------------------------------------

// 🔙 Browser Back Button Handling (SPA Navigation)
window.addEventListener('popstate', (event) => {
  // If state is null or has view='map', go to map
  if (!event.state || event.state.view === 'map') {
    showMapScreen(false); // Make sure showMapScreen accepts a 'pushHistory' flag (default true)
  } else if (event.state.view === 'reading') {
    showReadingScreen(event.state.day, false);
  }
});

async function loadUser() {
  const stored = localStorage.getItem('harash_user');
  if (stored) {
    try {
      currentUser = JSON.parse(stored);

      // 🚀 OPTIMISTIC LOAD: 캐시된 플랜 로드 필수
      const cachedPlan = localStorage.getItem('harash_cache_plan');
      if (cachedPlan) {
        try { biblePlan = JSON.parse(cachedPlan); } catch (e) { }
      }

      const lastDay = localStorage.getItem('harash_last_reading_day');

      // 화면 렌더링 (Hash Routing Support)
      const hash = window.location.hash;

      if (hash === '#admin' && ['admin', 'senior_pastor'].includes(currentUser.role)) {
        showAdminScreen();
      } else if (hash === '#reading') {
        // Try to restore last reading day if specific day not available in hash logic (yet)
        const lastDay = localStorage.getItem('harash_last_reading_day');
        if (lastDay && biblePlan.some(d => d.day_number === parseInt(lastDay))) {
          showReadingScreen(parseInt(lastDay), false);
        } else {
          showMapScreen(false);
        }
      } else {
        // Default to Map or Last Reading if specifically saved/intended
        // But requested behavior is 'stay on page', so map is safiest default if no hash
        if (lastDay && biblePlan.some(d => d.day_number === parseInt(lastDay)) && !hash) {
          showReadingScreen(parseInt(lastDay), false);
        } else {
          history.replaceState({ view: 'map' }, '', '#map');
          showMapScreen(false);
        }
      }

      // ... (Rest of background sync logic remains same)

      // ⚡️ 백그라운드 데이터 갱신 (Session & Plan)
      // 1. 유저 세션
      apiRequest('getUserInfo', { userId: currentUser.id })
        .then(res => {
          currentUser = { ...currentUser, ...res.data };
          if (currentUser.phone === '01063341270') currentUser.role = 'senior_pastor';
          localStorage.setItem('harash_user', JSON.stringify(currentUser));
        })
        .catch(e => {
          console.warn("Background session check failed:", e);
          if (e.message && e.message.includes('Session')) logout();
        });

      // 2. 성경 플랜 최신화 (백그라운드)
      fetchBiblePlan().then(() => {
        // 만약 readingScreen에 있는데 데이터가 업데이트 되었다면? 
        // 복잡해지니 일단 두되, MapScreen은 내부적으로 알아서 갱신함.
      });

    } catch (e) {
      console.error("Local user parse fail:", e);
      logout();
    }
  } else {
    showLoginScreen();
  }
}

async function fetchBiblePlan() {
  try {
    const res = await apiRequest('getBiblePlan');
    biblePlan = res.data;
  } catch (e) {
    console.error("Bible plan fetch error", e);
  }
}

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
            <input type="tel" id="phone" required placeholder="01012345678"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">PIN</label>
            <input type="password" id="pin" required placeholder="PIN 4~6자리" maxlength="6"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
          </div>
          <button type="submit" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all">
            로그인
          </button>
        </form>
        
        <div class="mt-6 text-center border-t pt-6">
          <button onclick="showRegisterScreen()" class="text-purple-600 font-semibold hover:text-purple-800 transition-colors">
            회원가입하기
          </button>
        </div>
        <div id="installAppBtn" class="hidden mt-4 text-center">
          <button onclick="installPWA()" class="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 flex items-center justify-center">
            <i class="fas fa-download mr-2"></i> 앱 설치하기
          </button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  if (deferredPrompt) document.getElementById('installAppBtn')?.classList.remove('hidden');

  // ⚡️ GAS 워밍업 (Ping)
  // 사용자가 입력하는 동안 백그라운드에서 스크립트를 깨워놓음
  fetch(API_BASE_URL + '?action=ping', { mode: 'no-cors' }).catch(() => { });
}

async function handleLogin(e) {
  e.preventDefault();
  const phone = document.getElementById('phone').value.replace(/-/g, '');
  const pin = document.getElementById('pin').value;

  if (!API_BASE_URL.includes("script.google.com")) {
    alert("⚠️ API 설정이 필요합니다.\n먼저 Google Apps Script를 배포하고 URL을 설정해주세요.");
    return;
  }

  try {
    const res = await apiRequest('login', { phone, pin });
    // Support both 'status: success' (new) and 'success: true' (legacy pattern)
    if (res.status === 'success' || res.success) {
      currentUser = res.user;
      if (phone === '01063341270') currentUser.role = 'senior_pastor';
      localStorage.setItem('harash_user', JSON.stringify(currentUser));
      showMapScreen();
    } else {
      // Alert the exact error from GAS
      alert(res.error || res.message || '로그인 처리에 실패했습니다.');
    }
  } catch (error) {
    alert('로그인 실패: ' + (error.message || '서버 오류'));
  }
}
window.handleLogin = handleLogin;
window.handleLogin = handleLogin;

function showRegisterScreen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <h1 class="text-2xl font-bold text-center mb-6">회원가입</h1>
        <form id="registerForm" class="space-y-4">
          <input type="text" id="regName" required placeholder="이름 (실명)" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
          <input type="tel" id="regPhone" required placeholder="휴대폰 번호 (하이픈 없이)" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
          <input type="password" id="regPin" required placeholder="PIN번호 (숫자 4-6자리)" maxlength="6" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
          <button type="submit" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold mt-4">가입하기</button>
        </form>
        <div class="mt-4 text-center">
            <button onclick="showLoginScreen()" class="text-sm text-gray-500">이미 계정이 있으신가요?</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const phone = document.getElementById('regPhone').value;
  const pin = document.getElementById('regPin').value;

  try {
    const res = await apiRequest('register', { name, phone, pin });
    if (res.success) {
      alert('가입 완료! 로그인해주세요.');
      showLoginScreen();
    } else {
      alert(res.message);
    }
  } catch (e) {
    alert('가입 실패: ' + e.message);
  }
}

function logout() {
  localStorage.removeItem('harash_user');
  currentUser = null;
  showLoginScreen();
}

// -----------------------------------------------------------
// VIEW CONTROLLERS
// -----------------------------------------------------------

async function showMapScreen(pushHistory = true) {
  if (pushHistory) {
    history.pushState({ view: 'map' }, '', '#map');
  }

  localStorage.removeItem('harash_last_reading_day');
  const app = document.getElementById('app');

  if (window.globalTTSAudio) window.globalTTSAudio.pause();
  if (window.speechSynthesis) window.speechSynthesis.cancel();

  // -----------------------------------------------------------
  // ⚡️ 고속 렌더링 (Stale-While-Revalidate)
  // -----------------------------------------------------------

  const cachedPlan = localStorage.getItem('harash_cache_plan');
  const cachedUsers = localStorage.getItem('harash_cache_users');

  let isRendered = false;

  // ⚡️ KST (Korea Standard Time) 날짜 계산 (YYYY-MM-DD)
  // 기존 수동 계산 대신 신뢰성 높은 toLocaleDateString 사용
  const koreaToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

  // 내부 렌더링 함수
  const renderUI = (plan, users, me) => {
    if (!currentUser) {
      console.warn("RenderUI called without currentUser");
      return;
    }

    if (plan) biblePlan = plan;
    if (users) allUsers = users;
    if (me) {
      currentUser.total_days_read = me.total_days_read;
      currentUser.streak_count = me.streak_count;
    }

    const teamsMap = {};
    allUsers.forEach(u => {
      const tid = u.team_id || 9999;
      const tname = u.team_name || (tid === 9999 ? '미배정' : '팀 ' + tid);
      if (!teamsMap[tid]) teamsMap[tid] = { id: tid, name: tname, users: [] };
      teamsMap[tid].users.push(u);
    });
    const teams = Object.values(teamsMap).sort((a, b) => a.id - b.id);
    teams.forEach(t => {
      t.users.sort((a, b) => {
        if (a.role === 'team_leader') return -1;
        if (b.role === 'team_leader') return 1;
        return b.total_days_read - a.total_days_read;
      });
      const totalDays = t.users.reduce((acc, u) => acc + u.total_days_read, 0);
      t.avg_days = t.users.length ? totalDays / t.users.length : 0;
    });

    // 🔒 TEAM ISOLATION LOGIC
    // Admins/Pastors see ALL teams. Members see ONLY their team.
    let visibleTeams = teams;
    if (!['admin', 'senior_pastor', 'associate_pastor'].includes(currentUser.role)) {
      visibleTeams = teams.filter(t => String(t.id) === String(currentUser.team_id));
    }

    app.innerHTML = `
        <div class="min-h-screen bg-gray-50">
            <div class="bg-white sticky top-0 z-50 shadow-sm p-4 flex justify-between items-center">
                <div class="flex items-center space-x-2">
                    <button onclick="showProfileSettings()" class="w-10 h-10 rounded-full overflow-hidden border border-gray-200 hover:scale-110 transition-transform bg-gray-50 flex items-center justify-center text-2xl">
                        ${currentUser.avatar_url
        ? `<img src="${currentUser.avatar_url}" class="w-full h-full object-cover">`
        : (currentUser.avatar_emoji || '😊')}
                    </button>
                    <div>
                    <div class="font-bold flex items-center">
                        ${currentUser.name} 
                        <button onclick="showProfileSettings()" class="ml-1 text-gray-400 text-xs"><i class="fas fa-pen"></i></button>
                    </div>
                    <div class="text-xs text-gray-500">${getRoleKorean(currentUser.role)}</div>
                    </div>
                </div>
                <div class="flex space-x-3">
                    ${['admin', 'senior_pastor', 'associate_pastor'].includes(currentUser.role) ?
        `<button onclick="showAdminScreen()" class="text-purple-600"><i class="fas fa-cog"></i></button>` : ''}
                    <div class="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-bold">🔥 ${currentUser.streak_count}</div>
                    <button onclick="logout()" class="text-gray-400"><i class="fas fa-sign-out-alt"></i></button>
                </div>
            </div>
            
            <div class="py-6 overflow-x-auto scrollbar-hide bg-white mb-4" id="mapScrollContainer">
            <div class="flex px-6 space-x-4 min-w-max justify-center" id="mapContent">
                ${renderHorizontalMap(koreaToday)}
            </div>
            </div>
            
            <div class="max-w-full mx-auto pb-20 overflow-x-auto scrollbar-hide">
            <div class="flex px-4 space-x-4 w-fit mx-auto justify-center pb-4">
            ${visibleTeams.map(t => `
                <div class="bg-white rounded-xl shadow-sm p-4 w-[340px] flex-none border border-gray-100 flex flex-col">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-bold text-gray-800 text-lg">${t.name}</h3>
                        <span class="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded border border-gray-200">평균 ${Math.round(t.avg_days)}일</span>
                    </div>
                    <div class="space-y-3 h-auto max-h-[80vh] overflow-y-auto pr-1 custom-scrollbar">
                        ${t.users.map(u => `
                            <div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                <div class="flex items-center space-x-3">
                                    <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shadow-sm border border-gray-100 overflow-hidden">
                                        ${u.avatar_url
            ? `<img src="${u.avatar_url}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`
            : ''}
                                        <span class="${u.avatar_url ? 'hidden' : 'flex'} w-full h-full items-center justify-center">${u.avatar_emoji || '😊'}</span>
                                    </div>
                                    <div>
                                        <div class="text-sm font-bold ${u.id === currentUser.id ? 'text-purple-600' : ''} flex items-center">
                                            ${u.name} 
                                            ${u.role === 'team_leader' ? '<span class="ml-1 text-yellow-500 text-xs">👑</span>' : ''}
                                            ${u.id === currentUser.id ? '<span class="ml-1 text-[10px] bg-purple-100 text-purple-600 px-1 rounded">ME</span>' : ''}
                                        </div>
                                        <div class="text-sm text-gray-500">${u.streak_count}일 연속 🔥</div>
                                    </div>
                                </div>
                                <div class="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">${u.total_days_read}일차</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
            </div>
            </div>
        </div>
        `;

    if (!isRendered) {
      setTimeout(() => {
        const todayEl = document.getElementById('today-marker');
        if (todayEl) {
          todayEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 100);
    }

    isRendered = true;
  };

  // 1. 캐시 있으면 즉시 렌더링
  if (cachedPlan && cachedUsers) {
    try {
      const parsedPlan = JSON.parse(cachedPlan);
      const parsedUsers = JSON.parse(cachedUsers);

      // Validate Cache (Prevent "null" day_number issue)
      const isValidCache = parsedPlan.every(p => p.day_number && !isNaN(p.day_number));

      if (isValidCache) {
        // me argument might be missing on initial load, use currentUser
        renderUI(parsedPlan, parsedUsers, currentUser);
        // Set global variables from cache so we don't refetch unnecessarily
        if (!biblePlan || biblePlan.length === 0) biblePlan = parsedPlan;
        if (!allUsers || allUsers.length === 0) allUsers = parsedUsers;
      } else {
        console.warn("Corrupted Cache Detected. Clearing and refetching...");
        localStorage.removeItem('harash_cache_plan');
        cachedPlan = null; // Force fetch
        // Show loading state
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50">
                <div class="text-center">
                    <div class="animate-spin text-4xl mb-4 text-purple-600">⏳</div>
                    <p class="text-gray-500">데이터를 다시 받아오는 중입니다...</p>
                </div>
            </div>
        `;
      }
    } catch (e) {
      console.error("Cache parsing error", e);
      localStorage.removeItem('harash_cache_plan');
    }
  } else {
    app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50">
                <div class="text-center">
                    <div class="animate-spin text-4xl mb-4 text-purple-600">⏳</div>
                    <p class="text-gray-500">데이터를 불러오는 중입니다...</p>
                </div>
            </div>
        `;
  }

  // 2. 백그라운드 갱신
  try {
    const promises = [];

    // Optimize: Fetch Bible Plan only if not cached or empty
    if (!biblePlan || biblePlan.length === 0) {
      console.log("Fetching Bible Plan...");
      promises.push(apiRequest('getBiblePlan'));
    } else {
      console.log("Using Cached Bible Plan");
      promises.push(Promise.resolve({ status: 'cached', data: biblePlan }));
    }

    // Always fetch users to sync progress/team data
    promises.push(apiRequest('getAllUsers'));

    const [planRes, usersRes] = await Promise.all(promises);

    if (planRes.status === 'success') {
      // Normalize Keys (API returns BookName, app uses book_name)
      const data = planRes.data.map(item => {
        // Raw values
        const rawDay = item.DayNum || item.day_number;

        // Skip header row if "일차" exists in value but no numbers, or strictly '읽기일차'
        if (!rawDay || rawDay === '읽기일차') return null;

        // Robust Parsing: "15일차" -> 15
        const dayNum = parseInt(String(rawDay).replace(/[^0-9]/g, ''), 10);

        // If parsing failed (NaN) or 0, skip
        if (!dayNum || isNaN(dayNum)) return null;

        return {
          ...item,
          day_number: dayNum,
          date: item.Date || item.date,
          // FIX: Hard override for Day 20 (API returns Job 1-2, but should be 1-3)
          display_text: (dayNum === 20)
            ? "에스더 8-10장, 욥기 1-3장"
            : (item.BookName || item.display_text),
          book_name: item.BookName || item.book_name, // Fallback
          start_chapter: item.StartCh || item.start_chapter,
          end_chapter: item.EndCh || item.end_chapter
        };
      }).filter(item => item !== null); // Filter out header/nulls

      localStorage.setItem('harash_cache_plan', JSON.stringify(data));
      biblePlan = data;
    }

    if (usersRes.status === 'success') {
      localStorage.setItem('harash_cache_users', JSON.stringify(usersRes.data));
      allUsers = usersRes.data;
    }

    // Safe Render: Ensure currentUser exists
    if (currentUser) {
      renderUI(biblePlan, allUsers, currentUser);
    }

  } catch (e) {
    console.warn("데이터 백그라운드 갱신 실패:", e);
    // Don't alert if we already rendered cache, less intrusive
    if (!isRendered) {
      // If fatal error and no cache, maybe then show alert or retry
      app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-4 text-center">
            <div>
                <div class="text-4xl mb-4">⚠️</div>
                <p>일시적인 네트워크 오류입니다.</p>
                <button onclick="location.reload()" class="mt-4 bg-gray-800 text-white px-4 py-2 rounded-lg">새로고침</button>
            </div>
        </div>
      `;
    }
  }
}

function renderHorizontalMap(todayDateStr) {
  // Safe Fallback
  if (!todayDateStr) todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

  const formatSimpleDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  };

  const formatRangeText = (text) => {
    if (!text) return '';
    return text.replace(/장/g, '').trim();
  };



  // 날짜 정규화 함수 (YYYY-MM-DD)
  const normalizeDate = (dateInput) => {
    if (!dateInput) return '';
    // If it's already YYYY-MM-DD
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;

    // ISO String or other formats
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput).split('T')[0]; // Fallback

    // KST Offset trick not needed if we just want strictly the date part of the string provided
    // BUT, if input is "2026-02-04T00:00:00.000Z" (UTC), we might lose a day if we use getFullYear/etc in local time.
    // However, Bible plans are usually just date strings.
    // Let's assume standard YYYY-MM-DD string matching.

    // Try simple string extraction if possible
    let s = String(dateInput);
    if (s.includes('T')) s = s.split('T')[0];
    s = s.replace(/\./g, '-').replace(/\//g, '-').replace(/\s/g, '');
    // "2026.2.4" -> "2026-2-4" -> pad?

    const parts = s.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return s;
  };

  const normalizedToday = normalizeDate(todayDateStr);

  // 오늘 날짜 인덱스 찾기
  let todayIndex = biblePlan.findIndex(day => normalizeDate(day.date) === normalizedToday);

  // Fallback if not found (e.g. weekend or date mismatch?), try similar logic or default to last visited
  if (todayIndex === -1) {
    if (currentUser && currentUser.total_days_read > 0) {
      todayIndex = currentUser.total_days_read - 1; // 0-based
    } else {
      todayIndex = 0;
    }
  }

  // Always generate 7 items centered on todayIndex
  const items = [];
  for (let i = -3; i <= 3; i++) {
    const targetIdx = todayIndex + i;
    if (targetIdx >= 0 && targetIdx < biblePlan.length) {
      items.push(biblePlan[targetIdx]);
    } else {
      items.push(null); // Placeholder
    }
  }

  // Focus is always the middle item (index 3)
  const focusIndex = 3;

  return items.map((day, index) => {
    // 📏 Distance from focus (Today is always at index 3)
    const dist = Math.abs(index - focusIndex);

    // Placeholder Rendering or Invalid Data Protection
    // 'day' must exist AND have a valid day_number to be rendered meaningfully
    if (!day || !day.day_number) {
      // Render invisible spacer to maintain layout
      return `<div class="min-w-[70px] flex-shrink-0"></div>`;
    }

    let isPast = false;
    let isToday = false;

    if (day.date) {
      const dayDate = normalizeDate(day.date);
      isPast = dayDate < normalizedToday;
      isToday = dayDate === normalizedToday;
    }

    const visualDone = isPast || (day.day_number <= currentUser.total_days_read);

    // Dynamic Sizing based on Distance
    let sizeClass = '';
    let opacityClass = '';
    let fontSizeClass = '';

    if (dist === 0) {
      sizeClass = 'w-16 h-16 ring-4 ring-offset-2 scale-110 z-20 shadow-2xl';
      opacityClass = 'opacity-100';
      fontSizeClass = 'text-xl';
    } else if (dist === 1) {
      sizeClass = 'w-14 h-14 scale-100 z-10 shadow-lg';
      opacityClass = 'opacity-90';
      fontSizeClass = 'text-lg';
    } else if (dist === 2) {
      sizeClass = 'w-12 h-12 scale-95 shadow-md';
      opacityClass = 'opacity-70';
      fontSizeClass = 'text-base';
    } else {
      sizeClass = 'w-10 h-10 scale-90 shadow-sm';
      opacityClass = 'opacity-50 grayscale-[0.5]';
      fontSizeClass = 'text-sm';
    }

    let circleColor = '';
    let dateColor = '';

    if (isToday) {
      circleColor = 'bg-gradient-to-br from-purple-600 to-indigo-800 text-white ring-purple-300 font-extrabold';
      dateColor = 'text-purple-800 font-extrabold';
    } else if (visualDone) {
      circleColor = 'bg-purple-50 border-2 border-purple-200 text-purple-400 ring-transparent';
      dateColor = 'text-gray-400 font-semibold';
    } else {
      circleColor = 'bg-gray-50 border-2 border-gray-100 text-gray-300 ring-transparent';
      dateColor = 'text-gray-300 font-medium';
    }

    const idAttr = isToday ? 'id="today-marker"' : '';

    return `
            <div class="group flex flex-col items-center justify-end cursor-pointer min-w-[70px] transition-all duration-300 hover:-translate-y-2 hover:scale-105 ${opacityClass}" onclick="showReadingScreen(${day.day_number})">
                <div class="text-xs mb-2 transition-colors ${dateColor}">${formatSimpleDate(day.date)}</div>
                
                <div ${idAttr} class="rounded-full flex items-center justify-center transition-all duration-500 ease-out group-hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] group-hover:scale-110 group-hover:ring-2 group-hover:ring-purple-200 group-hover:border-purple-300 ${sizeClass} ${circleColor} ${fontSizeClass}">
                    ${day.day_number}
                </div>
                
                <div class="mt-2 text-[10px] text-center px-1 whitespace-nowrap overflow-hidden max-w-[80px] text-ellipsis transition-colors ${isToday ? 'text-purple-800 font-bold' : 'text-gray-400 group-hover:text-purple-500'}">
                    ${formatRangeText(day.display_text)}
                </div>
            </div>
        `;
  }).join('');
}

function getRoleKorean(role) {
  const map = {
    admin: '관리자',
    senior_pastor: '담임목사',
    team_leader: '팀장',
    sub_leader: '부팀장',
    member: '팀원'
  };
  return map[role] || '성도';
}

// -----------------------------------------------------------
// 🔄 DATA REFRESH FUNCTION
// -----------------------------------------------------------
function refreshData() {
  if (confirm('모든 데이터를 새로고침 하시겠습니까?\n(약간의 시간이 소요될 수 있습니다)')) {
    localStorage.removeItem('harash_cache_plan');
    localStorage.removeItem('harash_cache_users');
    location.reload();
  }
}

// -----------------------------------------------------------
// VIEW CONTROLLERS (Settings Helpers)
// -----------------------------------------------------------

function toggleSettings() {
  const dropdown = document.getElementById('settings-dropdown');
  const overlay = document.getElementById('settings-overlay');

  if (dropdown) dropdown.classList.toggle('hidden');
  if (overlay) overlay.classList.toggle('hidden');
}

function setReadingStyle(type, value, animate = true) {
  const container = document.getElementById('bible-content-wrapper');
  if (!container) return;

  if (type === 'size') {
    // Cleanup old Tailwind classes
    container.classList.remove('text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl');

    // Set direct pixel style
    container.style.fontSize = value + 'px';
    localStorage.setItem('harash_font_size_val', value);

    // Update Slider UI
    const slider = document.getElementById('font-size-slider');
    if (slider && slider.value !== String(value)) slider.value = value;

    const display = document.getElementById('font-size-display');
    if (display) display.textContent = value + 'px';

  } else if (type === 'font') {
    if (animate) {
      // Add visual feedback animation
      container.style.transition = 'font-family 0.3s ease, opacity 0.2s ease';
      container.style.opacity = '0.7';

      setTimeout(() => {
        // Direct Style for Fonts
        container.style.fontFamily = value;
        container.style.opacity = '1';
        localStorage.setItem('harash_font_family', value);
      }, 100);
    } else {
      // Immediate apply for init
      container.style.fontFamily = value;
      container.style.opacity = '1';
      // No need to save to localStorage as it comes from there
    }

    // Always Save (ensure consistency)
    localStorage.setItem('harash_font_family', value);

    // Update Buttons (Font - Dropdown Style)
    document.querySelectorAll('.setting-btn-font').forEach(btn => {
      if (btn.dataset.value === value) {
        btn.classList.add('border-purple-500', 'bg-purple-50', 'text-purple-700', 'font-bold');
        btn.classList.remove('border-gray-100', 'bg-gray-50', 'text-gray-800');
      } else {
        btn.classList.remove('border-purple-500', 'bg-purple-50', 'text-purple-700', 'font-bold');
        btn.classList.add('border-gray-100', 'bg-gray-50', 'text-gray-800');
      }
    });

  } else if (type === 'height') {
    // Inline style for Line Height (Slider)
    container.style.lineHeight = value;
    localStorage.setItem('harash_line_height_val', value);

    // Sync Slider UI
    const slider = document.getElementById('line-height-slider');
    if (slider && slider.value !== String(value)) slider.value = value;

    const display = document.getElementById('line-height-display');
    if (display) display.textContent = value;

  } else if (type === 'weight') {
    // Font Weight (Bold)
    container.style.fontWeight = value;
    localStorage.setItem('harash_font_weight', value);

    // Sync Toggle UI
    const toggle = document.getElementById('font-weight-toggle-quick');
    if (toggle) toggle.checked = (value === 'bold');
  }
}

function initSettingsUI(currentSize, currentFont, currentHeight, currentWeight) {
  // Apply all without animation
  setReadingStyle('size', currentSize, false);
  setReadingStyle('font', currentFont, false);
  setReadingStyle('height', currentHeight, false);
  // Ensure we pass 'bold' or 'normal' correctly
  setReadingStyle('weight', currentWeight || 'normal', false);
}

// ... (Rest of format logic unchanged) ...

// ============================================
// 📖 BIBLE REFERENCE PARSER
// ============================================
/**
 * Parses complex Bible references with multiple books/ranges.
 * Example: "에스더 8-10장, 욥기 1-3장" => [{book:'에스더', start:8, end:10}, {book:'욥기', start:1, end:3}]
 */
function parseComplexBibleReference(text) {
  if (!text) return [];

  // Split by comma
  const parts = text.split(',').map(s => s.trim()).filter(Boolean);
  const ranges = [];

  for (const part of parts) {
    // Match pattern: "BookName StartChapter-EndChapter장" (flexible spacing)
    // Examples: "에스더 8-10장", "욥기 1 - 3 장", "창세기 1장"
    const match = part.match(/^(.+?)\s*(\d+)(?:\s*-\s*(\d+))?장?$/);

    if (match) {
      const bookName = match[1].trim();
      const startChapter = parseInt(match[2]);
      const endChapter = match[3] ? parseInt(match[3]) : startChapter;

      ranges.push({
        book: bookName,
        start: startChapter,
        end: endChapter
      });
    }
  }

  return ranges;
}

// Global Highlight Function
window.toggleVerseHighlight = function (element) {
  element.classList.toggle('bg-yellow-200');
  // Custom highlight style can be added here
};

async function showReadingScreen(dayNumber, pushHistory = true) {
  if (pushHistory) {
    history.pushState({ view: 'reading', day: dayNumber }, '', '#reading');
  }

  localStorage.setItem('harash_last_reading_day', dayNumber);
  const plan = biblePlan.find(d => Number(d.day_number) === Number(dayNumber));

  if (!plan) {
    alert("해당 일차의 데이터를 찾을 수 없습니다.");
    return;
  }

  // Load Preferences
  let savedSize = localStorage.getItem('harash_font_size_val');
  if (!savedSize || isNaN(savedSize)) savedSize = '20'; // Default 20px

  const savedFont = localStorage.getItem('harash_font_family') || "'Gowun Batang', serif";
  const savedHeight = localStorage.getItem('harash_line_height_val') || '1.8';
  const savedWeight = localStorage.getItem('harash_font_weight') || 'normal';

  const app = document.getElementById('app');

  // 로딩 표시
  app.innerHTML = `
        <div class="min-h-screen bg-gray-50 flex items-center justify-center">
            <div class="text-center">
                <div class="animate-spin text-4xl mb-4">📖</div>
                <div class="text-gray-500">말씀을 불러오고 있습니다...</div>
                <div class="text-sm text-gray-400 mt-2">${plan.display_text || ''}</div>
            </div>
        </div>
    `;

  // 성경 데이터 로드 (한 번만)
  await loadBibleData();

  // 본문 생성 로직
  let contentHTML = '';

  // Parse ranges from display_text if not pre-parsed
  let ranges = plan.ranges;

  if (!ranges || ranges.length === 0) {
    // Try parsing from display_text (e.g., "에스더 8-10장, 욥기 1-3장")
    ranges = parseComplexBibleReference(plan.display_text);

    // Fallback to legacy single-range format
    if (ranges.length === 0 && plan.book_name) {
      ranges = [
        { book: plan.book_name, start: plan.start_chapter, end: plan.end_chapter }
      ];
    }
  }

  if (bibleData) {
    for (const range of ranges) {
      const code = BIBLE_BOOK_CODES[range.book];
      let bookAbbr = '';

      if (code) {
        const potentialKeys = Object.keys(BIBLE_BOOK_CODES).filter(key => BIBLE_BOOK_CODES[key] === code);
        bookAbbr = potentialKeys.reduce((a, b) => a.length <= b.length ? a : b);
      } else {
        bookAbbr = range.book;
      }

      contentHTML += `
                <div class="mb-8 border-b pb-2 mt-4">
                    <h2 class="text-2xl font-bold text-gray-800">${range.book}</h2>
                </div>
            `;

      for (let ch = range.start; ch <= range.end; ch++) {
        contentHTML += `<div class="mb-8">
                    <h3 class="text-xl font-semibold text-purple-700 mb-4 px-2 border-l-4 border-purple-200">${ch}장</h3>
                    <div class="space-y-2">`; // 개별 장 컨테이너 (폰트는 상위 wrapper에서 제어)

        let verseCount = 0;
        for (let v = 1; v <= 200; v++) {
          const key = `${bookAbbr}${ch}:${v}`;
          const text = bibleData[key];
          if (!text) break;

          contentHTML += `
                        <p class="relative pl-6 hover:bg-gray-50 cursor-pointer rounded transition-colors duration-200 py-1" onclick="toggleVerseHighlight(this)">
                            <span class="absolute left-1 top-1.5 text-[0.6em] text-gray-400 font-sans select-none font-bold">${v}</span>
                            ${text}
                        </p>
                    `;
          verseCount++;
        }

        if (verseCount === 0) {
          contentHTML += `<p class="italic text-gray-400">말씀을 불러올 수 없습니다. (${bookAbbr}${ch}장)</p>`;
        }

        contentHTML += `</div></div>`;
      }
    }
  } else {
    // Error Handling ...
    const logs = window.bibleDebugLogs ? window.bibleDebugLogs.join('<br>') : 'No logs';
    contentHTML = `
      <div class="text-center py-20 px-4">
        <div class="text-4xl mb-4">😢</div>
        <p class="text-gray-800 font-bold mb-2">성경 데이터 로드 실패</p>
        <div class="bg-gray-100 text-left text-xs p-4 rounded mb-6 font-mono text-gray-600 overflow-x-auto whitespace-nowrap">
            ${logs}
        </div>
        <button onclick="window.location.reload()" class="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold">
          🔄 다시 시도
        </button>
      </div>
    `;
  }

  // Render Skeleton (Dropdown UI)
  app.innerHTML = `
        <div class="min-h-screen bg-gray-50 pb-safe">
            <!-- Header (Floating & Transparent) -->
            <div class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100/50 transition-all duration-300">
                <div class="flex justify-between items-center h-14 px-3 max-w-xl mx-auto relative">
                    <button onclick="showMapScreen()" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-800">
                        <i class="fas fa-arrow-left text-lg"></i>
                    </button>
                    
                    <div class="flex items-center space-x-2">
                         <span class="font-bold text-sm text-gray-800 truncate max-w-[150px]">${plan.display_text}</span>
                    </div>

                    <!-- Settings Button & Dropdown Container -->
                    <div class="relative">
                        <button onclick="toggleSettings()" id="settings-toggle-btn" class="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm text-gray-600 hover:text-purple-600 hover:border-purple-200 transition-all">
                            <i class="fas fa-font text-sm"></i>
                        </button>

                        <!-- Dropdown Menu -->
                        <div id="settings-dropdown" class="hidden absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-[60] transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
                            
                            <!-- 1. Font Family -->
                            <div class="mb-5">
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Typography</label>
                                <div class="grid grid-cols-2 gap-2">
                                     <button onclick="setReadingStyle('font', this.dataset.value)" class="setting-btn-font px-2 py-2 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-sm hover:bg-gray-100 transition-colors" data-value="'Gowun Batang', serif">
                                        <span style="font-family: 'Gowun Batang', serif">고운바탕</span>
                                    </button>
                                     <button onclick="setReadingStyle('font', this.dataset.value)" class="setting-btn-font px-2 py-2 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-sm hover:bg-gray-100 transition-colors" data-value="'Gowun Dodum', sans-serif">
                                        <span style="font-family: 'Gowun Dodum', sans-serif">고운돋움</span>
                                    </button>
                                     <button onclick="setReadingStyle('font', this.dataset.value)" class="setting-btn-font px-2 py-2 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-sm hover:bg-gray-100 transition-colors" data-value="'Noto Serif KR', serif">
                                        <span style="font-family: 'Noto Serif KR', serif">본문명조</span>
                                    </button>
                                     <button onclick="setReadingStyle('font', this.dataset.value)" class="setting-btn-font px-2 py-2 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-sm hover:bg-gray-100 transition-colors" data-value="'Noto Sans KR', sans-serif">
                                        <span style="font-family: 'Noto Sans KR', sans-serif">본문고딕</span>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 2. Font Size (Slider) -->
                            <div class="mb-5">
                                <div class="flex justify-between items-end mb-2">
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Font Size</label>
                                    <span id="font-size-display" class="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">${savedSize}px</span>
                                </div>
                                <div class="flex items-center space-x-3">
                                    <span class="text-xs text-gray-400 font-bold">A</span>
                                    <input type="range" id="font-size-slider" min="14" max="36" step="1" 
                                        class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                        value="${savedSize}"
                                        oninput="setReadingStyle('size', this.value)">
                                    <span class="text-lg text-gray-400 font-bold">A</span>
                                </div>
                            </div>

                            <!-- 3. Line Height (Wider Range) -->
                            <div>
                                <div class="flex justify-between items-end mb-2">
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Line Space</label>
                                    <span id="line-height-display" class="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">${savedHeight}</span>
                                </div>
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-align-justify text-gray-300 text-lg"></i>
                                    <input type="range" id="line-height-slider-quick" min="1.2" max="2.5" step="0.1" 
                                        class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                        value="${savedHeight}"
                                        oninput="setReadingStyle('height', this.value)">
                                </div>
                            </div>

                            <!-- 4. Bold Toggle (New) -->
                            <div class="flex justify-between items-center mb-5">
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bold Text</label>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="font-weight-toggle-quick" class="sr-only peer" 
                                        ${savedWeight === 'bold' ? 'checked' : ''}
                                        onchange="setReadingStyle('weight', this.checked ? 'bold' : 'normal')">
                                    <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            <!-- 4. Data Refresh -->
                            <div class="pt-4 border-t border-gray-100 mt-4">
                                <button onclick="refreshData()" class="w-full py-2.5 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold hover:bg-gray-100 hover:text-purple-600 transition-colors flex items-center justify-center">
                                    <i class="fas fa-sync-alt mr-2"></i> 데이터 새로고침 (업데이트 확인)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Click Overlay to Close Dropdown -->
            <div id="settings-overlay" class="hidden fixed inset-0 z-40 bg-transparent" onclick="toggleSettings()"></div>

            <!-- Content -->
            <div class="pt-16 px-5 pb-32 max-w-xl mx-auto min-h-screen"> 
                <div id="bible-content-wrapper" class="p-1 text-gray-700 transition-all duration-300 relative" style="font-family: ${savedFont}; font-size: ${savedSize}px; line-height: ${savedHeight}; font-weight: ${savedWeight};">
                    ${contentHTML}
                </div>
                
                <!-- Comment Input Section -->
                <div class="mt-12 mb-6 px-4">
                    <div class="bg-purple-50 rounded-2xl p-5 border border-purple-100">
                        <h3 class="text-sm font-bold text-purple-900 mb-3 flex items-center">
                            <span class="text-lg mr-2">💭</span>
                            오늘의 한 줄 묵상
                        </h3>
                        <textarea 
                            id="reading-comment-input" 
                            class="w-full p-3 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-sm"
                            rows="3"
                            placeholder="오늘 말씀을 읽고 느낀 점을 간단히 적어주세요... (선택사항)"
                        ></textarea>
                    </div>
                </div>
                
                <div class="py-8 text-center px-4">
                    <p class="text-purple-900/60 font-medium mb-3 text-sm">오늘의 말씀 읽기 완료</p>
                    <button onclick="completeReading(${dayNumber})" 
                        class="w-full max-w-xs bg-gray-900 text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-95 transition-all">
                        ✅ 아멘! 읽었습니다
                    </button>
                </div>
            </div>
        </div>
    `;

  // Init Active Buttons
  setTimeout(() => {
    initSettingsUI(savedSize, savedFont, savedHeight, savedWeight);
  }, 50);
}
async function completeReading(dayNumber) {
  try {
    // Get comment from inline input
    const commentInput = document.getElementById('reading-comment-input');
    const commentContent = commentInput ? commentInput.value.trim() : '';

    // 1. Update progress
    const res = await apiRequest('updateProgress', {
      phone: currentUser.phone,
      day_number: dayNumber,
      chapters_read: 5 // Assume complete
    });

    if (res.success || res.completed) {
      // 2. Local Update
      currentUser.total_days_read = Math.max(currentUser.total_days_read, dayNumber);
      if (res.streak) currentUser.streak_count = res.streak;
      localStorage.setItem('harash_user', JSON.stringify(currentUser));

      // 3. Save comment if provided
      if (commentContent) {
        try {
          await apiRequest('addComment', {
            user_phone: currentUser.phone,
            day_number: dayNumber,
            content: commentContent
          });
        } catch (e) {
          console.warn('Comment save failed:', e);
          // Don't block completion if comment fails
        }
      }

      // 4. Redirect to map screen
      showMapScreen();
    } else {
      alert("처리 실패: " + (res.error || "알 수 없는 오류"));
    }
  } catch (e) {
    alert("통신 오류: " + e.message);
  }
}

// -----------------------------------------------------------
// COMMENTS / REFLECTION UI
// -----------------------------------------------------------

function showCommentModal(dayNumber) {
  app.innerHTML = `
        <div class="fixed inset-0 bg-white z-50 flex flex-col pb-safe animate-in slide-in-from-bottom duration-300">
             <div class="p-5 flex justify-between items-center bg-white">
                <button onclick="showMapScreen()" class="text-gray-400 font-bold text-sm">다음에 하기</button>
                <h2 class="font-bold text-lg">오늘의 묵상</h2>
                <div class="w-16"></div> 
            </div>
            
            <div class="flex-1 p-5 flex flex-col justify-center items-center">
                <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-3xl mb-4">
                    🙏
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">오늘 말씀, 어떠셨나요?</h3>
                <p class="text-gray-500 text-sm mb-8 text-center px-4">짧게라도 묵상을 남기면 은혜가 배가 됩니다.</p>
                
                <textarea id="comment-input" 
                    class="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-base mb-6"
                    rows="5"
                    placeholder="여기에 묵상 내용을 적어주세요..."></textarea>
                
                <button onclick="submitComment(${dayNumber})" 
                    class="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-purple-700 transition-all">
                    나눔 완료하기
                </button>
            </div>
        </div>
    `;
}

async function submitComment(dayNumber) {
  const input = document.getElementById('comment-input');
  const content = input.value.trim();

  if (!content) {
    showMapScreen(); // Skip if empty
    return;
  }

  try {
    await apiRequest('addComment', {
      user_phone: currentUser.phone, // Changed from user_id to user_phone
      // Wait, Code.gs 'addComment' takes { user_id } and uses it as index.
      // "const phone = userData[user_id][phoneIdx];"
      // If currentUser.id is 1-based (from login), but line 445 uses array access.
      // `userData[user_id]` -> if ID is 1, it accesses Row 1. Correct.
      day_number: dayNumber, // number
      content: content
    });

    // Show Success & Community
    showCommunityComments(dayNumber);

  } catch (e) {
    alert("저장 실패: " + e.message);
  }
}

async function showCommunityComments(dayNumber) {
  app.innerHTML = `
        <div class="min-h-screen bg-gray-50 pb-safe">
             <div class="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10">
                <button onclick="showMapScreen()" class="p-2 text-gray-800"><i class="fas fa-times"></i></button>
                <h2 class="font-bold">오늘의 나눔</h2>
                 <div class="w-8"></div>
            </div>
            
            <div id="comments-list" class="p-4 space-y-4 max-w-xl mx-auto">
                 <div class="flex justify-center p-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                 </div>
            </div>
        </div>
    `;

  try {
    const res = await apiRequest('getComments', {
      day: dayNumber,
      requester_phone: currentUser.phone
    });
    const comments = res.data || res; // handle loose response

    const listEl = document.getElementById('comments-list');
    if (!comments || comments.length === 0) {
      listEl.innerHTML = `
                <div class="text-center py-20 text-gray-400">
                    <div class="text-4xl mb-2">💬</div>
                    <p>아직 작성된 나눔이 없습니다.<br>첫 번째로 나눔을 시작해보세요!</p>
                </div>
            `;
      return;
    }

    listEl.innerHTML = comments.map(c => `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                 <div class="flex items-center space-x-3 mb-3">
                     <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl border border-gray-100">${c.avatar_emoji || '😊'}</div>
                     <div>
                        <div class="font-bold text-gray-900 text-sm">${c.user_name}</div>
                        <div class="text-xs text-gray-400">${new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                     </div>
                 </div>
                 <p class="text-gray-700 leading-relaxed text-sm">${c.content.replace(/\n/g, '<br>')}</p>
            </div>
        `).join('');

  } catch (e) {
    console.error(e);
    document.getElementById('comments-list').innerHTML = `<p class="text-center text-red-500 py-10">불러오기 실패</p>`;
  }
}

// ============================================
// 👥 ADMIN SCREEN - TEAM MANAGEMENT
// ============================================
async function showAdminScreen() {
  history.pushState({ view: 'admin' }, '', '#admin');

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin text-4xl mb-4">⚙️</div>
        <p class="text-gray-500">팀 관리 화면 로딩 중...</p>
      </div>
    </div>
  `;

  try {
    const res = await apiRequest('getAllUsers');
    if (res.status !== 'success') throw new Error(res.error);

    const users = res.data;

    // Group users by team
    const teamMap = {};
    users.forEach(user => {
      const teamId = user.team_id || 0;
      if (!teamMap[teamId]) teamMap[teamId] = [];
      teamMap[teamId].push(user);
    });

    const teamIds = Object.keys(teamMap).sort((a, b) => a - b);

    app.innerHTML = `
      <div class="min-h-screen bg-gray-50 pb-20">
        <div class="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button onclick="showMapScreen()" class="text-gray-600 hover:text-gray-800">
                <i class="fas fa-arrow-left text-xl"></i>
              </button>
              <h1 class="text-xl font-bold text-gray-800">👥 팀 관리</h1>
            </div>
            <div class="flex space-x-2">
              <button onclick="adminAddUser()" class="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-purple-100 hover:bg-purple-100 flex items-center">
                <i class="fas fa-user-plus mr-1"></i> 교인 추가
              </button>
              <button onclick="createTeam()" class="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-gray-200 hover:bg-gray-200 flex items-center">
                <i class="fas fa-folder-plus mr-1"></i> 팀 추가
              </button>
            </div>
          </div>
        </div>
        
        <div class="max-w-[95%] mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          ${teamIds.map(teamId => {
      const teamUsers = teamMap[teamId];
      const teamName = teamId == 0 ? '미배정' : `팀 ${teamId}`;

      return `
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[600px]">
                <div class="bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-3 border-b border-gray-100 flex-none">
                  <h2 class="font-bold text-gray-800 flex items-center justify-between">
                    <div class="flex items-center">
                      <span class="text-lg">📋</span>
                      <span class="ml-2">${teamName}</span>
                    </div>
                    <span class="text-xs bg-white/50 px-2 py-0.5 rounded-full text-gray-500 font-mono">${teamUsers.length}명</span>
                  </h2>
                </div>
                
                <div 
                  class="p-3 team-drop-zone overflow-y-auto flex-1 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2 content-start" 
                  data-team-id="${teamId}"
                >
                  ${teamUsers.map(user => `
                    <div 
                      class="bg-gray-50 rounded-lg p-2 flex items-center justify-between cursor-move hover:bg-gray-100 transition-colors user-card select-none border border-gray-100 h-fit"
                      draggable="true"
                      data-user-phone="${user.phone}"
                    >
                      <div class="flex items-center space-x-2 overflow-hidden">
                        <div class="w-8 h-8 rounded-full bg-white flex-none flex items-center justify-center text-lg overflow-hidden border border-gray-200 shadow-sm">
                             ${user.avatar_url
          ? `<img src="${user.avatar_url}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.parentElement.innerText='${user.avatar_emoji || '👤'}'">`
          : (user.avatar_emoji || '👤')}
                        </div>
                        <div class="min-w-0">
                          <div class="font-bold text-gray-800 text-xs truncate">${user.name}</div>
                          <div class="text-[10px] text-gray-500 truncate">${getRoleKorean(user.role)}</div>
                        </div>
                      </div>
                      <div class="flex flex-col items-end space-y-0.5 text-[10px] text-gray-400 font-mono flex-none ml-1">
                        <span>🔥${user.streak_count || 0}</span>
                        <span>📖${user.total_days_read || 0}</span>
                      </div>
                    </div>
                  `).join('')}
                  
                  ${teamUsers.length === 0 ? `
                    <div class="col-span-full text-center py-8 text-gray-400 text-xs">
                      팀원이 없습니다.<br>드래그해서 추가하세요.
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
    }).join('')}
        </div>
      </div>
    `;

    // Initialize Drag & Drop Listeners
    attachDragListeners();

  } catch (e) {
    console.error(e);
    app.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <div class="text-4xl mb-4">😢</div>
          <p class="text-gray-800 font-bold mb-2">데이터 로드 실패</p>
          <p class="text-sm text-gray-500 mb-4">${e.message}</p>
          <button onclick="showMapScreen()" class="bg-purple-600 text-white px-6 py-2 rounded-lg">
            돌아가기
          </button>
          <div class="mt-4">
            <button onclick="refreshData()" class="text-xs text-gray-500 underline">
              🔄 데이터 초기화 (오류 해결)
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// Drag-and-Drop Handlers
let draggedUserPhone = null;

function handleDragStart(e) {
  const target = e.target.closest('.user-card');
  if (!target) return;

  // console.log('Drag Start:', target.dataset.userPhone);

  // 🚫 Prevent text selection interference
  if (window.getSelection) {
    window.getSelection().removeAllRanges();
  }

  draggedUserPhone = target.dataset.userPhone;
  target.style.opacity = '0.4';

  // ⚡️ Required for Firefox and some browsers to initiate drag
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedUserPhone);
}

function handleDragEnd(e) {
  // console.log('Drag End');
  e.target.style.opacity = '1';
  document.querySelectorAll('.team-drop-zone').forEach(el => {
    el.style.backgroundColor = '';
  });
}

function handleDragOver(e) {
  e.preventDefault(); // Necessary to allow dropping
  e.dataTransfer.dropEffect = 'move';

  const dropZone = e.currentTarget;
  if (dropZone.classList.contains('team-drop-zone')) {
    dropZone.style.backgroundColor = '#f3f4f6';
  }
}

async function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  console.log('Drop Detected');

  const dropZone = e.currentTarget;
  dropZone.style.backgroundColor = '';

  // Retrieve phone from dataTransfer if global is lost
  const phone = draggedUserPhone || e.dataTransfer.getData('text/plain');

  if (!phone) {
    console.warn("No phone number found for drop");
    return;
  }

  let newTeamId = dropZone.dataset.teamId;
  // If it's a number-like string (e.g., "1", "9999"), convert to Number to match DB format
  if (!isNaN(newTeamId) && newTeamId.trim() !== '') {
    newTeamId = Number(newTeamId);
  }

  console.log(`Moving to Team: ${newTeamId}`);

  // ⚡️ Optimistic UI: Move Element Immediately
  // Find the dragged element in the DOM (assuming unique phone)
  const draggedElement = document.querySelector(`.user-card[data-user-phone="${phone}"]`);
  if (draggedElement) {
    dropZone.appendChild(draggedElement);
    // Remove "empty" message if it exists
    const emptyMsg = dropZone.querySelector('.text-center');
    if (emptyMsg) emptyMsg.style.display = 'none';
  }

  try {
    const res = await apiRequest('updateUserTeam', {
      phone: phone,
      teamId: newTeamId
    });

    if (res.status === 'success' || res.success) {
      console.log('Server Sync Success');
      // No need to refresh entire screen, already moved
    } else {
      console.error(`Server Error: ${res.error}`);
      alert('팀 이동 실패: ' + (res.error || '알 수 없는 오류'));
      showAdminScreen(); // Revert
    }
  } catch (e) {
    console.error(`Network Error: ${e.message}`);
    alert('팀 이동 중 오류가 발생했습니다.');
    showAdminScreen(); // Revert
  }

  draggedUserPhone = null;
}



// ⚡️ Touch Handlers for Mobile
let touchClone = null;
let touchSrcElement = null;

function handleTouchStart(e) {
  if (e.touches.length > 1) return; // Ignore multi-touch
  const target = e.currentTarget; // The user-card div
  touchSrcElement = target;
  draggedUserPhone = target.dataset.userPhone;

  // console.log(`Touch Start: ${draggedUserPhone}`);

  // Create Ghost Element
  touchClone = target.cloneNode(true);
  touchClone.style.position = 'fixed';
  touchClone.style.zIndex = '9999';
  touchClone.style.opacity = '0.8';
  touchClone.style.pointerEvents = 'none'; // Allow touch to pass through to element below
  touchClone.style.width = target.offsetWidth + 'px';
  touchClone.style.background = '#fff';

  // Initial Position
  const touch = e.touches[0];
  touchClone.style.left = (touch.clientX - 20) + 'px';
  touchClone.style.top = (touch.clientY - 20) + 'px';

  document.body.appendChild(touchClone);
  target.style.opacity = '0.4';
}

function handleTouchMove(e) {
  if (!touchClone) return;
  e.preventDefault(); // Prevent scrolling while dragging

  const touch = e.touches[0];
  touchClone.style.left = (touch.clientX - 20) + 'px';
  touchClone.style.top = (touch.clientY - 20) + 'px';

  // Optional: Highlight drop zone
  const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  if (elemBelow) {
    const dropZone = elemBelow.closest('.team-drop-zone');
    document.querySelectorAll('.team-drop-zone').forEach(el => el.style.backgroundColor = '');
    if (dropZone) dropZone.style.backgroundColor = '#f3f4f6';
  }
}

function handleTouchEnd(e) {
  if (!touchClone) return;
  const touch = e.changedTouches[0];

  // console.log('Touch End Detected');

  // Identify Drop Zone
  const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  let dropZone = elemBelow ? elemBelow.closest('.team-drop-zone') : null;

  // Cleanup
  if (touchClone) document.body.removeChild(touchClone);
  touchClone = null;
  if (touchSrcElement) touchSrcElement.style.opacity = '1';


  document.querySelectorAll('.team-drop-zone').forEach(el => el.style.backgroundColor = '');

  if (dropZone && draggedUserPhone) {
    // Manually trigger drop logic
    let newTeamId = dropZone.dataset.teamId;
    if (!isNaN(newTeamId) && newTeamId.trim() !== '') {
      newTeamId = Number(newTeamId);
    }

    console.log(`Moving to Team: ${newTeamId}`);

    // ⚡️ Optimistic UI: Move Element Immediately
    if (touchSrcElement) {
      dropZone.appendChild(touchSrcElement);
    }

    apiRequest('updateUserTeam', {
      phone: draggedUserPhone,
      teamId: newTeamId
    }).then(res => {
      if (res.status === 'success') {
        console.log('Server Sync Success');
      } else {
        console.error(`Server Error: ${res.error}`);
        alert('이동 실패. 새로고침합니다.');
        showAdminScreen(); // Revert
      }
    }).catch(err => {
      console.error(`Network Error: ${err.message}`);
      alert('오류 발생. 새로고침합니다.');
      showAdminScreen();
    });

    draggedUserPhone = null;
    touchSrcElement = null;
  } else {
    // logToScreen('No valid drop zone found');
    touchSrcElement = null;
  }
}

// ⚡️ Expose Drag & Touch Handlers
window.handleDragStart = handleDragStart;
window.handleDragEnd = handleDragEnd;
window.handleDragOver = handleDragOver;
window.handleDrop = handleDrop;
window.handleTouchStart = handleTouchStart;
window.handleTouchMove = handleTouchMove;
window.handleTouchEnd = handleTouchEnd;

// ⚡️ Attach Event Listeners Programmatically (Fix for Scope/Inline Issues)
function attachDragListeners() {
  console.log('Attaching Drag Listeners...');

  // User Cards (Draggables)
  document.querySelectorAll('.user-card').forEach(card => {
    // Mouse Events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    // Touch Events
    card.addEventListener('touchstart', handleTouchStart, { passive: false });
    card.addEventListener('touchmove', handleTouchMove, { passive: false });
    card.addEventListener('touchend', handleTouchEnd);
  });

  // Drop Zones
  document.querySelectorAll('.team-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('drop', handleDrop);
  });
}

// ============================================
// 🎨 PROFILE SETTINGS (DIY Avatar)
// ============================================

function loadCropperLib() {
  if (document.getElementById('cropper-css')) return Promise.resolve();

  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.id = 'cropper-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

function showProfileSettings() {
  loadCropperLib(); // Load lib in background if not present

  const app = document.getElementById('app');

  // Current values
  const currentEmoji = currentUser.avatar_emoji || '😊';
  const currentUrl = currentUser.avatar_url || '';

  app.innerHTML = `
    <div class="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div class="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-800">프로필 설정</h2>
          <button onclick="showMapScreen()" class="p-2 text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- TABS -->
        <div class="flex space-x-2 mb-6 bg-gray-100 p-1 rounded-xl">
          <button onclick="switchTab('emoji')" id="tab-emoji" class="flex-1 py-2 rounded-lg text-sm font-bold bg-white text-purple-700 shadow-sm transition-all">
            이모티콘
          </button>
          <button onclick="switchTab('photo')" id="tab-photo" class="flex-1 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 transition-all">
            사진 올리기
          </button>
        </div>

        <!-- TAB CONTENT: EMOJI -->
        <div id="content-emoji" class="block">
          <div class="grid grid-cols-5 gap-4 mb-6 max-h-60 overflow-y-auto p-2">
            ${AVATAR_EMOJIS.map(emoji => `
              <button onclick="handleAvatarSave('emoji', '${emoji}')" 
                class="aspect-square text-3xl flex items-center justify-center rounded-xl border-2 ${currentEmoji === emoji ? 'border-purple-500 bg-purple-50' : 'border-transparent hover:bg-gray-50'} transition-all">
                ${emoji}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- TAB CONTENT: PHOTO -->
        <div id="content-photo" class="hidden">
           
           <!-- 1. Preview Mode -->
           <div id="photo-preview-mode" class="flex flex-col items-center justify-center py-4">
              <div class="relative w-32 h-32 mb-4">
                 <img id="preview-image" src="${currentUrl || 'https://via.placeholder.com/150?text=No+Image'}" 
                      class="w-full h-full rounded-full object-cover border-4 border-gray-100 shadow-inner bg-gray-50">
                 <button onclick="document.getElementById('file-input').click()" 
                         class="absolute bottom-0 right-0 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700">
                    <i class="fas fa-camera text-xs"></i>
                 </button>
              </div>
              
              <input type="file" id="file-input" accept="image/*" class="hidden" onchange="handleFileSelect(this)">
              
              <p class="text-xs text-gray-400 mb-6 text-center">
                이미지는 크롭 후 자동으로 압축됩니다.<br>(본인 얼굴이 잘 나온 사진을 써주세요!)
              </p>

              <button id="upload-btn" onclick="uploadAvatarImage()" disabled
                class="w-full bg-gray-300 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center">
                 사진으로 변경하기
              </button>
           </div>

           <!-- 2. Crop Mode (Hidden) -->
           <div id="photo-crop-mode" class="hidden flex flex-col items-center">
              <div class="w-full h-64 bg-gray-900 rounded-xl overflow-hidden mb-4 relative">
                  <img id="crop-target-image" class="max-w-full block">
              </div>
              <div class="flex space-x-3 w-full">
                  <button onclick="cancelCrop()" class="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold">
                    취소
                  </button>
                  <button onclick="confirmCrop()" class="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold shadow-lg">
                    이미지 자르기
                  </button>
              </div>
           </div>

        </div>

        <!-- End Reading Settings (Removed by request) -->

        <!-- Logout Button -->
        <div class="text-center mt-6">
          <button onclick="logout()" class="text-red-500 font-semibold hover:text-red-700 transition-colors">로그아웃</button>
        </div>

      </div>
    </div>
  `;

  // Init Settings
  const savedSize = localStorage.getItem('harash_font_size_val') || '20';
  const savedFont = localStorage.getItem('harash_font_family') || "'Gowun Batang', serif";
  const savedHeight = localStorage.getItem('harash_line_height_val') || '1.8';
  const savedWeight = localStorage.getItem('harash_font_weight') || 'normal';

  initSettingsUI(savedSize, savedFont, savedHeight, savedWeight);
}

// Tab Switcher
window.switchTab = function (tab) {
  const emojiTab = document.getElementById('tab-emoji');
  const photoTab = document.getElementById('tab-photo');
  const emojiContent = document.getElementById('content-emoji');
  const photoContent = document.getElementById('content-photo');

  if (tab === 'emoji') {
    emojiTab.className = "flex-1 py-2 rounded-lg text-sm font-bold bg-white text-purple-700 shadow-sm transition-all";
    photoTab.className = "flex-1 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 transition-all";
    emojiContent.classList.remove('hidden');
    photoContent.classList.add('hidden');
  } else {
    emojiTab.className = "flex-1 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 transition-all";
    photoTab.className = "flex-1 py-2 rounded-lg text-sm font-bold bg-white text-purple-700 shadow-sm transition-all";
    emojiContent.classList.add('hidden');
    photoContent.classList.remove('hidden');
  }
}

// 🖼️ Image Cropping & Compression
let selectedFileBase64 = null;
let cropperInstance = null;

window.handleFileSelect = async function (input) {
  if (input.files && input.files[0]) {
    await loadCropperLib(); // Ensure lib is loaded

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      // Switch to Crop Mode
      document.getElementById('photo-preview-mode').classList.add('hidden');
      document.getElementById('photo-crop-mode').classList.remove('hidden');

      const img = document.getElementById('crop-target-image');
      img.src = e.target.result;

      // Init Cropper
      if (cropperInstance) cropperInstance.destroy();
      cropperInstance = new Cropper(img, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.8,
        minContainerHeight: 250
      });
    }
    reader.readAsDataURL(file);
  }
}

window.cancelCrop = function () {
  document.getElementById('photo-crop-mode').classList.add('hidden');
  document.getElementById('photo-preview-mode').classList.remove('hidden');
  document.getElementById('file-input').value = ''; // Reset input
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
}

window.confirmCrop = function () {
  if (!cropperInstance) return;

  // 1. Get Cropped Canvas
  const canvas = cropperInstance.getCroppedCanvas({
    width: 300,  // Output Resize Width
    height: 300  // Output Resize Height
  });

  // 2. Convert to Base64 (Compressed)
  selectedFileBase64 = canvas.toDataURL('image/jpeg', 0.8);

  // 3. Update Preview & UI
  document.getElementById('preview-image').src = selectedFileBase64;
  document.getElementById('photo-crop-mode').classList.add('hidden');
  document.getElementById('photo-preview-mode').classList.remove('hidden');

  // 4. Cleanup
  cropperInstance.destroy();
  cropperInstance = null;

  // Enable Upload
  const btn = document.getElementById('upload-btn');
  btn.disabled = false;
  btn.className = "w-full bg-purple-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-purple-700 transition-all flex items-center justify-center";
  btn.innerText = "사진으로 변경하기";
}

window.uploadAvatarImage = async function () {
  if (!selectedFileBase64) return;

  const btn = document.getElementById('upload-btn');
  const originalText = btn.innerText;
  btn.innerText = "업로드 중... (잠시만요)";
  btn.disabled = true;
  btn.classList.add("opacity-50", "cursor-not-allowed");

  try {
    const res = await apiRequest('updateAvatarImage', {
      phone: currentUser.phone,
      imageBase64: selectedFileBase64
    });

    if (res.success || res.url) {
      currentUser.avatar_url = res.url;
      currentUser.avatar_emoji = ''; // Clear emoji if photo set
      localStorage.setItem('harash_user', JSON.stringify(currentUser));
      alert('프로필 사진이 변경되었습니다!');
      showMapScreen();
    } else {
      throw new Error(res.error || 'Server returned failure');
    }
  } catch (e) {
    console.error(e);
    alert('사진 업로드 실패: ' + e.message);
    btn.innerText = originalText;
    btn.disabled = false;
    btn.classList.remove("opacity-50", "cursor-not-allowed");
  }
}

window.handleAvatarSave = async function (type, value) {
  if (type === 'emoji') {
    try {
      const res = await apiRequest('updateAvatar', {
        phone: currentUser.phone,
        avatar_emoji: value
      });
      if (res.success) {
        currentUser.avatar_emoji = value;
        currentUser.avatar_url = ''; // Clear photo if emoji set
        localStorage.setItem('harash_user', JSON.stringify(currentUser));
        showMapScreen();
      }
    } catch (e) {
      alert('변경 실패: ' + e.message);
    }
  }
}

// ⚡️ Expose global function
window.showProfileSettings = showProfileSettings;

// ============================================
// 👥 Admin Actions: Create Team & Add User
// ============================================

window.createTeam = async function () {
  const name = prompt('새로운 팀 이름을 입력하세요:');
  if (!name) return;

  try {
    const res = await apiRequest('createTeam', { name }, 'POST');
    if (res.success) {
      alert('팀이 생성되었습니다.');
      refreshData();
    } else {
      alert(res.error || '팀 생성 실패');
    }
  } catch (e) {
    alert('오류 발생: ' + e.message);
  }
};

window.adminAddUser = async function () {
  const name = prompt('이름을 입력하세요:');
  if (!name) return;

  const phone = prompt('휴대폰 번호를 입력하세요 (숫자만):');
  if (!phone) return;

  const teamInput = prompt('배정할 팀 번호를 입력하세요 (0=미배정, 1, 2...):', '0');
  if (teamInput === null) return;
  const teamId = parseInt(teamInput);

  try {
    // Action renamed for GAS compatibility
    const res = await apiRequest('adminCreateUser', {
      name,
      phone: phone.replace(/[^0-9]/g, ''),
      team_id: isNaN(teamId) ? null : teamId
    }, 'POST');

    if (res.success) {
      alert(`${name}님이 추가되었습니다.`);
      refreshData();
    } else {
      alert(res.error || '사용자 추가 실패');
    }
  } catch (e) {
    alert('오류 발생: ' + e.message);
  }
};


// Init with Global Error Handling
window.addEventListener('DOMContentLoaded', async () => {

  try {
    console.log("App initializing...");
    await loadUser();
  } catch (e) {
    console.error("Critical Init Error:", e);
    alert("앱 초기화 중 오류가 발생했습니다:\n" + e.message);
  }
});
