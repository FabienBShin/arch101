import { loadState, saveState, resetState, getSaveTimes, recordBackup, setWeekDone, setWeekContent, setFinalVerdict, STORAGE_KEY } from './store.js';

const main = document.querySelector('#main');
let curriculum;
let flushPendingSave = () => {};
let fieldObservers = [];

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, href, className) {
  const node = element('a', text, className);
  node.href = href;
  return node;
}

function isComplete(week, state) {
  const done = state.weeks[week.n]?.done;
  return done?.study === true && done?.assignment === true
    && (!week.site || done?.site === true);
}

function renderHome() {
  const state = loadState();
  const weeks = curriculum.weeks;
  const completed = weeks.filter((week) => isComplete(week, state)).length;
  const current = weeks.find((week) => !isComplete(week, state)) ?? weeks.at(-1);
  // Home-only presentation helpers; the stored checklist and completion rules stay shared.
  const tasks = (week) => week.site
    ? [['study', '공부'], ['assignment', '과제'], ['site', '답사']]
    : [['study', '공부'], ['assignment', '과제']];
  const checkedCount = (week) => tasks(week).filter(([key]) => state.weeks[week.n]?.done?.[key] === true).length;
  function icon(kind) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const paths = kind === 'pin'
      ? ['M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z', 'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z']
      : kind === 'check' ? ['m5 12 4 4L19 6'] : ['m9 5 7 7-7 7'];
    for (const d of paths) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    return svg;
  }
  const intro = element('section', undefined, 'intro home-intro');
  intro.append(
    element('p', curriculum.subtitle, 'eyebrow'),
    element('h1', curriculum.title),
    element('p', curriculum.goal, 'description'),
    element('p', curriculum.pace, 'muted'),
  );

  const resume = element('section', undefined, 'resume-section');
  resume.setAttribute('aria-labelledby', 'resume-heading');
  const resumeLabel = element('p', completed === weeks.length ? '모든 주차 완료' : '이어하기', 'eyebrow');
  const resumeNumber = element('p', undefined, 'resume-number');
  resumeNumber.append(element('span', 'WEEK', 'week-label'),
    element('span', String(current.n).padStart(2, '0'), 'resume-digits'));
  const resumeHeading = element('h2', current.question);
  resumeHeading.id = 'resume-heading';
  const resumeBody = element('div', undefined, 'resume-body');
  resumeBody.append(resumeLabel, resumeHeading);
  const currentChecked = checkedCount(current);
  const currentTotal = tasks(current).length;
  const resumeStatus = element('p', `이번 주 진행 ${currentChecked}/${currentTotal}`, 'resume-status');
  const resumeProgress = element('progress', undefined, 'resume-progress');
  resumeProgress.max = currentTotal;
  resumeProgress.value = currentChecked;
  resumeProgress.setAttribute('aria-label', '이번 주 체크리스트 진행');
  resumeBody.append(resumeStatus, resumeProgress);
  const shortcut = link(
    completed === weeks.length ? '마지막 주 다시 보기' : '이어서 하기',
    `#/week/${current.n}`, 'button button-primary',
  );
  shortcut.append(icon('chevron'));
  resume.append(resumeNumber, resumeBody, shortcut);

  const summary = element('section', undefined, 'progress-panel');
  summary.setAttribute('aria-labelledby', 'progress-heading');
  const heading = element('h2', '전체 진행');
  heading.id = 'progress-heading';
  const count = element('p', `${completed}주 완료`, 'progress-count');
  count.append(element('span', ` / ${weeks.length}주`, 'progress-total'));
  const progress = element('div', undefined, 'progress-segments');
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', String(weeks.length));
  progress.setAttribute('aria-valuenow', String(completed));
  progress.setAttribute('aria-valuetext', `${weeks.length}주 중 ${completed}주 완료`);
  progress.setAttribute('aria-label', '완료한 주차');
  for (const week of weeks) {
    const segment = element('span', undefined,
      isComplete(week, state) ? 'progress-segment complete' : 'progress-segment');
    segment.setAttribute('aria-hidden', 'true');
    progress.append(segment);
  }
  summary.append(heading, count, progress);

  const section = element('section', undefined, 'weeks-section');
  section.setAttribute('aria-labelledby', 'weeks-heading');
  const weeksHeading = element('h2', '12주 커리큘럼');
  weeksHeading.id = 'weeks-heading';
  const filters = element('div', undefined, 'week-filters');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', '주차 목록 필터');
  const list = element('ol', undefined, 'week-list');
  const rows = [];
  for (const week of weeks) {
    const complete = isComplete(week, state);
    const item = element('li');
    const row = link(undefined, `#/week/${week.n}`,
      `week-link${complete ? ' complete' : week === current ? ' current' : ''}`);
    const number = element('span', undefined, 'week-number');
    number.append(element('span', 'WEEK', 'week-label'),
      element('span', String(week.n).padStart(2, '0'), 'week-digits'));
    if (complete) {
      const check = element('span', undefined, 'completion-mark');
      check.append(icon('check'));
      number.append(check);
    }
    const content = element('span', undefined, 'week-content');
    content.append(element('span', week.question, 'week-question'),
      element('span', week.study, 'week-preview'));
    const metadata = element('span', undefined, 'week-metadata');
    for (const [key, title] of tasks(week)) {
      const done = state.weeks[week.n]?.done?.[key] === true;
      const chip = element('span', title, `week-chip${done ? ' done' : ''}`);
      if (done) chip.append(element('span', ' 완료', 'visually-hidden'));
      metadata.append(chip);
    }
    metadata.append(element('span', `체크 ${checkedCount(week)}/${tasks(week).length}`, 'week-mini-progress'));
    content.append(metadata);
    if (week.site) {
      const place = element('span', undefined, 'week-place');
      place.append(icon('pin'), element('span', week.site));
      content.append(place);
    }
    const chevron = icon('chevron');
    chevron.classList.add('week-chevron');
    row.append(number, content, chevron,
      element('span', complete ? '완료한 주' : week === current ? '현재 주' : '남은 주', 'visually-hidden'));
    item.append(row);
    list.append(item);
    rows.push({ item, complete });
  }
  const empty = element('p', '', 'home-empty');
  empty.hidden = true;
  const filterStatus = element('p', '', 'visually-hidden');
  filterStatus.setAttribute('role', 'status');
  for (const [value, label] of [['all', '전체'], ['remaining', '남은 주'], ['complete', '완료']]) {
    const control = element('button', label);
    control.type = 'button';
    control.setAttribute('aria-pressed', String(value === 'all'));
    control.addEventListener('click', () => {
      for (const other of filters.children) other.setAttribute('aria-pressed', String(other === control));
      let visible = 0;
      for (const { item, complete } of rows) {
        item.hidden = value === 'remaining' ? complete : value === 'complete' ? !complete : false;
        if (!item.hidden) visible++;
      }
      empty.hidden = visible !== 0;
      empty.textContent = value === 'complete' ? '아직 완료한 주가 없습니다.' : '모든 주차를 완료했습니다.';
      filterStatus.textContent = `${label} · ${visible}개 주차`;
    });
    filters.append(control);
  }
  section.append(weeksHeading, filters, filterStatus, list, empty);
  main.append(intro, resume, summary, section);
}

