// 正式站的設定。寫成獨立的檔案而不是 index.html 裡的 <script>，是因為 CSP 不放行頁面裡的程式。
// 部署時填入。本機開發不必改：在 localhost 開這一頁時，後端預設是
// http://localhost:5002（見 js/api.js），也可以用網址參數覆寫（只在 localhost 有效）：
//   ?apiBase=http://localhost:5002&googleClientId=xxx
window.__GROUP_JUDGE_API_HOST__ = 'https://group-judge-backend.onrender.com';
window.__GOOGLE_CLIENT_ID__ = '751584304633-jih4ib0f4ikauc3qlh1o5vkgrit2kr1d.apps.googleusercontent.com';
