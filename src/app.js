const STORAGE_KEY = "weekly-todos";

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

const app = document.querySelector("#app");
const thisWeekKey = toLocalDateKey(startOfWeek());
let editingId = null;

function thisWeekTodos(todos) {
  return todos.filter((todo) => todo.weekStart === thisWeekKey);
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

function render() {
  const todos = thisWeekTodos(loadTodos());
  const openTodos = todos.filter((todo) => !todo.done);
  const doneTodos = todos.filter((todo) => todo.done);

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
        <button type="submit">추가</button>
      </form>

      <section class="board" aria-live="polite">
        ${
          todos.length === 0
            ? `<p class="empty">아직 할 일이 없습니다. 위에 하나 적어 보세요.</p>`
            : `
              <ul class="list">
                ${openTodos.map(todoItem).join("")}
                ${doneTodos.map(todoItem).join("")}
              </ul>
            `
        }
      </section>
    </main>
  `;

  app.querySelector(".composer").addEventListener("submit", onAdd);
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
  const input = event.currentTarget.elements.text;
  const text = input.value.trim();
  if (!text) return;

  const todos = loadTodos();
  todos.push({
    id: createId(),
    text,
    done: false,
    weekStart: thisWeekKey,
    createdAt: new Date().toISOString(),
  });
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
  const id = event.currentTarget.dataset.id;
  const text = event.currentTarget.elements.text.value.trim();
  if (!text) return;

  const todos = loadTodos().map((todo) =>
    todo.id === id ? { ...todo, text } : todo,
  );
  saveTodos(todos);
  editingId = null;
  render();
}

render();
