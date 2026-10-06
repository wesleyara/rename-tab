'use strict';

const RT = window.RenameTab;
const KEY = RT.STORAGE_KEY;
const params = new URLSearchParams(location.search);
const isPage = params.has('page');

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="m19 6-.8 13.1a2 2 0 0 1-2 1.9H7.8a2 2 0 0 1-2-1.9L5 6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  upload: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  page: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  token: '<path d="m8 6-6 6 6 6M16 6l6 6-6 6"/>',
};

const EMPTY_ART = `
<svg viewBox="0 0 112 72" fill="none" aria-hidden="true">
  <rect x="6" y="18" width="100" height="50" rx="8" fill="var(--surface-2)" stroke="var(--border-strong)"/>
  <path d="M6 30h100" stroke="var(--border-strong)"/>
  <path d="M14 30V14a6 6 0 0 1 6-6h38a6 6 0 0 1 6 6v16" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.5"/>
  <rect x="21" y="15" width="7" height="7" rx="2" fill="var(--accent)"/>
  <rect x="32" y="16.5" width="22" height="4" rx="2" fill="var(--accent)" opacity=".35"/>
  <path d="M58 13v10" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="18" y="40" width="44" height="5" rx="2.5" fill="var(--border-strong)"/>
  <rect x="18" y="51" width="70" height="5" rx="2.5" fill="var(--border)"/>
</svg>`;

const state = {
  rules: [],
  view: 'list', // list | form | import
  draft: null,
  editingId: null,
  query: '',
  confirmId: null,
  confirmDeleteInForm: false,
  tab: null,
  originalTitle: '',
};

const $view = document.getElementById('view');
const $toast = document.getElementById('toast');
const $menu = document.getElementById('menu');
const $menuBtn = document.getElementById('menuBtn');
const $fileInput = document.getElementById('fileInput');

/* ---------- helpers ---------- */

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' || k === 'checked') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

function icon(name) {
  return h('span', { class: 'ico', html: `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>` });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

let toastTimer;
function toast(message, type = 'success') {
  $toast.replaceChildren(icon(type === 'error' ? 'alert' : 'check'), h('span', null, message));
  $toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($toast.className = 'toast'), 2200);
}

async function saveRules(rules) {
  state.rules = rules;
  await chrome.storage.local.set({ [KEY]: rules });
}

function currentTarget() {
  return state.tab ? RT.urlTarget(state.tab.url) : null;
}

function pageSuggestions() {
  const target = currentTarget();
  if (!target) return null;
  const u = new URL(state.tab.url);
  const path = u.pathname.replace(/\/+$/, '');
  return { page: u.host + path, domain: u.host || null };
}

function activeRule() {
  return state.tab ? RT.findRule(state.rules, state.tab.url) : null;
}

function sortedRules() {
  return [...state.rules].sort((a, b) => {
    const pa = RT.normalizePattern(a.pattern).replace(/^\*\.?/, '');
    const pb = RT.normalizePattern(b.pattern).replace(/^\*\.?/, '');
    return pa.localeCompare(pb, undefined, { sensitivity: 'base' });
  });
}

function titleParts(template) {
  const parts = String(template).split(/(\{title\})/i);
  return parts.filter(Boolean).map((p) => (/^\{title\}$/i.test(p) ? h('span', { class: 'token' }, '{title}') : h('span', null, p)));
}

function kindBadges(rule) {
  const general = RT.isGeneral(rule.pattern);
  return [
    h('span', { class: `badge ${general ? 'general' : ''}` }, icon(general ? 'globe' : 'route'), general ? 'Domínio' : 'Rota'),
    rule.exact ? h('span', { class: 'badge' }, icon('target'), 'Exata') : null,
  ];
}

/* ---------- render ---------- */

function render(direction) {
  const inner =
    state.view === 'form' ? renderForm() : state.view === 'import' ? renderImport() : renderList();
  inner.classList.add('view-inner');
  if (direction === 'right') inner.classList.add('from-right');
  $view.replaceChildren(inner);
}

