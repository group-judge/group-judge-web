// 自動產生（demo-en/tools/build.py），來源是 js/main.js。不要手改：改 demo-en/tools/translations.py 再重跑。
/**
 * 進入點：確認登入 → 判斷裝置 → 載入對應的那一套畫面。
 *
 * 沒登入的時候整頁只有一顆登入按鈕。登入而且是管理員，
 * 才會去載入 js/desktop/ 或 js/mobile/ 底下的東西——兩套畫面各自獨立，
 * 沒用到的那一套連程式都不會下載。
 *
 *   js/api.js、auth.js、ui.js、widgets.js、format.js、logic/   兩種版面共用
 *   js/desktop/ + css/desktop.css                              桌面版
 *   js/mobile/  + css/mobile.css                               行動版
 */

import { ApiError, setAuthHandlers } from './api.js';
import {
  NotPermitted, adoptDevSession, forgetLogin, logout, logoutEverywhere, renderGoogleButton, restore,
} from './auth.js';
import { detectDevice, switchDevice } from './device.js';
import { clear, confirmDialog, el, loadFailed, openModal, spinner, toast, toastError } from './ui.js';

const app = document.getElementById('app');
const NO_PERMISSION = 'This account is not allowed to use the dashboard';

/** 目前掛著的外殼的卸載函式。在登入畫面時是 null。 */
let unmountShell = null;

function brandMark() {
  return el('span', { class: 'brand__mark', 'aria-hidden': 'true' }, 'J');
}

// ── 登入畫面 ──────────────────────────────────────────────

function showLogin() {
  unmountShell?.();
  unmountShell = null;
  delete document.documentElement.dataset.device;

  const slot = el('div', { class: 'login__button' });
  clear(app).append(el('main', { class: 'login' }, el('div', { class: 'login__card' }, [
    el('div', { class: 'login__brand' }, [brandMark(), el('span', {}, 'Group Judge')]),
    el('div', { class: 'login__hint' }, 'Group cleanup dashboard'),
    slot,
  ])));
  renderGoogleButton(slot, { onSuccess: showApp, onError: loginFailed });
}

function loginFailed(err) {
  if (err instanceof NotPermitted) toast(NO_PERMISSION, { error: true });
  else toastError(err, 'Sign-in failed');
}

// ── 登入之後 ──────────────────────────────────────────────

function loadStylesheet(href) {
  return new Promise((resolve) => {
    const existing = document.getElementById('device-css');
    if (existing?.getAttribute('href') === href) {
      resolve();
      return;
    }
    existing?.remove();
    const link = el('link', { id: 'device-css', rel: 'stylesheet', href });
    // 載入失敗也照樣往下走：沒有樣式的畫面還看得出哪裡壞了，白畫面看不出來。
    link.addEventListener('load', resolve);
    link.addEventListener('error', resolve);
    document.head.append(link);
  });
}

/**
 * 樣式檔的網址帶上版本，檔案一改瀏覽器就會重抓（不然更新之後最多會舊 10 分鐘）。
 * 版本由 tools/stamp.py 寫在 index.html 的 #asset-versions；沒有就用原本的網址。js 的部分
 * 靠 index.html 的 import map，不必在這裡處理。
 *
 * #asset-versions 是 type="application/json" 的資料，不是程式：CSP 不放行頁面裡的程式，
 * 資料不受影響。
 */
const ASSET_VERSIONS = (() => {
  try {
    return JSON.parse(document.getElementById('asset-versions')?.textContent || '{}');
  } catch {
    return {};
  }
})();

function versioned(path) {
  const version = ASSET_VERSIONS[path];
  return version ? `${path}?v=${version}` : path;
}

async function showApp(user) {
  kickingOut = false;
  const device = detectDevice();
  clear(app).append(spinner());
  try {
    const [shell] = await Promise.all([
      import(`./${device}/shell.js`),
      loadStylesheet(versioned(`css/${device}.css`)),
    ]);
    document.documentElement.dataset.device = device;
    unmountShell?.();
    unmountShell = shell.mount(clear(app), {
      user,
      brandMark,
      onLogout: async () => {
        await logout();
        showLogin();
      },
      onLogoutAll: logOutEverywhere,
      onSwitchDevice: () => switchDevice(device === 'mobile' ? 'desktop' : 'mobile'),
    });
  } catch (err) {
    clear(app).append(loadFailed(err?.message || 'Could not load the page', () => showApp(user)));
  }
}

