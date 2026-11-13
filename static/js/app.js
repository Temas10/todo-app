/* ============================================================
   TaskFlow — клиентская логика
   - Загрузка, добавление, отметка, удаление задач через REST API
   - Фильтры и поиск (клиентские)
   - Тёмная/светлая тема с сохранением в localStorage
   ============================================================ */

(() => {
  "use strict";

  const API_BASE = "/api";
  const STORAGE_THEME = "taskflow-theme";

  const state = {
    tasks: [],
    filter: "all",
    search: "",
    loading: false,
  };

  // ----------  DOM references  ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    form: $("#taskForm"),
    input: $("#taskInput"),
    list: $("#taskList"),
    template: $("#taskTemplate"),
    empty: $("#emptyState"),
    error: $("#errorBanner"),
    count: $("#taskCount"),
    clear: $("#clearCompleted"),
    search: $("#searchInput"),
    filters: document.querySelectorAll(".filter-btn"),
    themeToggle: $("#themeToggle"),
  };

  // ============================================================
  //  Theme
  // ============================================================
  function initTheme() {
    const saved = localStorage.getItem(STORAGE_THEME);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_THEME, next);
  }

  // ============================================================
  //  API helpers
  // ============================================================
  async function api(method, path, body) {
    const opts = { method, headers: { "Accept": "application/json" } };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        if (err.detail) detail = Array.isArray(err.detail) ? err.detail.map((e) => e.msg).join(", ") : String(err.detail);
      } catch (_) { /* ignore */ }
      throw new Error(detail);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function showError(message) {
    els.error.textContent = `⚠ ${message}`;
    els.error.classList.remove("hidden");
    clearTimeout(showError._t);
    showError._t = setTimeout(() => els.error.classList.add("hidden"), 4000);
  }

  function clearError() {
    els.error.classList.add("hidden");
  }

  // ============================================================
  //  CRUD operations
  // ============================================================
  async function loadTasks() {
    state.loading = true;
    try {
      state.tasks = await api("GET", "/tasks");
      clearError();
    } catch (err) {
      showError(`Не удалось загрузить задачи: ${err.message}`);
      state.tasks = [];
    } finally {
      state.loading = false;
      render();
    }
  }

  async function addTask(title) {
    const trimmed = title.trim();
    if (!trimmed) return;
    els.input.disabled = true;
    try {
      const created = await api("POST", "/tasks", { title: trimmed });
      state.tasks.unshift(created);
      clearError();
    } catch (err) {
      showError(`Не удалось добавить задачу: ${err.message}`);
    } finally {
      els.input.disabled = false;
      render();
      els.input.focus();
    }
  }

  async function toggleTask(id, completed) {
    // Optimistic update for instant feedback
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = completed;
    render();
    try {
      await api("PATCH", `/tasks/${id}`, { completed });
      clearError();
    } catch (err) {
      task.completed = !completed; // rollback
      showError(`Не удалось обновить задачу: ${err.message}`);
      render();
    }
  }

  async function deleteTask(id) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    // Animate out, then remove
    const node = els.list.querySelector(`[data-id="${id}"]`);
    if (node) node.classList.add("removing");
    const removeFromState = () => {
      state.tasks = state.tasks.filter((t) => t.id !== id);
      render();
    };
    if (node) {
      setTimeout(removeFromState, 240);
    } else {
      removeFromState();
    }
    try {
      await api("DELETE", `/tasks/${id}`);
      clearError();
    } catch (err) {
      showError(`Не удалось удалить задачу: ${err.message}`);
      loadTasks(); // resync to be safe
    }
  }

  async function clearCompleted() {
    const before = state.tasks.length;
    try {
      await api("DELETE", "/tasks?completed=true");
      state.tasks = state.tasks.filter((t) => !t.completed);
      clearError();
      render();
      if (before === state.tasks.length) {
        // nothing happened, still fine
      }
    } catch (err) {
      showError(`Не удалось очистить: ${err.message}`);
    }
  }

  // ============================================================
  //  Rendering
  // ============================================================
  function getVisibleTasks() {
    return state.tasks.filter((t) => {
      if (state.filter === "active" && t.completed) return false;
      if (state.filter === "completed" && !t.completed) return false;
      if (state.search) {
        const q = state.search.toLowerCase();
        if (!t.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return "";
    }
  }

  function render() {
    const visible = getVisibleTasks();
    els.list.innerHTML = "";

    if (visible.length === 0) {
      els.empty.classList.remove("hidden");
      els.list.classList.add("hidden");
      // Customize empty message based on filter/search
      const titleEl = els.empty.querySelector(".empty-title");
      const textEl = els.empty.querySelector(".empty-text");
      if (state.search) {
        titleEl.textContent = "Ничего не найдено";
        textEl.textContent = "Попробуйте изменить поисковый запрос.";
      } else if (state.filter === "active") {
        titleEl.textContent = "Нет активных задач";
        textEl.textContent = "Все задачи выполнены. Отличная работа!";
      } else if (state.filter === "completed") {
        titleEl.textContent = "Нет выполненных задач";
        textEl.textContent = "Отметьте задачу, чтобы она появилась здесь.";
      } else {
        titleEl.textContent = "Список пуст";
        textEl.textContent = "Добавьте первую задачу, чтобы начать.";
      }
    } else {
      els.empty.classList.add("hidden");
      els.list.classList.remove("hidden");

      visible.forEach((task) => {
        const node = els.template.content.firstElementChild.cloneNode(true);
        node.dataset.id = task.id;
        node.classList.toggle("done", task.completed);

        const check = node.querySelector(".task-check");
        check.checked = task.completed;
        check.setAttribute("aria-label", task.completed ? "Отметить как невыполненную" : "Отметить как выполненную");

        const title = node.querySelector(".task-title");
        title.textContent = task.title;
        title.title = `Создано: ${formatDate(task.created_at)}`;

        const delBtn = node.querySelector(".btn-delete");
        delBtn.addEventListener("click", () => deleteTask(task.id));
        check.addEventListener("change", () => toggleTask(task.id, check.checked));

        els.list.appendChild(node);
      });
    }

    // Update count + clear button state
    const activeCount = state.tasks.filter((t) => !t.completed).length;
    const total = state.tasks.length;
    const word = pluralize(total, "задача", "задачи", "задач");
    els.count.textContent = total === 0 ? "Задач нет" : `${activeCount} активн. · ${total} ${word}`;

    const hasCompleted = state.tasks.some((t) => t.completed);
    els.clear.disabled = !hasCompleted;
  }

  function pluralize(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  // ============================================================
  //  Event wiring
  // ============================================================
  function bindEvents() {
    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      addTask(els.input.value);
      els.input.value = "";
    });

    els.search.addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      render();
    });

    els.filters.forEach((btn) => {
      btn.addEventListener("click", () => {
        els.filters.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.filter = btn.dataset.filter;
        render();
      });
    });

    els.clear.addEventListener("click", clearCompleted);

    els.themeToggle.addEventListener("click", toggleTheme);

    // Keyboard shortcut: "/" focuses search, "n" focuses new task
    document.addEventListener("keydown", (e) => {
      const isTyping = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
      if (isTyping) return;
      if (e.key === "/") {
        e.preventDefault();
        els.search.focus();
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        els.input.focus();
      }
    });
  }

  // ============================================================
  //  Init
  // ============================================================
  function init() {
    initTheme();
    bindEvents();
    loadTasks();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