function renderCurrent() {
  const target = currentTarget();
  const rule = activeRule();
  const fav = state.tab?.favIconUrl
    ? h('img', { src: state.tab.favIconUrl, alt: '', onerror: (e) => e.target.replaceWith(icon('page')) })
    : icon('page');

  if (!target) {
    return h(
      'section',
      { class: 'current' },
      h('div', { class: 'eyebrow' }, 'Página atual'),
      h(
        'div',
        { class: 'current-head' },
        h('div', { class: 'favicon' }, icon('lock')),
        h('div', { class: 'current-text' }, h('div', { class: 'current-title' }, 'Página do navegador')),
      ),
      h('div', { class: 'muted-note' }, 'Páginas internas do navegador não podem ser renomeadas.'),
    );
  }

  const shownTitle = rule ? RT.renderTitle(rule.title, state.originalTitle) : state.originalTitle || state.tab.title;

  return h(
    'section',
    { class: `current ${rule ? 'is-on' : ''}` },
    h('div', { class: 'eyebrow' }, 'Página atual'),
    h(
      'div',
      { class: 'current-head' },
      h('div', { class: 'favicon' }, fav),
      h(
        'div',
        { class: 'current-text' },
        h('div', { class: 'current-title', title: shownTitle }, shownTitle || 'Sem título'),
        h('div', { class: 'current-url', title: target }, target.replace(/\/$/, '')),
      ),
    ),
    h(
      'div',
      { class: 'current-foot' },
      rule
        ? h('span', { class: 'status' }, h('span', { class: 'dot on' }), 'Regra', h('code', null, RT.normalizePattern(rule.pattern)))
        : h('span', { class: 'status' }, h('span', { class: 'dot' }), 'Nenhuma regra aplicada'),
      rule
        ? h('button', { class: 'btn btn-sm', type: 'button', onclick: () => openForm(rule) }, icon('edit'), 'Editar')
        : h(
            'button',
            { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => openForm(null, { pattern: pageSuggestions().page }) },
            icon('plus'),
            'Renomear esta página',
          ),
    ),
  );
}

function renderRule(rule, activeId) {
  const enabled = rule.enabled !== false;
  const pattern = RT.normalizePattern(rule.pattern);

  if (state.confirmId === rule.id) {
    return h(
      'div',
      { class: 'rule is-confirming' },
      h(
        'div',
        { class: 'rule-confirm' },
        h('p', null, 'Excluir ', h('strong', null, pattern), '?'),
        h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { state.confirmId = null; render(); } }, 'Cancelar'),
          h('button', { class: 'btn btn-danger btn-sm', type: 'button', autofocus: true, onclick: () => deleteRule(rule.id) }, 'Excluir'),
        ),
      ),
    );
  }

  return h(
    'div',
    { class: `rule ${enabled ? '' : 'is-off'} ${activeId === rule.id ? 'is-active' : ''}` },
    h(
      'label',
      { class: 'switch', title: enabled ? 'Desativar regra' : 'Ativar regra' },
      h('input', { type: 'checkbox', checked: enabled, 'aria-label': 'Ativar regra', onchange: (e) => toggleRule(rule.id, e.target.checked) }),
      h('span', { class: 'switch-track' }),
    ),
    h(
      'button',
      { class: 'rule-main', type: 'button', title: 'Editar regra', onclick: () => openForm(rule) },
      h('div', { class: 'rule-title' }, titleParts(rule.title)),
      h('div', { class: 'rule-meta' }, h('code', { class: 'rule-pattern', title: pattern }, pattern), kindBadges(rule)),
    ),
    h(
      'div',
      { class: 'rule-actions' },
      h('button', { class: 'icon-btn', type: 'button', title: 'Editar', onclick: () => openForm(rule) }, icon('edit')),
      h('button', { class: 'icon-btn danger', type: 'button', title: 'Excluir', onclick: () => { state.confirmId = rule.id; render(); } }, icon('trash')),
    ),
  );
}

