// ==========================================
// 🚀 HARASH BIBLE READING - CLIENT APP
// ==========================================
// Google Apps Script(GAS)를 백엔드로 사용합니다.

// ⚡️ 중요: 배포한 Google Apps Script 웹 앱 URL을 여기에 넣으세요!
const API_BASE_URL = "https://script.google.com/macros/s/AKfycbxAbz8i21jJKnxub6G_tnzGsrx_heDu7BcHNxBy0d-jPLrI6rsWVuTSalsUptzjdVjY/exec";

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

      // 화면 렌더링
      if (lastDay && biblePlan.some(d => d.day_number === parseInt(lastDay))) {
        // Initial load replaces state instead of push
        history.replaceState({ view: 'reading', day: parseInt(lastDay) }, '', '#reading');
        showReadingScreen(parseInt(lastDay), false);
      } else {
        history.replaceState({ view: 'map' }, '', '#map');
        showMapScreen(false);
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
  const phone = document.getElementById('phone').value;
  const pin = document.getElementById('pin').value;

  if (!API_BASE_URL.includes("script.google.com")) {
    alert("⚠️ API 설정이 필요합니다.\n먼저 Google Apps Script를 배포하고 URL을 설정해주세요.");
    return;
  }

  try {
    const res = await apiRequest('login', { phone, pin });
    if (res.success) {
      currentUser = res.user;
      if (phone === '01063341270') currentUser.role = 'senior_pastor';
      localStorage.setItem('harash_user', JSON.stringify(currentUser));
      showMapScreen();
    } else {
      alert(res.message);
    }
  } catch (error) {
    alert('로그인 실패: ' + (error.message || '서버 오류'));
  }
}

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

  const offset = 1000 * 60 * 60 * 9;
  const koreaNow = new Date((new Date()).getTime() + offset);
  const koreaToday = koreaNow.toISOString().split('T')[0];

  // 내부 렌더링 함수
  const renderUI = (plan, users, me) => {
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

    app.innerHTML = `
        <div class="min-h-screen bg-gray-50">
            <div class="bg-white sticky top-0 z-50 shadow-sm p-4 flex justify-between items-center">
                <div class="flex items-center space-x-2">
                    <span class="text-2xl">${currentUser.avatar_emoji || '😊'}</span>
                    <div>
                    <div class="font-bold">${currentUser.name}</div>
                    <div class="text-xs text-gray-500">${getRoleKorean(currentUser.role)}</div>
                    </div>
                </div>
                <div class="flex space-x-3">
                    ${['senior_pastor', 'associate_pastor'].includes(currentUser.role) ?
        `<button onclick="alert('관리자 모드(준비중)')" class="text-purple-600"><i class="fas fa-cog"></i></button>` : ''}
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
            ${teams.map(t => `
                <div class="bg-white rounded-xl shadow-sm p-4 w-[340px] flex-none border border-gray-100 flex flex-col">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-bold text-gray-800 text-lg">${t.name}</h3>
                        <span class="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded border border-gray-200">평균 ${Math.round(t.avg_days)}일</span>
                    </div>
                    <div class="space-y-3 h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                        ${t.users.map(u => `
                            <div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                <div class="flex items-center space-x-3">
                                    <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shadow-sm">${u.avatar_emoji || '😊'}</div>
                                    <div>
                                        <div class="text-sm font-bold ${u.id === currentUser.id ? 'text-purple-600' : ''} flex items-center">
                                            ${u.name} 
                                            ${u.role === 'team_leader' ? '<span class="ml-1 text-yellow-500 text-xs">👑</span>' : ''}
                                            ${u.id === currentUser.id ? '<span class="ml-1 text-[10px] bg-purple-100 text-purple-600 px-1 rounded">ME</span>' : ''}
                                        </div>
                                        <div class="text-[10px] text-gray-500">${u.streak_count}일 연속 🔥</div>
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
      renderUI(parsedPlan, parsedUsers, currentUser);
    } catch (e) {
      console.error("Cache parsing error", e);
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
    const [planRes, usersRes, progressRes] = await Promise.all([
      apiRequest('getBiblePlan'),
      apiRequest('getAllUsers'),
      apiRequest('getUserProgress', { userId: currentUser.id })
    ]);

    if (planRes.status === 'success') {
      localStorage.setItem('harash_cache_plan', JSON.stringify(planRes.data));
      biblePlan = planRes.data;
    }
    if (usersRes.status === 'success') {
      localStorage.setItem('harash_cache_users', JSON.stringify(usersRes.data));
      allUsers = usersRes.data;
    }

    let freshProgress = null;
    if (progressRes.status === 'success') {
      freshProgress = progressRes.data;
    }

    renderUI(biblePlan, allUsers, freshProgress);

  } catch (e) {
    console.warn("데이터 백그라운드 갱신 실패:", e);
    if (!isRendered) {
      alert("데이터 로드 실패. 네트워크를 확인해주세요.");
    }
  }
}

