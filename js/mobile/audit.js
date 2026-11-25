/**
 * 行動版｜操作紀錄頁籤：一筆一張卡片，新的在前，最下面可以再載入更早的。唯讀。
 * 每一種紀錄怎麼說，在 js/logic/audit.js。
 */

import { asyncButton, badge, clear, el, emptyState, loadFailed, spinner, toastError } from '../ui.js';
import { fmtDateTime } from '../format.js';
import { createAuditPager, describe, keepNote, who } from '../logic/audit.js';

export function createAuditView() {
  const node = el('div', { class: 'mview' });
  const pager = createAuditPager();

  async function load() {
    clear(node).append(spinner());
    try {
      await pager.load();
      render();
    } catch (err) {
      clear(node).append(loadFailed(err.message, load));
    }
  }

  function render() {
    clear(node).append(...[
      el('div', { class: 'mview__head' }, [
        el('h1', {}, '操作紀錄'),
        el('p', {}, '管理員在後台做過的事與每一次登入，最新的在最上面。'),
        el('p', { class: 'muted' }, keepNote(pager)),
      ]),
      pager.entries.length ? el('div', { class: 'mcards' }, pager.entries.map((entry) => {
        const { title, note } = describe(entry);
        return el('div', { class: 'ucard' }, [
          el('div', { class: 'ucard__time' }, `${fmtDateTime(entry.at)}・${who(entry)}`),
          el('div', { class: 'ucard__text' }, [
            entry.result === 'refused' && badge('被拒絕', 'danger'), entry.result === 'refused' && ' ',
            el('strong', {}, title),
          ].filter(Boolean)),
          note && el('div', { class: 'muted' }, note),
        ].filter(Boolean));
      })) : emptyState('還沒有任何紀錄。'),
      pager.next !== null && el('div', { class: 'more' }, asyncButton('載入更早的紀錄', async () => {
        try {
          await pager.load({ more: true });
          render();
        } catch (err) {
          toastError(err, '載入失敗');
        }
      }, { class: 'btn' })),
    ].filter(Boolean));
  }

  load();
  return { node, reload: load };
}