function renderList() {
  const active = activeRule();
  const q = state.query.trim().toLowerCase();
  const rules = sortedRules().filter(
    (r) => !q || r.title.toLowerCase().includes(q) || RT.normalizePattern(r.pattern).toLowerCase().includes(q),
  );

  let body;
  if (!state.rules.length) {
    body = h(
      'div',
      { class: 'empty' },
      h('div', { class: 'empty-art', html: EMPTY_ART }),
      h('h3', null, 'Nenhuma regra ainda'),
      h('p', null, 'Defina um título para um domínio inteiro ou para uma rota específica.'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openForm() }, icon('plus'), 'Criar primeira regra'),
    );
  } else if (!rules.length) {
    body = h('div', { class: 'empty' }, h('h3', null, 'Nada encontrado'), h('p', null, `Nenhuma regra corresponde a “${state.query}”.`));
  } else {
    body = h('div', { class: 'rules' }, rules.map((r) => renderRule(r, active?.id)));
  }

  return h(
    'div',
    null,
    isPage ? null : renderCurrent(),
    h(
      'div',
      { class: 'section-head' },
      h('div', { class: 'section-title' }, 'Regras', h('span', { class: 'count' }, state.rules.length)),
      state.rules.length
        ? h('button', { class: 'btn btn-sm', type: 'button', onclick: () => openForm() }, icon('plus'), 'Nova regra')
        : null,
    ),
    state.rules.length >= 4
      ? h(
          'div',
          { class: 'search' },
          icon('search'),
          h('input', {
            class: 'input',
            type: 'search',
            placeholder: 'Buscar por título ou rota…',
            value: state.query,
            oninput: (e) => {
              state.query = e.target.value;
              const pos = e.target.selectionStart;
              render();
              const input = $view.querySelector('.search input');
              input.focus();
              input.setSelectionRange(pos, pos);
            },
          }),
        )
      : null,
    body,
  );
}

