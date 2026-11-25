// 自動產生（demo-en/tools/build.py），來源是 js/desktop/audit.js。不要手改：改 demo-en/tools/translations.py 再重跑。
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
        el('h1', {}, 'Activity Log'),
        el('p', {}, 'What admins did in the dashboard and every sign-in, newest first. Requests from people who are no longer admins are blocked and recorded here too.'),
        el('p', { class: 'muted' }, keepNote(pager)),
      ]),
      pager.entries.length ? el('div', { class: 'tablewrap' }, el('table', { class: 'table' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'Time'), el('th', {}, 'Who'), el('th', {}, 'What')])),
        el('tbody', {}, pager.entries.map((entry) => {
          const { title, note } = describe(entry);
          return el('tr', {}, [
            el('td', { class: 'nowrap' }, fmtDateTime(entry.at)),
            el('td', { class: 'nowrap' }, who(entry)),
            el('td', { class: 'table__text' }, [
              entry.result === 'refused' && badge('Refused', 'danger'), entry.result === 'refused' && ' ',
              el('strong', {}, title),
              note && el('div', { class: 'muted' }, note),
            ].filter(Boolean)),
          ]);
        })),
      ])) : emptyState('Nothing has been recorded yet.'),
      pager.next !== null && el('div', { class: 'more' }, asyncButton('Load older entries', async () => {
        try {
          await pager.load({ more: true });
          render();
        } catch (err) {
          toastError(err, 'Could not load');
        }
      }, { class: 'btn' })),
    ].filter(Boolean));
  }

  load();
  return { node, reload: load };
}
