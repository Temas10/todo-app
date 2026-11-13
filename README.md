# TaskFlow — Список задач (To-Do List)

Простой, аккуратный и современный менеджер задач с сохранением данных на сервере.

**Стек:** Python · FastAPI · SQLAlchemy · SQLite · ванильный HTML/CSS/JS (без сборки).

![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Возможности

- Добавление новых задач
- Отметка выполненных задач (с анимацией)
- Удаление задач (с анимацией исчезновения)
- Фильтры: **Все / Активные / Выполненные**
- Поиск по заголовку
- Очистка всех выполненных задач одной кнопкой
- **Сохранение на сервере** (SQLite) — задачи не пропадают после обновления страницы
- Тёмная / светлая тема (сохраняется в браузере)
- Адаптивный дизайн (мобильные и десктоп)
- Горячие клавиши: `/` — поиск, `N` — новая задача
- Анимированный градиентный фон и стеклянные карточки (glassmorphism)

---

## AI-инструменты

При создании проекта использовался AI-ассистент **Z.ai Code** (на базе GLM):

- **Генерация кода** — FastAPI backend (модели, схемы, роуты) и современный frontend (HTML/CSS/JS).
- **Дизайн UI/UX** — подбор цветовой палитры, glassmorphism-эффект, анимации и адаптивная вёрстка.
- **Архитектура** — структура проекта, REST API, схема БД.
- **Документация** — этот README и инструкции по деплою.

---

## Структура проекта

```
todo-app/
├── app/                  # FastAPI backend
│   ├── __init__.py
│   ├── main.py           # Точка входа, роуты, раздача статики
│   ├── database.py       # Подключение к SQLite, сессии
│   ├── models.py         # SQLAlchemy-модель Task
│   └── schemas.py        # Pydantic-схемы валидации
├── static/               # Frontend (без сборки)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── data/                 # SQLite база (создаётся автоматически, в .gitignore)
├── requirements.txt
├── Procfile              # Команда запуска для Render/Railway
├── runtime.txt           # Версия Python
├── render.yaml           # Конфиг деплоя на Render
├── .gitignore
└── README.md
```

---

## Локальный запуск

### 1. Клонирование

```bash
git clone https://github.com/ВАШ_ЛОГИН/todo-app.git
cd todo-app
```

### 2. Виртуальное окружение и зависимости

**Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Запуск сервера

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Откройте **http://localhost:8000** — это и есть ваше приложение (API + фронтенд в одном сервисе).

Документация API (Swagger UI): **http://localhost:8000/docs**

---

## REST API

| Метод   | Путь                  | Описание                              |
|---------|-----------------------|---------------------------------------|
| `GET`   | `/api/tasks`          | Список задач (опц. `?completed=true&search=foo`) |
| `POST`  | `/api/tasks`          | Создать задачу `{ "title": "..." }`   |
| `GET`   | `/api/tasks/{id}`     | Получить одну задачу                  |
| `PATCH` | `/api/tasks/{id}`     | Обновить (`title`, `description`, `completed`) |
| `DELETE`| `/api/tasks/{id}`     | Удалить задачу                        |
| `DELETE`| `/api/tasks`          | Удалить все выполненные (`?completed=true`) |
| `GET`   | `/api/stats`          | Статистика (`total`, `completed`, `active`) |
| `GET`   | `/api/health`         | Проверка работоспособности            |

**Пример создания задачи:**
```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Купить хлеб"}'
```

---

## Бесплатный хостинг

Проект настроен для деплоя в один клик на нескольких бесплатных платформах.
SQLite-файл хранится прямо в директории приложения — отдельная БД не нужна.

> ⚠️ На бесплатных тарифах файловая система может быть ephemeral (данные
> сбрасываются при перезапуске). Для постоянного хранения используйте
> подключаемую БД (PostgreSQL на Render/Supabase) — для этого достаточно
> поменять `DATABASE_URL`. Для демонстрационного проекта SQLite подойдёт.

### Вариант 1: Render (рекомендуется, самый простой)

1. Залейте проект на GitHub.
2. Зарегистрируйтесь на [render.com](https://render.com).
3. **New → Web Service → подключите репозиторий**.
4. Настройки подставятся автоматически из `render.yaml`:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** из `Procfile`
   - **Environment:** Python 3
5. Нажмите **Create Web Service** — через пару минут получите публичный URL.

### Вариант 2: Railway

1. Залейте проект на GitHub.
2. На [railway.app](https://railway.app) создайте проект из репозитория.
3. Railway сам определит Python-приложение и использует `Procfile`.
4. После деплоя во вкладке **Settings → Networking** сгенерируйте домен.

### Вариант 3: Fly.io

```bash
# Установите flyctl: https://fly.io/docs/hands-on/install-flyctl/
fly launch          # следуйте подсказкам, используйте Dockerfile по умолчанию
fly deploy
```

### Вариант 4: PythonAnywhere

1. Создайте аккаунт на [pythonanywhere.com](https://www.pythonanywhere.com).
2. Загрузите код (через GitHub или файлы).
3. Создайте Web app → **Manual configuration → Python 3.12**.
4. Установите зависимости: `pip install -r requirements.txt` в Bash console.
5. В WSGI-файле укажите путь к `app.main:app`.

---

## Как это работает (коротко)

1. Frontend (`static/`) — единая HTML-страница с CSS и JS, обращается к `/api/tasks` через `fetch`.
2. Backend (`app/main.py`) — FastAPI приложение с REST-эндпоинтами и раздачей статики.
3. Данные — SQLite-файл `data/todo.db`, создаётся автоматически при первом запуске.
4. При перезагрузке страницы фронтенд снова запрашивает `/api/tasks` — задачи остаются на месте.

---

## Лицензия

MIT — используйте и модифицируйте свободно.