function renderForm() {
  const d = state.draft;
  const editing = !!state.editingId;
  const sugg = pageSuggestions();

  const patternInput = h('input', {
    class: 'input mono',
    id: 'f-pattern',
    placeholder: 'localhost:3333/teste',
    autocomplete: 'off',
    spellcheck: 'false',
    value: d.pattern,
    oninput: (e) => { d.pattern = e.target.value; e.target.classList.remove('invalid'); updateDerived(); },
  });

  const titleInput = h('input', {
    class: 'input',
    id: 'f-title',
    placeholder: 'Ex.: API Local · Dev',
    autocomplete: 'off',
    value: d.title,
    oninput: (e) => { d.title = e.target.value; e.target.classList.remove('invalid'); updateDerived(); },
  });

  const setPattern = (value) => {
    d.pattern = value;
    patternInput.value = value;
    patternInput.classList.remove('invalid');
    patternInput.focus();
    updateDerived();
  };

  const insertToken = () => {
    const start = titleInput.selectionStart ?? titleInput.value.length;
    const end = titleInput.selectionEnd ?? start;
    titleInput.setRangeText('{title}', start, end, 'end');
    d.title = titleInput.value;
    titleInput.focus();
    updateDerived();
  };

  const deleteBtn = editing
    ? h(
        'button',
        {
          class: 'btn btn-danger-ghost btn-sm',
          type: 'button',
          id: 'f-delete',
          onclick: () => {
            if (state.confirmDeleteInForm) return deleteRule(state.editingId);
            state.confirmDeleteInForm = true;
            const btn = document.getElementById('f-delete');
            btn.className = 'btn btn-danger btn-sm';
            btn.lastChild.textContent = 'Confirmar exclusão';
          },
        },
        icon('trash'),
        h('span', null, 'Excluir'),
      )
    : null;

  return h(
    'form',
    { class: 'form-layout', novalidate: true, onsubmit: (e) => { e.preventDefault(); submitForm(); } },
    h(
      'div',
      { class: 'form-head is-fixed' },
      h('button', { class: 'icon-btn', type: 'button', title: 'Voltar (Esc)', onclick: closeForm }, icon('back')),
      h('h2', null, editing ? 'Editar regra' : 'Nova regra'),
    ),

    h(
      'div',
      {
        class: 'form-scroll',
        onscroll: (e) => e.target.parentElement.classList.toggle('is-scrolled', e.target.scrollTop > 0),
      },
      h(
        'div',
        { class: 'field' },
        h('label', { class: 'label', for: 'f-pattern' }, 'Rota', h('small', null, 'domínio ou caminho')),
        patternInput,
        sugg
          ? h(
              'div',
              { class: 'chips' },
              h('button', { class: 'chip', type: 'button', onclick: () => setPattern(sugg.page) }, icon('route'), 'Esta página'),
              sugg.domain && sugg.domain !== sugg.page
                ? h('button', { class: 'chip', type: 'button', onclick: () => setPattern(sugg.domain) }, icon('globe'), 'Este domínio')
                : null,
            )
          : null,
        h('div', { class: 'hint' }, 'Sem caminho vale para o domínio todo. Use ', h('code', null, '*'), ' como curinga.'),
        h('div', { class: 'error', id: 'f-pattern-error', hidden: true }),
      ),

      h(
        'div',
        { class: 'field' },
        h('label', { class: 'label', for: 'f-title' }, 'Título da aba'),
        titleInput,
        h(
          'div',
          { class: 'chips' },
          h('button', { class: 'chip', type: 'button', onclick: insertToken }, icon('token'), 'Inserir {title}'),
        ),
        h('div', { class: 'hint' }, h('code', null, '{title}'), ' é trocado pelo título original da página.'),
      ),

      h(
        'label',
        { class: 'toggle-row' },
        h(
          'div',
          null,
          h('strong', null, 'Incluir sub-rotas'),
          h('span', { class: 'desc', id: 'f-sub-desc' }),
        ),
        h(
          'span',
          { class: 'switch' },
          h('input', { type: 'checkbox', checked: !d.exact, onchange: (e) => { d.exact = !e.target.checked; updateDerived(); } }),
          h('span', { class: 'switch-track' }),
        ),
      ),

      h('div', { class: 'eyebrow', style: 'margin-bottom:7px' }, 'Pré-visualização'),
      h(
        'div',
        { class: 'preview' },
        h(
          'div',
          { class: 'preview-strip' },
          h('div', { class: 'preview-dots' }, h('i'), h('i'), h('i')),
          h(
            'div',
            { class: 'preview-tab' },
            h('span', { class: 'fav' }, state.tab?.favIconUrl ? h('img', { src: state.tab.favIconUrl, alt: '', onerror: (e) => e.target.remove() }) : null),
            h('span', { class: 'preview-title', id: 'f-preview-title' }),
            h('span', { class: 'x' }, '×'),
          ),
        ),
        h('div', { class: 'preview-bar' }, h('div', { class: 'preview-url' }, icon('lock'), h('span', { id: 'f-preview-url' }))),
      ),
      h('div', { class: 'match', id: 'f-match' }),
    ),

    h(
      'div',
      { class: 'form-foot' },
      deleteBtn,
      h(
        'div',
        { class: 'right' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: closeForm }, 'Cancelar'),
        h('button', { class: 'btn btn-primary', type: 'submit' }, icon('check'), editing ? 'Salvar' : 'Criar regra'),
      ),
    ),
  );
}

function updateDerived() {
  const d = state.draft;
  const pattern = RT.normalizePattern(d.pattern);
  const target = currentTarget();
  const draftMatches = !!pattern && !!target && RT.matches(d, state.tab.url);

  const sample = draftMatches ? state.originalTitle : 'Título original';
  const $title = document.getElementById('f-preview-title');
  const rendered = d.title.trim() ? RT.renderTitle(d.title, sample) : '';
  $title.textContent = rendered || 'Digite um título…';
  $title.classList.toggle('placeholder', !rendered);

  document.getElementById('f-preview-url').textContent = pattern || 'localhost:3333/teste';

  const desc = document.getElementById('f-sub-desc');
  const base = pattern || 'localhost:3333/teste';
  desc.textContent = d.exact
    ? `Somente ${base} exatamente`
    : RT.isGeneral(base)
      ? `Todas as rotas de ${base}`
      : `${base} e ${base}/…`;

  const $match = document.getElementById('f-match');
  if (!target || !pattern) {
    $match.replaceChildren();
    $match.className = 'match';
  } else if (!draftMatches) {
    $match.className = 'match';
    $match.replaceChildren(icon('info'), 'Não se aplica à página atual');
  } else {
    const others = state.rules.filter((r) => r.id !== state.editingId);
    const winner = RT.findRule([...others, { ...d, id: '__draft', enabled: true }], state.tab.url);
    if (winner && winner.id !== '__draft') {
      $match.className = 'match warn';
      $match.replaceChildren(icon('alert'), `Uma regra mais específica (${RT.normalizePattern(winner.pattern)}) tem prioridade aqui`);
    } else {
      $match.className = 'match ok';
      $match.replaceChildren(icon('check'), 'Aplica-se à página atual');
    }
  }
}

