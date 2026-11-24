// 示範版一開頭要先執行的設定。寫成獨立的檔案而不是 index.html 裡的 <script>，是因為 CSP
// 不放行頁面裡的程式。index.html 用一般的 <script src> 載入它（不是 async、defer），所以它一定
// 在任何模組之前跑完。
// ★ 這一頁跟正式版同一個來源（group-judge.github.io），localStorage 是共用的。
//   所有 key 加上「demo:」，示範版讀不到正式版的管理員登入憑證，切換裝置、
//   排序之類的偏好也不會影響正式版。這一段一定要在任何模組之前執行。
(() => {
  const PREFIX = 'demo:';
  const S = Storage.prototype;
  const { getItem, setItem, removeItem } = S;
  S.getItem = function (key) { return getItem.call(this, PREFIX + key); };
  S.setItem = function (key, value) { return setItem.call(this, PREFIX + key, value); };
  S.removeItem = function (key) { return removeItem.call(this, PREFIX + key); };
})();
window.__GOOGLE_CLIENT_ID__ = '751584304633-jih4ib0f4ikauc3qlh1o5vkgrit2kr1d.apps.googleusercontent.com';