// 「登出所有裝置」正在跟後端講的時候是 true。放在這裡而不是畫面上：選單可以再打開，
// 網路慢的時候第二次按下去，會帶著已經作廢的憑證再送一次，回來的 401 會蓋掉剛才那句
// 「已經登出所有裝置」，變成「登入已經失效」。
let loggingOutEverywhere = false;

/** 選單裡的「登出所有裝置」：先講清楚會發生什麼，確定了才做。 */
async function logOutEverywhere() {
  if (loggingOutEverywhere) return;
  const ok = await confirmDialog({
    title: 'Sign out everywhere',
    body: 'This signs you out on every computer and phone, including this one. Use it if you think someone else is using your sign-in.',
    confirmText: 'Sign out everywhere',
    cancelText: 'Cancel',
    danger: true,
  });
  if (!ok || loggingOutEverywhere) return;
  loggingOutEverywhere = true;
  try {
    await logoutEverywhere();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // 這一台的登入已經失效，後端認不出是誰，別台的也就收不掉：請他登入之後再按一次。
      forgetLogin();
      toast('Your sign-in has already expired. Sign in again, then choose “Sign out everywhere” once more.', { error: true, duration: 8000 });
      showLogin();
    } else {
      toast(`Could not sign out everywhere (${err?.message || 'please try again later'}). You are still signed in on your other devices.`,
        { error: true, duration: 8000 });
    }
    return;
  } finally {
    loggingOutEverywhere = false;
  }
  toast('Signed out on every device');
  showLogin();
}

// ── 用到一半憑證失效 ──────────────────────────────────────

/**
 * API 回 401：請使用者當場重新登入，畫面留在原地。登入成功回傳 true，
 * api.js 會把剛才失敗的請求重送一次。
 */
function reauthenticate() {
  const { done } = openModal((close) => {
    const slot = el('div', { class: 'login__button' });
    renderGoogleButton(slot, {
      onSuccess: () => close(true),
      onError: (err) => {
        loginFailed(err);
        if (err instanceof NotPermitted) close(false);
      },
    });
    return el('div', {}, [
      el('div', { class: 'modal__body' }, [
        el('p', {}, 'Your sign-in has expired. Please sign in again — anything unsaved is still here, and the action you just took finishes once you sign in.'),
        slot,
      ]),
      el('div', { class: 'modal__actions' },
        el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => close(false) }, 'Back to sign-in')),
    ]);
  }, { title: 'Please sign in again', dismissible: false });

  return done.then((ok) => {
    if (ok !== true) showLogin();
    return ok === true;
  });
}

// 好幾個請求同時收到 403 時，只處理第一個。下次成功進到後台時（showApp）才重設。
let kickingOut = false;

/** API 回 403：這個帳號已經不是管理員了。講一聲，清掉登入資訊，回登入頁。 */
function forbidden() {
  if (kickingOut) return;
  kickingOut = true;
  toast(NO_PERMISSION, { error: true });
  forgetLogin();
  showLogin();
}

// ── 啟動 ──────────────────────────────────────────────────

async function start() {
  setAuthHandlers({
    reauthenticate,
    forbidden,
    databaseDown: (message) => toast(message || 'The database is not responding right now. Please try again later.', { error: true, duration: 8000 }),
  });
  adoptDevSession();
  clear(app).append(spinner());

  let user = null;
  try {
    user = await restore();
  } catch (err) {
    if (err instanceof NotPermitted) {
      toast(NO_PERMISSION, { error: true });
    } else {
      // 連不上後端。不要當成沒登入——那會讓人白白重登一次，而且一樣連不上。
      clear(app).append(loadFailed(err?.message || 'Cannot reach the server', start));
      return;
    }
  }
  if (user) await showApp(user);
  else showLogin();
}

// 啟動過程任何沒料到的錯誤都要顯示出來。少了這一段，畫面會永遠停在轉圈圈，
// 而錯誤只躺在主控台裡——使用者那邊什麼都看不出來。
start().catch((err) => {
  console.error(err);
  clear(app).append(loadFailed(err?.message || 'Failed to start', () => window.location.reload()));
});