function renderHorizontalMap(todayDateStr) {
  if (!todayDateStr) todayDateStr = new Date().toISOString().split('T')[0];

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

  // 오늘 날짜 인덱스 찾기
  let todayIndex = biblePlan.findIndex(day => day.date === todayDateStr);

  // 오늘 날짜가 없으면 (범위 밖 등), 적절한 위치 찾기
  if (todayIndex === -1) {
    if (biblePlan.length > 0) {
      if (todayDateStr < biblePlan[0].date) todayIndex = 0;
      else todayIndex = biblePlan.length - 1;
    } else {
      todayIndex = 0;
    }
  }

  // 앞뒤 3일 계산 (총 7일)
  const start = Math.max(0, todayIndex - 3);
  const end = Math.min(biblePlan.length, todayIndex + 4); // slice는 end 미포함이므로 +4
  const visibleDays = biblePlan.slice(start, end);

  // 빈 데이터 처리
  if (visibleDays.length === 0) return '<div class="text-gray-400 text-sm">일정을 불러올 수 없습니다.</div>';

  return visibleDays.map(day => {
    let isPast = false;
    let isToday = false;

    if (day.date) {
      isPast = day.date < todayDateStr;
      isToday = day.date === todayDateStr;
    }

    const visualDone = isPast || (day.day_number <= currentUser.total_days_read);

    let circleClass = '';
    if (isToday) {
      // 🎯 TODAY HIGHLIGHT: 더 눈에 띄게 (scale-125, shadow-xl)
      circleClass = 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white ring-4 ring-purple-200 ring-offset-2 scale-125 shadow-xl z-20 font-extrabold';
    } else if (visualDone) {
      circleClass = 'bg-purple-50 border-2 border-purple-200 text-purple-400';
    } else {
      circleClass = 'bg-gray-50 border-2 border-gray-100 text-gray-300';
    }

    const idAttr = isToday ? 'id="today-marker"' : '';

    return `
            <div class="flex flex-col items-center space-y-3 cursor-pointer min-w-[70px] pt-2" onclick="showReadingScreen(${day.day_number})">
                <div class="text-xs font-semibold ${isToday ? 'text-purple-600' : 'text-gray-400'} tracking-tight">${formatSimpleDate(day.date)}</div>
                <div ${idAttr} class="w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${circleClass}">
                    ${day.day_number}
                </div>
                <div class="text-[11px] font-medium ${isToday ? 'text-purple-700 font-bold' : 'text-gray-500'} text-center px-1 whitespace-nowrap overflow-hidden max-w-[90px] text-ellipsis">
                    ${formatRangeText(day.display_text)}
                </div>
            </div>
        `;
  }).join('');
}

function getRoleKorean(role) {
  const map = { senior_pastor: '담임목사', team_leader: '팀장', member: '팀원' };
  return map[role] || '성도';
}