function renderWeek(week) {
  const state = loadState();
  const intro = element('section', undefined, 'intro week-detail-header');
  const number = element('p', undefined, 'week-detail-number');
  number.append(element('span', 'WEEK', 'week-label'),
    element('span', String(week.n).padStart(2, '0'), 'week-detail-digits'));
  intro.append(
    number,
    element('p', `${week.n}주차 · 이번 주 질문`, 'eyebrow'),
    element('h1', week.question),
  );

  const section = element('section', undefined, 'panel week-checklist-panel');
  section.setAttribute('aria-labelledby', 'checklist-heading');
  const heading = element('h2', '이번 주 체크리스트');
  heading.id = 'checklist-heading';
  const status = element('p', undefined, 'muted');
  status.setAttribute('role', 'status');
  const items = [['study', '공부'], ['assignment', '과제']];
  if (week.site) items.push(['site', '답사']);
  function updateStatus() {
    const latest = loadState();
    const checked = items.filter(([key]) => latest.weeks[week.n]?.done?.[key] === true).length;
    status.textContent = isComplete(week, latest)
      ? `${checked} / ${items.length}개 완료 · 이번 주 완료!`
      : `${checked} / ${items.length}개 완료 · 모든 항목을 체크하면 이번 주가 완료됩니다.`;
  }
  updateStatus();
  const list = element('ul', undefined, 'checklist');
  const saveMessage = element('p', '', 'muted save-message');
  saveMessage.setAttribute('role', 'status');
  for (const [key, title] of items) {
    const item = element('li');
    const label = element('label', undefined, 'checklist-item');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.name = key;
    checkbox.checked = state.weeks[week.n]?.done?.[key] === true;
    const content = element('span', undefined, 'checklist-content');
    content.append(element('strong', title), element('span', week[key]));
    checkbox.addEventListener('change', () => {
      const saved = setWeekDone(week.n, key, checkbox.checked);
      updateStatus();
      saveMessage.textContent = saved ? '' : '기기에 저장하지 못했습니다. 현재 세션에서는 체크 상태가 유지됩니다.';
    });
    label.append(checkbox, content);
    item.append(label);
    list.append(item);
  }
  section.append(heading, status, list, saveMessage);

  const observation = element('section', undefined, 'panel observation-panel week-observation');
  observation.setAttribute('aria-labelledby', 'observation-heading');
  const observationHeading = element('h2', '관찰 카드');
  observationHeading.id = 'observation-heading';
  const fields = element('div', undefined, 'card-fields');
  const contentStatus = element('p', '', 'muted save-message');
  contentStatus.setAttribute('role', 'status');
  const observationHeader = element('div', undefined, 'observation-header');
  const progressText = element('span', undefined, 'observation-count');
  const progress = element('progress', undefined, 'observation-progress');
  progress.max = curriculum.cardFields.length;
  progress.setAttribute('aria-label', '관찰 카드 작성 진행');
  observationHeader.append(observationHeading, contentStatus, progressText, progress);
  const cardInputs = [];
  function updateProgress() {
    const count = cardInputs.filter((input) => input.value.trim()).length;
    progressText.textContent = `${count}/${progress.max} 작성`;
    progress.value = count;
  }
  function prepareField(label, input, title, hint, id) {
    const fieldHeader = element('span', undefined, 'field-header');
    const fieldTitle = element('span', title, 'field-title');
    const dot = element('span', undefined, 'field-dot');
    dot.setAttribute('aria-hidden', 'true');
    fieldTitle.append(dot);
    const help = element('span', hint, 'field-hint');
    help.id = `${id}-hint`;
    input.id = id;
    input.setAttribute('aria-describedby', help.id);
    input.setAttribute('enterkeyhint', 'next');
    label.htmlFor = id;
    fieldHeader.append(fieldTitle, help);
    label.append(fieldHeader, input);
    function updateAppearance() {
      label.classList.toggle('has-content', Boolean(input.value.trim()));
      const style = getComputedStyle(input);
      const inset = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
        + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const maximum = parseFloat(style.lineHeight) * 8 + inset;
      input.style.height = 'auto';
      input.style.height = `${Math.min(maximum, Math.max(56, input.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)))}px`;
      input.style.overflowY = input.scrollHeight > input.clientHeight ? 'auto' : 'hidden';
    }
    input.addEventListener('input', updateAppearance);
    // Observe width changes too, so restored text fits at phone and iPad widths.
    let previousWidth;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === previousWidth) return;
      previousWidth = entry.contentRect.width;
      updateAppearance();
    });
    observer.observe(label);
    fieldObservers.push(observer);
    label.classList.toggle('has-content', Boolean(input.value.trim()));
  }
  let timer;
  let pendingCard = {};
  let pendingNotes;
  function saveContent() {
    clearTimeout(timer);
    if (!Object.keys(pendingCard).length && pendingNotes === undefined) return;
    const saved = setWeekContent(week.n, pendingCard, pendingNotes);
    pendingCard = {};
    pendingNotes = undefined;
    contentStatus.textContent = saved
      ? '저장됨'
      : '기기에 저장하지 못했습니다. 현재 세션에서는 입력이 유지됩니다.';
  }
  flushPendingSave = saveContent;
  function scheduleSave() {
    clearTimeout(timer);
    contentStatus.textContent = '저장 대기 중…';
    timer = setTimeout(saveContent, 400);
  }
  for (const field of [...curriculum.cardFields.filter((field) => field.key !== 'sentence'),
    ...curriculum.cardFields.filter((field) => field.key === 'sentence')]) {
    const label = element('label', undefined,
      field.key === 'sentence' ? 'card-field sentence-field' : 'card-field');
    const input = element('textarea');
    input.name = field.key;
    input.rows = 1;
    input.placeholder = field.key === 'sentence' ? field.hint : '탭해서 입력';
    input.value = typeof state.weeks[week.n]?.card?.[field.key] === 'string'
      ? state.weeks[week.n].card[field.key] : '';
    cardInputs.push(input);
    input.addEventListener('input', () => {
      pendingCard[field.key] = input.value;
      scheduleSave();
    });
    input.addEventListener('input', updateProgress);
    prepareField(label, input, field.label, field.hint, `card-${field.key}`);
    fields.append(label);
  }
  const notesLabel = element('label', undefined, 'card-field notes-field');
  const notes = element('textarea');
  notes.name = 'notes';
  notes.rows = 1;
  notes.value = typeof state.weeks[week.n]?.notes === 'string' ? state.weeks[week.n].notes : '';
  notes.addEventListener('input', () => {
    pendingNotes = notes.value;
    scheduleSave();
  });
  notes.placeholder = '탭해서 입력';
  prepareField(notesLabel, notes, '자유 메모', '답사와 공부에서 떠오른 생각을 적어 주세요.', 'week-notes');
  updateProgress();
  observation.append(observationHeader, fields, notesLabel);

  const navigation = element('nav', undefined, 'week-navigation');
  navigation.setAttribute('aria-label', '주차 이동');
  const index = curriculum.weeks.indexOf(week);
  const previous = curriculum.weeks[index - 1];
  const next = curriculum.weeks[index + 1];
  if (previous) navigation.append(link(`← ${previous.n}주차`, `#/week/${previous.n}`, 'button'));
  navigation.append(link('홈으로', '#/', 'button'));
  if (next) navigation.append(link(`${next.n}주차 →`, `#/week/${next.n}`, 'button'));
  main.append(intro, section, observation, navigation);
}

