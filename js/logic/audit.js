/**
 * 操作紀錄：管理員在後台做過的事、登入，以及被擋下來的後台操作。唯讀。兩種版面共用。
 *
 * 後端 GET /api/audit 一次給一頁，新的在前；next 是下一頁要帶的 before，沒有下一頁就是
 * null。每一種 action 的意思與 detail 的內容見後端 db/audit.py。
 */

import { api } from '../api.js';

/** 一頁一頁往下載。entries 是目前載到的全部，新的在前。 */
export function createAuditPager() {
  const pager = { entries: [], next: null, keepDays: null, started: false };
  pager.load = async ({ more = false } = {}) => {
    const data = await api.get('/api/audit', { before: more ? pager.next : null });
    pager.entries = more ? [...pager.entries, ...data.entries] : data.entries;
    pager.next = data.next;
    pager.keepDays = data.keep_days;
    pager.started = true;
  };
  return pager;
}

const FIELDS = { role: '身分', status: '狀態', email: 'email', exempt: '不列入整理', banned: '黑名單' };

const count = (value) => (Array.isArray(value) ? value.length : value ?? 0);

/** 一筆紀錄的標題與補充說明。認不得的 action 直接顯示代碼。 */
export function describe(entry) {
  const d = entry.detail || {};
  switch (entry.action) {
    case 'login':
      return { title: entry.result === 'refused' ? '登入被拒絕' : '登入', note: d.reason || '' };
    case 'admin_api':
      return { title: '已經不是管理員，後台操作被擋下', note: [d.method, d.route].filter(Boolean).join(' ') };
    case 'logout_all':
      return { title: '登出所有裝置', note: `作廢 ${count(d.sessions)} 張登入憑證` };
    case 'rules.edit':
      return { title: '改版規', note: '' };
    case 'extra_rules.edit':
      return { title: '改群組額外規範', note: '' };
    case 'message.edit':
      return { title: `改訊息「${d.name || entry.target_id}」`, note: '' };
    case 'cleanup.save':
      return { title: '儲存待移除名單', note: `移除 ${count(d.kick_ids)} 人、保留 ${count(d.spare_ids)} 人` };
    case 'member.edit':
      return {
        title: `改成員「${d.name || entry.target_id}」`,
        note: Object.keys(d.changes || {}).map((key) => FIELDS[key] || key).join('、'),
      };
    case 'member.merge':
      return { title: `合併成員「${d.name || entry.target_id}」`, note: (d.names_before || []).join(' + ') };
    case 'member.mark_left':
      return { title: '標成已離開', note: `${count(d.ids)} 人` };
    case 'members.refresh':
      return { title: '讀取成員資料', note: `確認了 ${count(d.checked)} 人` };
    case 'records.prune':
      return { title: '清除舊的發話紀錄', note: `${count(d.removed)} 筆` };
    case 'unknown.assign':
      return { title: '指認未知發話', note: '' };
    case 'unknown.unassign':
      return { title: '取消指認', note: '' };
    default:
      return { title: entry.action, note: '' };
  }
}

export const who = (entry) => entry.actor_email || '（不明）';

export function keepNote(pager) {
  return `只留最近 ${pager.keepDays ?? 180} 天，更早的會自動清掉。這裡只能看，不能改。`;
}
