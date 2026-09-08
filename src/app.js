const STORAGE_KEY = "weekly-todos";

const DAY_SECTIONS = [
  { weekday: 1, label: "월요일" },
  { weekday: 2, label: "화요일" },
  { weekday: 3, label: "수요일" },
  { weekday: 4, label: "목요일" },
  { weekday: 5, label: "금요일" },
  { weekday: 6, label: "토요일" },
  { weekday: 7, label: "일요일" },
  { weekday: null, label: "언제든" },
];

function startOfWeek(date = new Date()) {
  const start = new Date(date);
  const weekday = start.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;

  start.setDate(start.getDate() - daysFromMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfWeek(date = new Date()) {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 6);
  return end;
}

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatKoreanDate(date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatWeekRange(date = new Date()) {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  return `${formatKoreanDate(start)} – ${formatKoreanDate(end)}`;
}

function dateForWeekday(weekday) {
  if (weekday == null) return "";
  const date = startOfWeek();
  date.setDate(date.getDate() + (weekday - 1));
  return formatKoreanDate(date);
}

function parseWeekday(value) {
  const weekday = Number(value);
  return weekday >= 1 && weekday <= 7 ? weekday : null;
}

function todayWeekday(date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function todoWeekday(todo) {
  return parseWeekday(todo.weekday);
}

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function weekdayOptions(selected) {
  const selectedValue = selected == null ? "" : String(selected);
  const options = [
    { value: "", label: "언제든" },
    ...DAY_SECTIONS.filter((section) => section.weekday != null).map((section) => ({
      value: String(section.weekday),
      label: section.label.replace("요일", ""),
    })),
  ];

  return options
    .map(
      (option) =>
        `<option value="${option.value}" ${
          option.value === selectedValue ? "selected" : ""
        }>${option.label}</option>`,
    )
    .join("");
}

const app = document.querySelector("#app");
const thisWeekKey = toLocalDateKey(startOfWeek());
let editingId = null;
let notice = "";

function thisWeekTodos(todos) {
  return todos.filter((todo) => todo.weekStart === thisWeekKey);
}

function leftoverTodos(todos) {
  return todos.filter(
    (todo) =>
      !todo.done &&
      typeof todo.weekStart === "string" &&
      todo.weekStart < thisWeekKey,
  );
}

function todosForSection(todos, weekday) {
  return todos.filter((todo) => todoWeekday(todo) === weekday);
}

function todoItem(todo) {
  if (todo.id === editingId) {
    return `
      <li class="${todo.done ? "done" : ""} editing">
        <span class="check" aria-hidden="true"></span>
        <form class="todo-edit" data-id="${todo.id}" autocomplete="off">
          <label class="sr-only" for="edit-${todo.id}">할 일 수정</label>
          <input
            id="edit-${todo.id}"
            name="text"
            type="text"
            maxlength="80"
            value="${escapeHtml(todo.text)}"
          />
          <label class="sr-only" for="edit-day-${todo.id}">요일</label>
          <select id="edit-day-${todo.id}" name="weekday">
            ${weekdayOptions(todoWeekday(todo))}
          </select>
          <button type="submit">저장</button>
          <button type="button" class="todo-cancel">취소</button>
        </form>
      </li>
    `;
  }

  return `
    <li class="${todo.done ? "done" : ""}">
      <button type="button" class="todo-toggle" data-id="${todo.id}" aria-pressed="${todo.done}">
        <span class="check" aria-hidden="true"></span>
        <span class="text">${escapeHtml(todo.text)}</span>
      </button>
      <button type="button" class="todo-edit-start" data-id="${todo.id}">수정</button>
      <button type="button" class="todo-delete" data-id="${todo.id}">삭제</button>
    </li>
  `;
}

function daySection(todos, section) {
  const items = todosForSection(todos, section.weekday);
  const openTodos = items.filter((todo) => !todo.done);
  const doneTodos = items.filter((todo) => todo.done);
  const dateLabel = dateForWeekday(section.weekday);
  const isToday = section.weekday === todayWeekday();
  if (items.length === 0 && !isToday) return "";

  return `
    <section class="day${isToday ? " today" : ""}">
      <h2>
        ${section.label}
        ${isToday ? `<em>오늘</em>` : ""}
        ${dateLabel ? `<span>${dateLabel}</span>` : ""}
      </h2>
      ${
        items.length === 0
          ? `<p class="empty-day">오늘은 비어 있습니다.</p>`
          : `<ul class="list">${openTodos.map(todoItem).join("")}${doneTodos.map(todoItem).join("")}</ul>`
      }
    </section>
  `;
}

function render() {
  const stored = loadTodos();
  const todos = thisWeekTodos(stored);
  const leftover = leftoverTodos(stored);

  app.innerHTML = `
    <main class="sheet">
      <header class="masthead">
        <p class="eyebrow">Weekly desk</p>
        <h1>이번 주</h1>
        <p class="range">${formatWeekRange()}</p>
      </header>

      <form class="composer" autocomplete="off">
        <label class="sr-only" for="todo-text">할 일</label>
        <input
          id="todo-text"
          name="text"
          type="text"
          maxlength="80"
          placeholder="이번 주에 할 일을 적고 Enter"
        />
        <label class="sr-only" for="todo-weekday">요일</label>
        <select id="todo-weekday" name="weekday">
          ${weekdayOptions(todayWeekday())}
        </select>
        <button type="submit">추가</button>
      </form>

      ${
        leftover.length === 0
          ? ""
          : `
            <p class="carry-over">
              지난주에서 넘길 할 일 ${leftover.length}개
              <button type="button" class="carry-over-run">이번 주로 넘기기</button>
            </p>
          `
      }

      <div class="board" aria-live="polite">
        ${
          todos.length === 0
            ? `<p class="empty">아직 할 일이 없습니다. 위에 하나 적어 보세요.</p>`
            : DAY_SECTIONS.map((section) => daySection(todos, section)).join("")
        }
      </div>

      <footer class="backup">
        <button type="button" class="backup-export">내보내기</button>
        <label class="backup-import">
          가져오기
          <input type="file" accept="application/json,.json" />
        </label>
        ${notice ? `<span class="backup-notice">${escapeHtml(notice)}</span>` : ""}
      </footer>
    </main>
  `;

  notice = "";

  app.querySelector(".composer").addEventListener("submit", onAdd);
  app
    .querySelector(".carry-over-run")
    ?.addEventListener("click", onCarryOver);
  app.querySelectorAll(".todo-toggle").forEach((button) => {
    button.addEventListener("click", onToggle);
  });
  app.querySelectorAll(".todo-edit-start").forEach((button) => {
    button.addEventListener("click", onStartEdit);
  });
  app.querySelectorAll(".todo-edit").forEach((form) => {
    form.addEventListener("submit", onSaveEdit);
  });
  app.querySelectorAll(".todo-cancel").forEach((button) => {
    button.addEventListener("click", onCancelEdit);
  });
  app.querySelectorAll(".todo-delete").forEach((button) => {
    button.addEventListener("click", onDelete);
  });
  app.querySelector(".backup-export").addEventListener("click", onExport);
  app
    .querySelector(".backup-import input")
    .addEventListener("change", onImport);

  const editInput = app.querySelector(".todo-edit input");
  if (editInput) {
    editInput.focus();
    editInput.select();
    editInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") onCancelEdit();
    });
    return;
  }

  app.querySelector("#todo-text").focus();
}

function onAdd(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const text = form.elements.text.value.trim();
  if (!text) return;

  const todos = loadTodos();
  todos.push({
    id: createId(),
    text,
    done: false,
    weekday: parseWeekday(form.elements.weekday.value),
    weekStart: thisWeekKey,
    createdAt: new Date().toISOString(),
  });
  saveTodos(todos);
  render();
}

function onExport() {
  const blob = new Blob([JSON.stringify(loadTodos(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `weekly-desk-${toLocalDateKey(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function onImport(event) {
  const input = event.currentTarget;
  const file = input.files[0];
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed)) throw new Error("목록이 아닙니다.");

    const todos = parsed.filter(
      (item) =>
        item && typeof item.id === "string" && typeof item.text === "string",
    );
    if (todos.length === 0) throw new Error("가져올 할 일이 없습니다.");

    if (window.confirm(`할 일 ${todos.length}개로 덮어씁니다. 계속할까요?`)) {
      saveTodos(todos);
      editingId = null;
      notice = `${todos.length}개를 가져왔습니다.`;
    }
  } catch {
    notice = "가져오지 못했습니다. 내보낸 파일인지 확인해 주세요.";
  }

  input.value = "";
  render();
}

function onCarryOver() {
  const leftoverIds = new Set(leftoverTodos(loadTodos()).map((todo) => todo.id));
  const todos = loadTodos().map((todo) =>
    leftoverIds.has(todo.id) ? { ...todo, weekStart: thisWeekKey } : todo,
  );
  saveTodos(todos);
  render();
}

function onToggle(event) {
  const id = event.currentTarget.dataset.id;
  const todos = loadTodos().map((todo) =>
    todo.id === id ? { ...todo, done: !todo.done } : todo,
  );
  saveTodos(todos);
  render();
}

function onDelete(event) {
  const id = event.currentTarget.dataset.id;
  const todos = loadTodos().filter((todo) => todo.id !== id);
  saveTodos(todos);
  if (editingId === id) editingId = null;
  render();
}

function onStartEdit(event) {
  editingId = event.currentTarget.dataset.id;
  render();
}

function onCancelEdit() {
  editingId = null;
  render();
}

function onSaveEdit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.dataset.id;
  const text = form.elements.text.value.trim();
  if (!text) return;

  const todos = loadTodos().map((todo) =>
    todo.id === id
      ? { ...todo, text, weekday: parseWeekday(form.elements.weekday.value) }
      : todo,
  );
  saveTodos(todos);
  editingId = null;
  render();
}

render();
