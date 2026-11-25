/**
 * 桌面版｜操作紀錄頁籤：一筆一列，新的在前，最下面可以再載入更早的。唯讀。
 * 每一種紀錄怎麼說，在 js/logic/audit.js。
 */

import { asyncButton, badge, clear, el, emptyState, loadFailed, spinner, toastError } from '../ui.js';
import { fmtDateTime } from '../format.js';
import { createAuditPager, describe, keepNote, who } from '../logic/audit.js';

export function createAuditView() {
  const node = el('div', { class: 'view' });
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
      el('div', { class: 'view__head' }, [
        el('h1', {}, '操作紀錄'),
        el('p', {}, '管理員在後台做過的事與每一次登入，最新的在最上面。已經不是管理員的人想動後台、被擋下來的，也會記在這裡。'),
        el('p', { class: 'muted' }, keepNote(pager)),
      ]),
      pager.entries.length ? el('div', { class: 'tablewrap' }, el('table', { class: 'table' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, '時間'), el('th', {}, '誰'), el('th', {}, '做了什麼')])),
        el('tbody', {}, pager.entries.map((entry) => {
          const { title, note } = describe(entry);
          return el('tr', {}, [
            el('td', { class: 'nowrap' }, fmtDateTime(entry.at)),
            el('td', { class: 'nowrap' }, who(entry)),
            el('td', { class: 'table__text' }, [
              entry.result === 'refused' && badge('被拒絕', 'danger'), entry.result === 'refused' && ' ',
              el('strong', {}, title),
              note && el('div', { class: 'muted' }, note),
            ].filter(Boolean)),
          ]);
        })),
      ])) : emptyState('還沒有任何紀錄。'),
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