function renderInfo() {
  const state = loadState();
  const intro = element('section', undefined, 'intro editorial-intro');
  intro.append(element('p', 'REFERENCE', 'eyebrow'), element('h1', '정보'),
    element('p', '01 / GOAL', 'eyebrow'), element('h2', '학기 목표'),
    element('p', curriculum.goal, 'description'), element('p', curriculum.pace, 'muted'));

  const textbooks = element('section', undefined, 'panel info-panel editorial-section');
  const bookList = element('ul', undefined, 'info-list');
  for (const book of curriculum.textbooks) {
    const item = element('li');
    item.append(element('strong', book.role));
    if (book.url) {
      const bookLink = link(book.name, book.url);
      bookLink.target = '_blank';
      bookLink.rel = 'noopener';
      item.append(bookLink);
    } else {
      item.append(element('span', book.name));
    }
    bookList.append(item);
  }
  textbooks.append(element('p', '02 / READING', 'eyebrow'), element('h2', '교재 목록'), bookList);
  if (!curriculum.textbooks.length) textbooks.append(element('p', '등록된 교재가 없습니다.', 'empty-state'));

  const sites = element('section', undefined, 'panel info-panel editorial-section');
  const siteList = element('ul', undefined, 'info-list');
  for (const site of curriculum.extraSites) siteList.append(element('li', site));
  sites.append(element('p', '03 / FIELDWORK', 'eyebrow'), element('h2', '추가 답사지'), siteList);
  if (!curriculum.extraSites.length) sites.append(element('p', '등록된 답사지가 없습니다.', 'empty-state'));

  const verdict = element('fieldset', undefined, 'panel verdict-panel editorial-section');
  const verdictHeading = element('legend');
  verdictHeading.append(element('span', '04 / NEXT STEP', 'eyebrow'),
    element('span', '12주 후 진로 판정표', 'section-title'));
  verdict.append(verdictHeading);
  const verdictList = element('div', undefined, 'checklist');
  const saveMessage = element('p', '', 'muted save-message');
  saveMessage.setAttribute('role', 'status');
  for (const entry of curriculum.verdict) {
    const label = element('label', undefined, 'checklist-item');
    const radio = element('input');
    radio.type = 'radio';
    radio.name = 'finalVerdict';
    radio.value = entry.feel;
    radio.checked = state.finalVerdict === entry.feel;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const saved = setFinalVerdict(radio.value);
      saveMessage.textContent = saved ? '저장됨'
        : '기기에 저장하지 못했습니다. 현재 세션에서는 선택이 유지됩니다.';
    });
    const content = element('span', undefined, 'checklist-content');
    content.append(element('strong', entry.feel), element('span', entry.next));
    label.append(radio, content);
    verdictList.append(label);
  }
  verdict.append(verdictList, saveMessage);
  if (!curriculum.verdict.length) verdict.append(element('p', '등록된 진로 항목이 없습니다.', 'empty-state'));
  main.append(intro, textbooks, sites, verdict);
}


