// 自動產生（demo-en/tools/build.py），來源是 js/logic/audit.js。不要手改：改 demo-en/tools/translations.py 再重跑。
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

const FIELDS = { role: 'role', status: 'status', email: 'email', exempt: 'exempt', banned: 'blacklist' };

const count = (value) => (Array.isArray(value) ? value.length : value ?? 0);

/** 一筆紀錄的標題與補充說明。認不得的 action 直接顯示代碼。 */
export function describe(entry) {
  const d = entry.detail || {};
  switch (entry.action) {
    case 'login':
      return { title: entry.result === 'refused' ? 'Sign-in refused' : 'Signed in', note: d.reason || '' };
    case 'admin_api':
      return { title: 'No longer an admin — request blocked', note: [d.method, d.route].filter(Boolean).join(' ') };
    case 'logout_all':
      return { title: 'Signed out everywhere', note: `${count(d.sessions)} sign-ins ended` };
    case 'rules.edit':
      return { title: 'Edited the rules', note: '' };
    case 'extra_rules.edit':
      return { title: 'Edited the extra guidelines', note: '' };
    case 'message.edit':
      return { title: `Edited the message “${d.name || entry.target_id}”`, note: '' };
    case 'cleanup.save':
      return { title: 'Saved the removal list', note: `${count(d.kick_ids)} to remove, ${count(d.spare_ids)} kept` };
    case 'member.edit':
      return {
        title: `Edited member “${d.name || entry.target_id}”`,
        note: Object.keys(d.changes || {}).map((key) => FIELDS[key] || key).join(', '),
      };
    case 'member.merge':
      return { title: `Merged members into “${d.name || entry.target_id}”`, note: (d.names_before || []).join(' + ') };
    case 'member.mark_left':
      return { title: 'Marked as left', note: `${count(d.ids)} people` };
    case 'members.refresh':
      return { title: 'Synced from LINE', note: `${count(d.checked)} people checked` };
    case 'records.prune':
      return { title: 'Cleared old activity records', note: `${count(d.removed)} records` };
    case 'unknown.assign':
      return { title: 'Identified an unknown sender', note: '' };
    case 'unknown.unassign':
      return { title: 'Undid an identification', note: '' };
    default:
      return { title: entry.action, note: '' };
  }
}

export const who = (entry) => entry.actor_email || '(unknown)';

export function keepNote(pager) {
  return `Only the last ${pager.keepDays ?? 180} days are kept; older entries are deleted automatically. This page is read-only.`;
}