async function showReadingScreen(dayNumber, pushHistory = true) {
  if (pushHistory) {
    history.pushState({ view: 'reading', day: dayNumber }, '', '#reading');
  }

  localStorage.setItem('harash_last_reading_day', dayNumber);
  const plan = biblePlan.find(d => d.day_number === dayNumber);

  if (!plan) {
    alert("해당 일차의 데이터를 찾을 수 없습니다.");
    return;
  }

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

  // plan.ranges가 있으면 사용, 없으면(구버전 호환) 단일 필드 사용
  const ranges = plan.ranges || [
    { book: plan.book_name, start: plan.start_chapter, end: plan.end_chapter }
  ];

  if (bibleData) {
    for (const range of ranges) {
      // 책 이름 매핑: 역대상 -> 1ch -> 대상
      // 1. FullName -> Code (역대상 -> 1ch)
      const code = BIBLE_BOOK_CODES[range.book];
      let bookAbbr = '';

      // 2. Code -> ShortName (1ch -> 대상)
      if (code) {
        // BIBLE_BOOK_CODES에서 해당 code를 가진 키 중 가장 짧은 것을 찾음 (단, 원본과 다를 수 있음)
        // 예: '역대상': '1ch', '대상': '1ch' -> '대상' 선택
        const potentialKeys = Object.keys(BIBLE_BOOK_CODES).filter(key => BIBLE_BOOK_CODES[key] === code);
        // 가장 짧은 키 선택 (대부분 약어는 1~2글자)
        bookAbbr = potentialKeys.reduce((a, b) => a.length <= b.length ? a : b);
      } else {
        // 매핑 실패 시 원본 사용 (혹시 json이 풀네임일 수도 있으니)
        bookAbbr = range.book;
      }

      // 책 제목 섹션
      contentHTML += `
                <div class="mb-8 border-b pb-2 mt-4">
                    <h2 class="text-2xl font-bold text-gray-800">${range.book}</h2>
                </div>
            `;

      // 장별 본문
      for (let ch = range.start; ch <= range.end; ch++) {
        contentHTML += `<div class="mb-6">
                    <h3 class="text-xl font-semibold text-purple-700 mb-3">${ch}장</h3>
                    <div class="space-y-2 text-gray-700 leading-relaxed text-lg font-serif">`;

        let verseCount = 0;
        // 절 반복 (1절부터 시작해서 데이터가 없을 때까지)
        for (let v = 1; v <= 200; v++) { // 200절 안전장치
          const key = `${bookAbbr}${ch}:${v}`;
          const text = bibleData[key];

          if (!text) {
            // 첫 절부터 없으면, 혹시 약어가 틀렸나? -> 그래도 없으면 break
            if (v === 1) {
              // console.log(`Missing: ${key}`);
            }
            break;
          }

          // 텍스트 있음
          contentHTML += `
                        <p class="relative pl-6">
                            <span class="absolute left-0 top-1 text-xs text-gray-400 font-sans select-none">${v}</span>
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
    const logs = window.bibleDebugLogs ? window.bibleDebugLogs.join('<br>') : 'No logs';
    contentHTML = `
      <div class="text-center py-20 px-4">
        <div class="text-4xl mb-4">😢</div>
        <p class="text-gray-800 font-bold mb-2">성경 데이터 로드 실패</p>
        <div class="bg-gray-100 text-left text-xs p-4 rounded mb-6 font-mono text-gray-600 overflow-x-auto whitespace-nowrap">
            ${logs}
        </div>
        <p class="text-gray-500 text-sm mb-6">위 로그를 캡처해서 개발자에게 보내주세요.</p>
        <button onclick="window.location.reload()" class="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-purple-700 transition">
          🔄 다시 시도
        </button>
      </div>
    `;
  }

  app.innerHTML = `
        <div class="min-h-screen bg-gray-50">
            <div class="bg-purple-600 text-white p-4 sticky top-0 z-50 flex justify-between items-center shadow-lg">
                <button onclick="showMapScreen()" class="hover:bg-purple-700 p-2 rounded"><i class="fas fa-arrow-left"></i> 목록</button>
                <div class="font-bold truncate px-2 text-sm">${plan.display_text}</div>
                <div class="w-10"></div>
            </div>
            
            <div class="p-4 max-w-3xl mx-auto bg-white min-h-screen shadow-sm">
                ${contentHTML}
                
                <div class="mt-12 mb-20 p-6 bg-purple-50 rounded-xl border border-purple-100 text-center">
                    <p class="text-purple-800 font-bold mb-2">오늘의 말씀을 모두 읽으셨나요?</p>
                    <p class="text-sm text-gray-600 mb-6">완료 버튼을 누르면 진도표에 기록됩니다.</p>
                    <button onclick="completeReading(${dayNumber})" 
                        class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition-transform">
                        ✅ 읽기 완료
                    </button>
                </div>
            </div>
        </div>
    `;
}
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
    renderUI(parsedPlan, parsedUsers, currentUser);
  } catch (e) {
    console.error("Cache parsing error", e);
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
  const [planRes, usersRes, progressRes] = await Promise.all([
    apiRequest('getBiblePlan'),
    apiRequest('getAllUsers'),
    apiRequest('getUserProgress', { userId: currentUser.id })
  ]);

  if (planRes.status === 'success') {
    localStorage.setItem('harash_cache_plan', JSON.stringify(planRes.data));
    biblePlan = planRes.data;
  }
  if (usersRes.status === 'success') {
    localStorage.setItem('harash_cache_users', JSON.stringify(usersRes.data));
    allUsers = usersRes.data;
  }

  let freshProgress = null;
  if (progressRes.status === 'success') {
    freshProgress = progressRes.data;
  }

  renderUI(biblePlan, allUsers, freshProgress);

} catch (e) {
  console.warn("데이터 백그라운드 갱신 실패:", e);
  if (!isRendered) {
    alert("데이터 로드 실패. 네트워크를 확인해주세요.");
  }
}
}

function renderHorizontalMap(todayDateStr) {
  if (!todayDateStr) todayDateStr = new Date().toISOString().split('T')[0];

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

  // 오늘 날짜 인덱스 찾기
  let todayIndex = biblePlan.findIndex(day => day.date === todayDateStr);

  // 오늘 날짜가 없으면 (범위 밖 등), 적절한 위치 찾기
  if (todayIndex === -1) {
    if (biblePlan.length > 0) {
      if (todayDateStr < biblePlan[0].date) todayIndex = 0;
      else todayIndex = biblePlan.length - 1;
    } else {
      todayIndex = 0;
    }
  }

  // 앞뒤 3일 계산 (총 7일)
  const start = Math.max(0, todayIndex - 3);
  const end = Math.min(biblePlan.length, todayIndex + 4); // slice는 end 미포함이므로 +4
  const visibleDays = biblePlan.slice(start, end);

  // 빈 데이터 처리
  if (visibleDays.length === 0) return '<div class="text-gray-400 text-sm">일정을 불러올 수 없습니다.</div>';

  return visibleDays.map(day => {
    let isPast = false;
    let isToday = false;

    if (day.date) {
      isPast = day.date < todayDateStr;
      isToday = day.date === todayDateStr;
    }

    const visualDone = isPast || (day.day_number <= currentUser.total_days_read);

    let circleClass = '';
    if (isToday) {
      // 🎯 TODAY HIGHLIGHT: 더 눈에 띄게 (scale-125, shadow-xl)
      circleClass = 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white ring-4 ring-purple-200 ring-offset-2 scale-125 shadow-xl z-20 font-extrabold';
    } else if (visualDone) {
      circleClass = 'bg-purple-50 border-2 border-purple-200 text-purple-400';
    } else {
      circleClass = 'bg-gray-50 border-2 border-gray-100 text-gray-300';
    }

    const idAttr = isToday ? 'id="today-marker"' : '';

    return `
            <div class="flex flex-col items-center space-y-3 cursor-pointer min-w-[70px] pt-2" onclick="showReadingScreen(${day.day_number})">
                <div class="text-xs font-semibold ${isToday ? 'text-purple-600' : 'text-gray-400'} tracking-tight">${formatSimpleDate(day.date)}</div>
                <div ${idAttr} class="w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${circleClass}">
                    ${day.day_number}
                </div>
                <div class="text-[11px] font-medium ${isToday ? 'text-purple-700 font-bold' : 'text-gray-500'} text-center px-1 whitespace-nowrap overflow-hidden max-w-[90px] text-ellipsis">
                    ${formatRangeText(day.display_text)}
                </div>
            </div>
        `;
  }).join('');
}

function getRoleKorean(role) {
  const map = { senior_pastor: '담임목사', team_leader: '팀장', member: '팀원' };
  return map[role] || '성도';
}

async function showReadingScreen(dayNumber) {
  localStorage.setItem('harash_last_reading_day', dayNumber);
  const plan = biblePlan.find(d => d.day_number === dayNumber);

  if (!plan) {
    alert("해당 일차의 데이터를 찾을 수 없습니다.");
    return;
  }

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

  // plan.ranges가 있으면 사용, 없으면(구버전 호환) 단일 필드 사용
  const ranges = plan.ranges || [
    { book: plan.book_name, start: plan.start_chapter, end: plan.end_chapter }
  ];

  if (bibleData) {
    for (const range of ranges) {
      // 책 이름 매핑: 역대상 -> 1ch -> 대상
      // 1. FullName -> Code (역대상 -> 1ch)
      const code = BIBLE_BOOK_CODES[range.book];
      let bookAbbr = '';

      // 2. Code -> ShortName (1ch -> 대상)
      if (code) {
        // BIBLE_BOOK_CODES에서 해당 code를 가진 키 중 가장 짧은 것을 찾음 (단, 원본과 다를 수 있음)
        // 예: '역대상': '1ch', '대상': '1ch' -> '대상' 선택
        const potentialKeys = Object.keys(BIBLE_BOOK_CODES).filter(key => BIBLE_BOOK_CODES[key] === code);
        // 가장 짧은 키 선택 (대부분 약어는 1~2글자)
        bookAbbr = potentialKeys.reduce((a, b) => a.length <= b.length ? a : b);
      } else {
        // 매핑 실패 시 원본 사용 (혹시 json이 풀네임일 수도 있으니)
        bookAbbr = range.book;
      }

      // 책 제목 섹션
      contentHTML += `
                <div class="mb-8 border-b pb-2 mt-4">
                    <h2 class="text-2xl font-bold text-gray-800">${range.book}</h2>
                </div>
            `;

      // 장별 본문
      for (let ch = range.start; ch <= range.end; ch++) {
        contentHTML += `<div class="mb-6">
                    <h3 class="text-xl font-semibold text-purple-700 mb-3">${ch}장</h3>
                    <div class="space-y-2 text-gray-700 leading-relaxed text-lg font-serif">`;

        let verseCount = 0;
        // 절 반복 (1절부터 시작해서 데이터가 없을 때까지)
        for (let v = 1; v <= 200; v++) { // 200절 안전장치
          const key = `${bookAbbr}${ch}:${v}`;
          const text = bibleData[key];

          if (!text) {
            // 첫 절부터 없으면, 혹시 약어가 틀렸나? -> 그래도 없으면 break
            if (v === 1) {
              // console.log(`Missing: ${key}`);
            }
            break;
          }

          // 텍스트 있음
          contentHTML += `
                        <p class="relative pl-6">
                            <span class="absolute left-0 top-1 text-xs text-gray-400 font-sans select-none">${v}</span>
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
    const logs = window.bibleDebugLogs ? window.bibleDebugLogs.join('<br>') : 'No logs';
    contentHTML = `
      <div class="text-center py-20 px-4">
        <div class="text-4xl mb-4">😢</div>
        <p class="text-gray-800 font-bold mb-2">성경 데이터 로드 실패</p>
        <div class="bg-gray-100 text-left text-xs p-4 rounded mb-6 font-mono text-gray-600 overflow-x-auto whitespace-nowrap">
            ${logs}
        </div>
        <p class="text-gray-500 text-sm mb-6">위 로그를 캡처해서 개발자에게 보내주세요.</p>
        <button onclick="window.location.reload()" class="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-purple-700 transition">
          🔄 다시 시도
        </button>
      </div>
    `;
  }

  app.innerHTML = `
        <div class="min-h-screen bg-gray-50">
            <div class="bg-purple-600 text-white p-4 sticky top-0 z-50 flex justify-between items-center shadow-lg">
                <button onclick="showMapScreen()" class="hover:bg-purple-700 p-2 rounded"><i class="fas fa-arrow-left"></i> 목록</button>
                <div class="font-bold truncate px-2 text-sm">${plan.display_text}</div>
                <div class="w-10"></div>
            </div>
            
            <div class="p-4 max-w-3xl mx-auto bg-white min-h-screen shadow-sm">
                ${contentHTML}
                
                <div class="mt-12 mb-20 p-6 bg-purple-50 rounded-xl border border-purple-100 text-center">
                    <p class="text-purple-800 font-bold mb-2">오늘의 말씀을 모두 읽으셨나요?</p>
                    <p class="text-sm text-gray-600 mb-6">완료 버튼을 누르면 진도표에 기록됩니다.</p>
                    <button onclick="completeReading(${dayNumber})" 
                        class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition-transform">
                        ✅ 읽기 완료
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function completeReading(dayNumber) {
  try {
    const res = await apiRequest('completeReading', { userId: currentUser.id, dayNumber });
    if (res.success) {
      alert("축하합니다! 읽기를 완료했습니다.");
      // 로컬 업데이트
      currentUser.total_days_read = Math.max(currentUser.total_days_read, dayNumber);
      localStorage.setItem('harash_user', JSON.stringify(currentUser));
      showMapScreen();
    } else {
      alert(res.message);
    }
  } catch (e) {
    alert("완료 처리 실패: " + e.message);
  }
}

// Init
window.addEventListener('DOMContentLoaded', loadUser);