function renderImport() {
  const zone = h(
    'div',
    { class: 'dropzone' },
    h('div', { class: 'big-ico' }, icon('upload')),
    h('strong', null, 'Importar regras'),
    h('div', null, 'Arraste um arquivo .json aqui ou'),
    h('button', { class: 'btn btn-primary', type: 'button', onclick: () => $fileInput.click() }, 'Escolher arquivo'),
    h('div', { class: 'hint' }, 'Regras com a mesma rota serão atualizadas.'),
  );
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (file) importFile(file);
  });

  return h(
    'div',
    null,
    h(
      'div',
      { class: 'form-head' },
      h('button', { class: 'icon-btn', type: 'button', title: 'Voltar', onclick: () => { state.view = 'list'; render(); } }, icon('back')),
      h('h2', null, 'Importar'),
    ),
    zone,
  );
}

/* ---------- actions ---------- */

function openForm(rule, preset = {}) {
  state.editingId = rule?.id || null;
  state.confirmId = null;
  state.confirmDeleteInForm = false;
  state.draft = rule
    ? { pattern: RT.normalizePattern(rule.pattern), title: rule.title, exact: !!rule.exact }
    : { pattern: preset.pattern || '', title: '', exact: false };
  state.view = 'form';
  render('right');
  updateDerived();
  const focusId = state.draft.pattern ? 'f-title' : 'f-pattern';
  document.getElementById(focusId).focus();
}

function closeForm() {
  state.view = 'list';
  state.draft = null;
  state.editingId = null;
  render();
}

async function submitForm() {
  const d = state.draft;
  const pattern = RT.normalizePattern(d.pattern);
  const title = d.title.trim();
  const $err = document.getElementById('f-pattern-error');
  $err.hidden = true;

  if (!pattern) {
    document.getElementById('f-pattern').classList.add('invalid');
    document.getElementById('f-pattern').focus();
    return;
  }
  if (!title) {
    document.getElementById('f-title').classList.add('invalid');
    document.getElementById('f-title').focus();
    return;
  }
  const key = RT.ruleKey({ pattern, exact: d.exact });
  const dup = state.rules.find((r) => r.id !== state.editingId && RT.ruleKey(r) === key);
  if (dup) {
    $err.textContent = `Já existe uma regra para esta rota (“${dup.title}”).`;
    $err.hidden = false;
    document.getElementById('f-pattern').classList.add('invalid');
    return;
  }

  const now = Date.now();
  let rules;
  if (state.editingId) {
    rules = state.rules.map((r) =>
      r.id === state.editingId ? { ...r, pattern, title, exact: !!d.exact, updatedAt: now } : r,
    );
  } else {
    rules = [...state.rules, { id: uid(), pattern, title, exact: !!d.exact, enabled: true, createdAt: now, updatedAt: now }];
  }
  const wasEditing = !!state.editingId;
  await saveRules(rules);
  closeForm();
  toast(wasEditing ? 'Regra atualizada' : 'Regra criada');
}

async function deleteRule(id) {
  await saveRules(state.rules.filter((r) => r.id !== id));
  state.confirmId = null;
  if (state.view === 'form') closeForm();
  else render();
  toast('Regra excluída');
}

async function toggleRule(id, enabled) {
  await saveRules(state.rules.map((r) => (r.id === id ? { ...r, enabled, updatedAt: Date.now() } : r)));
  render();
}

