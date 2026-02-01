/**
 * 하라쉬 성경읽기 - API 설정
 * Google Apps Script 백엔드 연결
 */

// ✅ Google Apps Script 백엔드 URL (Updated 2026-01-31 - New Deployment)
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyCS_P9eLa7PDcHkXdwC2aIhq7uHijsIZ8bHwglS-B_vrKGfjuOZ2uWH7Q_jv7me-C0/exec';

/**
 * Google Apps Script API 호출 헬퍼
 */
async function callGasApi(action, params = {}) {
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                ...params
            }),
            mode: 'cors',
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    } catch (error) {
        console.error(`API Error [${action}]:`, error);
        throw error;
    }
}

// 전역으로 export
window.callGasApi = callGasApi;
window.GAS_API_URL = GAS_API_URL;
