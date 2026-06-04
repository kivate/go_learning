'use strict';

// ── Monaco 初始化 ─────────────────────────────────────────────
require.config({
  paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' },
});

let editor = null;
let currentExercise = null;
let solutionVisible = false;

// localStorage keys
const LS_COMPLETED = 'go-practice-completed';
const LS_CODE_PFX  = 'go-practice-code-';

function getCompleted() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_COMPLETED) || '[]')); }
  catch { return new Set(); }
}
function saveCompleted(set) {
  localStorage.setItem(LS_COMPLETED, JSON.stringify([...set]));
}
function getSavedCode(id) {
  return localStorage.getItem(LS_CODE_PFX + id);
}
function saveCode(id, code) {
  localStorage.setItem(LS_CODE_PFX + id, code);
}

// ── Monaco require ────────────────────────────────────────────
require(['vs/editor/editor.main'], function () {
  const isDark = document.documentElement.classList.contains('dark');

  editor = monaco.editor.create(document.getElementById('monacoContainer'), {
    value: '// ← 請從左側選擇一個練習題\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Go!")\n}',
    language: 'go',
    theme: isDark ? 'vs-dark' : 'vs',
    fontSize: 14,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    tabSize: 4,
    insertSpaces: true,
    wordWrap: 'off',
    renderLineHighlight: 'line',
    smoothScrolling: true,
  });

  // 自動儲存到 localStorage
  editor.onDidChangeModelContent(() => {
    if (currentExercise && !currentExercise.isRandom && !solutionVisible) {
      saveCode(currentExercise.id, editor.getValue());
    }
  });

  // Ctrl/Cmd + Enter 執行
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCode);

  buildSidebar();
  setupEventListeners();
  setupDividers();
  updateProgress();

  // 合併所有固定練習題（含 LC）
  selectExercise(EXERCISES[0]);
  window.ALL_EXERCISES = [...EXERCISES, ...LC_EXERCISES];
});

// ── 側欄建構 ─────────────────────────────────────────────────
function buildSidebar() {
  const container = document.getElementById('chapterList');
  container.innerHTML = '';
  const completed = getCompleted();

  // ── 一般練習章節（優先顯示）──
  buildChaptersFromList(container, EXERCISES, completed, true);

  // ── LC 章節 ──
  buildChaptersFromList(container, LC_EXERCISES, completed, false);

  // ── 隨機挑戰區塊（可摺疊，預設展開）──
  const randSection = document.createElement('div');
  randSection.className = 'random-section chapter-item open';
  randSection.innerHTML = `
    <div class="random-header chapter-header">
      <span class="ch-arrow">▶</span>🎲 隨機挑戰
    </div>
    <div class="rand-body exercise-list">
      <div class="random-inner">
        <div class="random-actions">
          <button type="button" class="btn-random" id="newRandBtn">產生隨機題目</button>
          <button type="button" class="btn-random btn-rand-again" id="regenBtn" style="display:none">重新出題</button>
        </div>
        <div id="randTypeList" class="rand-type-list"></div>
      </div>
    </div>
  `;
  container.appendChild(randSection);
  randSection.querySelector('.random-header').addEventListener('click', () =>
    randSection.classList.toggle('open')
  );

  const typeList = randSection.querySelector('#randTypeList');
  RANDOM_TEMPLATES.forEach((t) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rand-type-btn';
    btn.textContent = t.titlePrefix;
    btn.addEventListener('click', () => {
      selectExercise(generateRandomExercise(t.key));
      showRegenBtn(t.key);
    });
    typeList.appendChild(btn);
  });
}