function exportRules() {
  const data = { app: 'rename-tab', version: 1, exportedAt: new Date().toISOString(), rules: state.rules };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `rename-tab-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${state.rules.length} regra${state.rules.length === 1 ? '' : 's'} exportada${state.rules.length === 1 ? '' : 's'}`);
}

function startImport() {
  if (isPage) {
    $fileInput.click();
    return;
  }
  // O seletor de arquivos fecha o popup, então a importação acontece numa aba.
  chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html?page=1#import') });
  window.close();
}

async function importFile(file) {
  try {
    const parsed = JSON.parse(await file.text());
    const list = Array.isArray(parsed) ? parsed : parsed?.rules;
    if (!Array.isArray(list)) throw new Error('formato');

    const byKey = new Map(state.rules.map((r) => [RT.ruleKey(r), r]));
    let added = 0;
    let updated = 0;
    const now = Date.now();
    for (const item of list) {
      const pattern = RT.normalizePattern(item?.pattern);
      const title = String(item?.title ?? '').trim();
      if (!pattern || !title) continue;
      const rule = { pattern, title, exact: !!item.exact, enabled: item.enabled !== false };
      const key = RT.ruleKey(rule);
      const existing = byKey.get(key);
      if (existing) {
        byKey.set(key, { ...existing, ...rule, updatedAt: now });
        updated++;
      } else {
        byKey.set(key, { id: uid(), ...rule, createdAt: now, updatedAt: now });
        added++;
      }
    }
    if (!added && !updated) throw new Error('vazio');
    await saveRules([...byKey.values()]);
    state.view = 'list';
    render();
    toast(`${added} adicionada${added === 1 ? '' : 's'}, ${updated} atualizada${updated === 1 ? '' : 's'}`);
  } catch {
    toast('Arquivo inválido', 'error');
  }
}

/* ---------- menu ---------- */

$menuBtn.append(icon('more'));
$menu.querySelector('[data-action="export"]').append(icon('download'), 'Exportar regras (.json)');
$menu.querySelector('[data-action="import"]').append(icon('upload'), 'Importar regras');

function setMenu(open) {
  $menu.hidden = !open;
  $menuBtn.setAttribute('aria-expanded', String(open));
  if (open) $menu.querySelector('button').focus();
}

$menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  setMenu($menu.hidden);
});

$menu.addEventListener('click', (e) => {
  const action = e.target.closest('button')?.dataset.action;
  setMenu(false);
  if (action === 'export') exportRules();
  if (action === 'import') startImport();
});

document.addEventListener('click', (e) => {
  if (!$menu.hidden && !$menu.contains(e.target)) setMenu(false);
});

$fileInput.addEventListener('change', () => {
  const file = $fileInput.files[0];
  $fileInput.value = '';
  if (file) importFile(file);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$menu.hidden) {
    setMenu(false);
    $menuBtn.focus();
  } else if (state.view === 'form') {
    e.preventDefault();
    closeForm();
  } else if (state.confirmId) {
    state.confirmId = null;
    render();
  }
});

// Mantém o popup sincronizado se as regras mudarem em outro lugar (ex.: página de importação).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[KEY]) return;
  const next = changes[KEY].newValue || [];
  if (JSON.stringify(next) === JSON.stringify(state.rules)) return;
  state.rules = next;
  if (state.view === 'list') render();
});

/* ---------- init ---------- */

async function init() {
  if (isPage) document.body.classList.add('is-page');

  const data = await chrome.storage.local.get(KEY);
  state.rules = data[KEY] || [];

  if (!isPage) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    state.tab = tab || null;
    state.originalTitle = tab?.title || '';
    if (tab && RT.urlTarget(tab.url)) {
      try {
        const info = await chrome.tabs.sendMessage(tab.id, { type: 'getInfo' });
        if (info?.original != null) state.originalTitle = info.original;
      } catch {
        // content script indisponível (aba aberta antes da instalação, por ex.)
      }
    }
  }

  if (isPage && location.hash === '#import') state.view = 'import';
  render();
}

init();