const LIMITS = { card: 10000, notes: 50000, finalVerdict: 1000, updatedAt: 100 };
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const own = (value, key) => Object.hasOwn(value, key);

function object(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path}: 객체여야 합니다.`);
  }
  return value;
}

function string(value, path, limit) {
  if (typeof value !== 'string') throw new Error(`${path}: 문자열이어야 합니다.`);
  if (value.length > limit) throw new Error(`${path}: ${limit.toLocaleString('ko-KR')}자 이하로 입력해 주세요.`);
  return value;
}

// Copy only known own properties; never merge untrusted objects into app state.
function validateBackup(value, cardFields) {
  const root = object(value, '백업');
  const weeks = object(root.weeks, 'weeks');
  const result = { weeks: {}, finalVerdict: '' };
  if (own(root, 'finalVerdict')) {
    result.finalVerdict = string(root.finalVerdict, 'finalVerdict', LIMITS.finalVerdict);
  }
  for (const [number, value] of Object.entries(weeks)) {
    if (!/^(?:[1-9]|1[0-2])$/.test(number)) {
      throw new Error('weeks: 주차 키는 1~12만 사용할 수 있습니다.');
    }
    const path = `weeks.${number}`;
    const source = object(value, path);
    const week = {
      done: { study: false, assignment: false, site: false },
      card: Object.fromEntries(cardFields.map(({ key }) => [key, ''])),
      notes: '',
      updatedAt: new Date().toISOString(),
    };
    if (own(source, 'done')) {
      const done = object(source.done, `${path}.done`);
      for (const key of ['study', 'assignment', 'site']) {
        if (!own(done, key)) continue;
        if (typeof done[key] !== 'boolean') throw new Error(`${path}.done.${key}: boolean이어야 합니다.`);
        week.done[key] = done[key];
      }
    }
    if (own(source, 'card')) {
      const card = object(source.card, `${path}.card`);
      for (const { key } of cardFields) {
        if (own(card, key)) week.card[key] = string(card[key], `${path}.card.${key}`, LIMITS.card);
      }
    }
    if (own(source, 'notes')) week.notes = string(source.notes, `${path}.notes`, LIMITS.notes);
    if (own(source, 'updatedAt')) {
      const timestamp = string(source.updatedAt, `${path}.updatedAt`, LIMITS.updatedAt);
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp)
        || !Number.isFinite(Date.parse(timestamp))
        || new Date(timestamp).toISOString() !== timestamp) {
        throw new Error(`${path}.updatedAt: 올바른 ISO 저장 시각이어야 합니다.`);
      }
      week.updatedAt = timestamp;
    }
    result.weeks[number] = week;
  }
  return result;
}

function button(text) {
  const node = element('button', text, 'button');
  node.type = 'button';
  return node;
}

function backupFile() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const name = `arch101-backup-${date}.json`;
  const blob = new Blob([JSON.stringify(loadState(), null, 2)], { type: 'application/json' });
  return { name, blob };
}

function renderSettings(main, cardFields) {
  const intro = element('section', undefined, 'intro editorial-intro');
  const times = element('p', '', 'muted');
  function updateTimes() {
    const metadata = getSaveTimes();
    const format = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleString('ko-KR') : '기록 없음';
    times.textContent = `마지막 백업: ${format(metadata.backedUpAt)} · 마지막 저장: ${format(metadata.savedAt)}`;
  }
  updateTimes();
  intro.append(element('p', 'PREFERENCES', 'eyebrow'), element('h1', '설정'), times);
  const status = element('p', '', 'muted save-message');
  status.setAttribute('role', 'status');
  status.style.overflowWrap = 'anywhere';

  const exporting = element('section', undefined, 'panel editorial-section settings-section');
  const download = button('JSON 내보내기');
  download.addEventListener('click', () => {
    let url;
    try {
      const { name, blob } = backupFile();
      url = URL.createObjectURL(blob);
      const anchor = element('a');
      anchor.href = url;
      anchor.download = name;
      main.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
      recordBackup();
      updateTimes();
      status.textContent = '백업 다운로드를 요청했습니다. 파일이 저장되었는지 확인해 주세요.';
    } catch {
      status.textContent = '백업 파일을 만들지 못했습니다. 다시 시도해 주세요.';
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  });
  exporting.append(element('p', '01 / EXPORT', 'eyebrow'), element('h2', 'JSON 내보내기'), download);
  try {
    const probe = new File(['{}'], 'arch101-backup.json', { type: 'application/json' });
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [probe] })) {
      const share = button('백업 파일 공유');
      share.className = 'button share-button';
      share.addEventListener('click', async () => {
        share.disabled = true;
        try {
          const { name, blob } = backupFile();
          const file = new File([blob], name, { type: 'application/json' });
          if (!navigator.canShare({ files: [file] })) throw new Error('Unsupported file');
          await navigator.share({ files: [file], title: 'ARCH 101 백업' });
          recordBackup();
          updateTimes();
          status.textContent = '백업 파일을 공유했습니다.';
        } catch (error) {
          status.textContent = error.name === 'AbortError' ? '백업 공유를 취소했습니다.'
            : '파일을 공유하지 못했습니다. JSON 내보내기로 다운로드해 주세요.';
        } finally {
          share.disabled = false;
        }
      });
      exporting.append(share);
    }
  } catch {
    // File sharing is optional; Blob download remains available.
  }

  const importing = element('section', undefined, 'panel info-panel editorial-section settings-section');
  const label = element('label', undefined, 'card-field');
  const input = element('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.style.minHeight = '44px';
  input.style.width = '100%';
  input.style.minWidth = '0';
  label.append(element('span', '가져올 JSON 파일'), input);
  const reset = button('전체 초기화');
  reset.className = 'button button-danger';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    input.disabled = true;
    reset.disabled = true;
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('파일은 8MB 이하여야 합니다.');
      const text = await file.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { throw new Error('올바른 JSON 파일이 아닙니다.'); }
      const state = validateBackup(parsed, cardFields);
      if (!window.confirm('현재 진도와 입력 내용을 이 백업으로 덮어쓸까요? 기존 내용은 삭제됩니다.')) {
        status.textContent = '가져오기를 취소했습니다.';
        return;
      }
      const saved = saveState(state);
      updateTimes();
      status.textContent = saved ? '백업을 가져왔습니다.'
        : '가져왔지만 기기에 저장하지 못했습니다. 현재 세션에만 유지됩니다.';
    } catch (error) {
      status.textContent = `가져오기 실패: ${error.message}`;
    } finally {
      input.value = '';
      input.disabled = false;
      reset.disabled = false;
    }
  });
  importing.append(element('p', '02 / IMPORT', 'eyebrow'), element('h2', 'JSON 가져오기'),
    element('p', '검증 후 확인하면 현재 데이터를 덮어씁니다. 알 수 없는 필드는 무시합니다.', 'muted'),
    element('p', '길이 제한: 카드 항목 10,000자 · 자유 메모 50,000자 · 진로 판정 1,000자. 파일 최대 8MB.', 'muted'), label);

  const clearing = element('section', undefined, 'panel info-panel editorial-section settings-section');
  reset.addEventListener('click', () => {
    if (!window.confirm('모든 진도와 입력 내용, 백업·저장 시각을 삭제할까요? 되돌릴 수 없습니다.')) return;
    const cleared = resetState();
    updateTimes();
    status.textContent = cleared ? '전체 데이터를 초기화했습니다.'
      : '기기 저장소에서 삭제하지 못했습니다. 다시 시도해 주세요.';
  });
  clearing.append(element('p', '03 / RESET', 'eyebrow'), element('h2', '전체 초기화'), reset);
  main.append(intro, exporting, importing, clearing, status);
}

function renderPlaceholder(title, description) {
  const section = element('section', undefined, 'panel placeholder');
  section.append(element('p', 'ARCH 101', 'eyebrow'), element('h1', title), element('p', description, 'muted'), link('홈으로 돌아가기', '#/', 'button'));
  main.append(section);
}

function renderRoute(focus = false) {
  if (!curriculum) return;
  flushPendingSave();
  flushPendingSave = () => {};
  for (const observer of fieldObservers) observer.disconnect();
  fieldObservers = [];
  main.replaceChildren();
  const hash = window.location.hash || '#/';
  let active = 'home';
  let title = '홈';
  const weekMatch = /^#\/week\/([1-9]\d*)$/.exec(hash);
  if (hash === '#/') {
    renderHome();
  } else if (weekMatch) {
    const week = curriculum.weeks.find((entry) => entry.n === Number(weekMatch[1]));
    if (week) {
      title = `${week.n}주차`;
      renderWeek(week);
    } else {
      title = '페이지를 찾을 수 없습니다';
      renderPlaceholder(title, '1~12주차 중에서 선택해 주세요.');
    }
  } else if (hash === '#/info') {
    active = 'info';
    title = '정보';
    renderInfo();
  } else if (hash === '#/settings') {
    active = 'settings';
    title = '설정';
    renderSettings(main, curriculum.cardFields);
  } else {
    title = '페이지를 찾을 수 없습니다';
    renderPlaceholder(title, '홈에서 원하는 주차를 선택해 주세요.');
  }
  for (const item of document.querySelectorAll('[data-nav]')) {
    if (item.dataset.nav === active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  document.title = `${title} · ARCH 101`;
  if (focus) main.focus();
}

async function start() {
  main.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(new URL('../data/curriculum.json', import.meta.url));
    if (!response.ok) throw new Error('Curriculum load failed');
    curriculum = await response.json();
    renderRoute();
  } catch {
    curriculum = undefined;
    main.replaceChildren();
    const message = element('p', '커리큘럼을 불러오지 못했습니다. 정적 서버에서 앱을 열고 다시 시도해 주세요.');
    message.setAttribute('role', 'alert');
    const retry = element('button', '다시 시도', 'button');
    retry.type = 'button';
    retry.addEventListener('click', start);
    main.append(message, retry);
  } finally {
    main.setAttribute('aria-busy', 'false');
  }
}

window.addEventListener('hashchange', () => renderRoute(true));
window.addEventListener('pagehide', () => flushPendingSave());
window.addEventListener('beforeunload', () => flushPendingSave());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushPendingSave();
});
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY || event.key === null) renderRoute();
});
document.querySelector('.skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  main.focus();
});
start();

if ('serviceWorker' in navigator) { navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch((error) => console.warn('서비스워커 등록 실패:', error)); }