function buildChaptersFromList(container, exercises, completed, openFirst) {
  const chapters = {};
  exercises.forEach((ex) => {
    if (!chapters[ex.chapterId]) {
      chapters[ex.chapterId] = { title: ex.chapterTitle, exercises: [] };
    }
    chapters[ex.chapterId].exercises.push(ex);
  });

  let first = openFirst;
  Object.entries(chapters).forEach(([id, chapter]) => {
    const chapterEl = document.createElement('div');
    chapterEl.className = 'chapter-item' + (first ? ' open' : '');
    chapterEl.dataset.chapterId = id;

    const header = document.createElement('div');
    header.className = 'chapter-header';
    header.innerHTML = `<span class="ch-arrow">▶</span>${chapter.title}`;
    header.addEventListener('click', () => chapterEl.classList.toggle('open'));

    const list = document.createElement('div');
    list.className = 'exercise-list';

    chapter.exercises.forEach((ex) => {
      const item = document.createElement('div');
      const isDone = completed.has(ex.id);
      item.className = 'exercise-item' + (isDone ? ' done' : '');
      item.dataset.id = ex.id;
      // 有 difficulty 的題目顯示難度點（LC 題 + 概念題 + 隨機題）
      const badge = ex.difficulty
        ? `<span class="lc-dot ${ex.difficulty}"></span>`
        : `<span class="done-mark">✓</span>`;
      item.innerHTML = `${badge}${ex.title}`;
      item.addEventListener('click', () => {
        selectExercise(ex);
        hideRegenBtn();
      });
      list.appendChild(item);
    });

    chapterEl.appendChild(header);
    chapterEl.appendChild(list);
    container.appendChild(chapterEl);
    first = false;
  });
}

function showRegenBtn(key) {
  const btn = document.getElementById('regenBtn');
  if (!btn) return;
  btn.style.display = '';
  btn.onclick = () => selectExercise(generateRandomExercise(key));
}
function hideRegenBtn() {
  const btn = document.getElementById('regenBtn');
  if (btn) btn.style.display = 'none';
}

// ── 選取練習題 ───────────────────────────────────────────────
function selectExercise(ex) {
  currentExercise = ex;
  solutionVisible = false;

  // 標題（有 difficulty 的題目顯示難度 badge）
  const titleEl = document.getElementById('exerciseTitle');
  if (ex.difficulty) {
    const labels = { easy: '簡單', medium: '中等', hard: '困難' };
    const numTag = ex.number ? `<span class="lc-num">#${ex.number}</span> ` : '';
    const randTag = ex.isRandom ? ' 🎲' : '';
    titleEl.innerHTML =
      `${numTag}${ex.title}${randTag} ` +
      `<span class="difficulty-badge ${ex.difficulty}">${labels[ex.difficulty]}</span>`;
  } else {
    titleEl.textContent = ex.title + (ex.isRandom ? '  🎲' : '');
  }

  document.getElementById('showSolutionBtn').textContent = '查看解答';

  // 完成按鈕（LC 題也可標記）
  const doneBtn = document.getElementById('markDoneBtn');
  doneBtn.style.display = ex.isRandom ? 'none' : '';
  if (!ex.isRandom) {
    const isDone = getCompleted().has(ex.id);
    doneBtn.textContent = isDone ? '✓ 已完成' : '標記完成';
    doneBtn.classList.toggle('done', isDone);
  }

  // Markdown 渲染
  document.getElementById('conceptContent').innerHTML = marked.parse(ex.concept || '');
  document.getElementById('exerciseDesc').innerHTML   = marked.parse(ex.description || '');

  // 載入程式碼
  const code = ex.isRandom ? ex.template : (getSavedCode(ex.id) || ex.template);
  editor.setValue(code);
  editor.setScrollPosition({ scrollTop: 0 });

  // 有 prefix 的題目：提示只填函數主體
  if (ex.prefix) {
    setOutput('// 只需填入函數邏輯，不需要 package main\n// 點擊「▶ 執行」自動執行所有測試案例', '');
  } else {
    setOutput('// 點擊「▶ 執行」或按 Ctrl+Enter 執行程式碼', '');
  }

  // sidebar active
  document.querySelectorAll('.exercise-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === ex.id);
  });

  // 展開所屬章節
  const chEl = document.querySelector(`.chapter-item[data-chapter-id="${ex.chapterId}"]`);
  if (chEl && !chEl.classList.contains('open')) chEl.classList.add('open');
}

// ── 執行程式碼 ───────────────────────────────────────────────
async function runCode() {
  if (!editor) return;
  const runBtn = document.getElementById('runBtn');
  runBtn.disabled = true;
  runBtn.textContent = '⏳ 執行中...';
  setOutput('執行中...', '');

  // 有 prefix 的題目：自動組合 prefix + 使用者程式碼 + suffix
  let code = editor.getValue();
  if (currentExercise && currentExercise.prefix) {
    code = currentExercise.prefix + code + currentExercise.suffix;
  }

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) { setOutput('伺服器錯誤：' + res.status, 'error'); return; }
    const data = await res.json();
    document.getElementById('runTime').textContent =
      data.ms != null ? `${data.ms} ms` : '';
    if (data.error) {
      setOutput(data.error, 'error');
    } else {
      setOutput(data.output || '（執行完畢，無輸出）', 'success');
    }
  } catch (err) {
    setOutput('無法連線到伺服器：' + err.message, 'error');
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '▶ 執行';
  }
}

function setOutput(text, cls) {
  const el = document.getElementById('outputContent');
  el.textContent = text;
  el.className = 'output-content' + (cls ? ' ' + cls : '');
}

// ── 進度計數 ─────────────────────────────────────────────────
function updateProgress() {
  const completed = getCompleted();
  const allFixed  = [...EXERCISES, ...LC_EXERCISES];
  const done  = allFixed.filter((e) => completed.has(e.id)).length;
  const total = allFixed.length;
  const el = document.getElementById('progressText');
  if (el) el.textContent = `${done} / ${total}`;
}

// ── 事件監聽 ─────────────────────────────────────────────────
function setupEventListeners() {
  document.getElementById('runBtn').addEventListener('click', runCode);

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!currentExercise) return;
    editor.setValue(currentExercise.template);
    solutionVisible = false;
    document.getElementById('showSolutionBtn').textContent = '查看解答';
    if (!currentExercise.isRandom) saveCode(currentExercise.id, currentExercise.template);
  });

  document.getElementById('showSolutionBtn').addEventListener('click', () => {
    if (!currentExercise) return;
    solutionVisible = !solutionVisible;
    if (solutionVisible) {
      editor.setValue(currentExercise.solution);
      document.getElementById('showSolutionBtn').textContent = '隱藏解答';
    } else {
      const code = currentExercise.isRandom
        ? currentExercise.template
        : (getSavedCode(currentExercise.id) || currentExercise.template);
      editor.setValue(code);
      document.getElementById('showSolutionBtn').textContent = '查看解答';
    }
  });

  // 標記完成
  document.getElementById('markDoneBtn').addEventListener('click', () => {
    if (!currentExercise || currentExercise.isRandom) return;
    const completed = getCompleted();
    const btn = document.getElementById('markDoneBtn');
    const id = currentExercise.id;
    if (completed.has(id)) {
      completed.delete(id);
      btn.textContent = '標記完成';
      btn.classList.remove('done');
    } else {
      completed.add(id);
      btn.textContent = '✓ 已完成';
      btn.classList.add('done');
    }
    saveCompleted(completed);
    updateProgress();
    const item = document.querySelector(`.exercise-item[data-id="${id}"]`);
    if (item) item.classList.toggle('done', completed.has(id));
  });

  // 隨機產生
  document.getElementById('newRandBtn').addEventListener('click', () => {
    const ex = generateRandomExercise();
    selectExercise(ex);
    showRegenBtn(ex._key);
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
    if (editor) editor.layout();
  });
}

// ── 主題切換 ─────────────────────────────────────────────────
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
  if (editor) monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
}

// ── 可拖曳分隔線（修正版：初始尺寸 + 累積 delta） ────────────
function setupDividers() {
  makeDraggable(
    document.getElementById('vdivider'),
    () => ({
      initialW: document.getElementById('conceptPanel').getBoundingClientRect().width,
      totalW:   document.querySelector('.top-row').getBoundingClientRect().width,
    }),
    (state, dx) => {
      const pct = Math.min(65, Math.max(15, ((state.initialW + dx) / state.totalW) * 100));
      document.getElementById('conceptPanel').style.width = pct + '%';
      if (editor) editor.layout();
    },
    'col-resize',
  );

  makeDraggable(
    document.getElementById('hdivider'),
    () => ({
      initialH: document.getElementById('outputPanel').getBoundingClientRect().height,
    }),
    (state, _dx, dy) => {
      const mainH = document.getElementById('main').getBoundingClientRect().height;
      const newH  = Math.min(mainH * 0.65, Math.max(60, state.initialH - dy));
      document.getElementById('outputPanel').style.height = newH + 'px';
      if (editor) editor.layout();
    },
    'row-resize',
  );
}

function makeDraggable(el, onDragStart, onMove, cursor) {
  el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    el.classList.add('dragging');
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startY = e.clientY;
    const state  = onDragStart();

    const onMouseMove = (ev) => onMove(state, ev.clientX - startX, ev.clientY - startY);
    const onMouseUp   = () => {
      el.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}
