# Как выложить сайт в интернет (для зачёта)

Сейчас сайт работает только у тебя на маке. После этой инструкции у тебя будет
ссылка типа `https://daspowear.onrender.com`, которую можно открыть с любого
устройства — препод откроет с телефона.

**Время:** 15–20 минут.
**Деньги:** бесплатно (карту привязывать не нужно).

---

## Шаг 1. GitHub — храним код

Если GitHub-аккаунта нет:
1. Зайди на https://github.com/signup
2. Зарегистрируйся (нужны email и пароль)
3. Подтверди почту

Затем:
1. https://github.com/new
2. **Repository name:** `daspowear`
3. **Public** (важно — Render требует публичные репо на бесплатном плане)
4. НЕ ставь галочки «Initialize with README»
5. **Create repository**

GitHub покажет команды. Не запускай их пока — выполни ровно эти:

Открой Терминал на маке:

```bash
cd ~/Downloads/daspowear
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ТВОЙ-ЛОГИН/daspowear.git
git push -u origin main
```

Замени `ТВОЙ-ЛОГИН` на свой ник на GitHub.

При первом `git push` Терминал запросит логин/пароль. **Пароль** — это
не пароль от аккаунта, а **Personal Access Token**:
1. https://github.com/settings/tokens
2. Generate new token (classic)
3. Note: `daspowear`, Scopes: галочка **repo**
4. Generate token → скопируй (он показывается один раз)
5. Вставь его в Терминал когда тот спросит пароль

Проверь: открой `https://github.com/ТВОЙ-ЛОГИН/daspowear` — должны быть
видны все файлы проекта (backend, frontend, README, и т.д.). Папка
`backend/.env` НЕ должна быть в репо — она в `.gitignore`.

---

## Шаг 2. Render.com — хостинг

1. https://render.com/register
2. **Войти через GitHub** (это даст Render доступ к твоим репо)
3. Authorize

---

## Шаг 3. Создаём Web Service (бэкенд + фронт)

1. Render → **+ New → Web Service**
2. Выбери репо `daspowear` (если не видишь — кликни «Configure account»
   и дай доступ к нему)
3. Заполни форму:

| Поле | Значение |
|---|---|
| **Name** | `daspowear` |
| **Region** | Frankfurt |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

4. Раскрой **Advanced** → **Add Environment Variable**:

| Key | Value |
|---|---|
| `YOOKASSA_SHOP_ID` | `1368669` |
| `YOOKASSA_SECRET_KEY` | `test_2JCMMw0KYRsTGrO8C_Is8umTgQ4gYUeSbp2UqqqsT3A` |
| `DATABASE_URL` | `sqlite:////tmp/daspowear.db` |
| `PYTHON_VERSION` | `3.11.9` |

5. **Create Web Service** внизу страницы.

6. Render начнёт сборку (3–5 минут). Смотри логи прямо в браузере.
   Когда увидишь зелёный статус **Live** — готово.

7. **Запиши свой URL** — вверху страницы. Например:
   `https://daspowear.onrender.com`

---

## Шаг 4. Прописываем return URL

После первого деплоя надо сказать ЮKassa куда возвращать пользователя.

1. В Render открой сервис **daspowear** → **Environment**
2. Добавь переменную:

| Key | Value |
|---|---|
| `RETURN_URL` | `https://daspowear.onrender.com/success.html` |

(подставь свой URL из шага 3.7)

3. **Save Changes** → бэкенд перезапустится автоматически.

---

## Готово. Проверка

1. Открой свой URL: `https://daspowear.onrender.com`
2. Первая загрузка может занять до 30 секунд — на бесплатном плане сервис
   засыпает после 15 минут неактивности. Это не баг.
3. Скролл → клик на карточку → выбор размера → корзина → оформление →
   галочка оферты → перейти к оплате → тестовая карта `1111 1111 1111 1026`
   → возврат на «Спасибо».

---

## Если что-то не работает

**Сайт вообще не открывается / 502 Bad Gateway:**
- В Render → daspowear → **Logs**. Скопируй последние строки, пришли.

**Открывается, но «Не удалось связаться с сервером»:**
- Скорее всего ещё стартует. Подожди 30 секунд, обнови.

**Оплата возвращает на localhost вместо твоего URL:**
- Не задан `RETURN_URL` в env. См. шаг 4.

---

## Что показать преподавателю

Дай ссылку и предупреди: «Первая загрузка ~30 секунд — сайт спит на
бесплатном плане, так у нас задумано чтобы укладываться в free tier».

Покажи:
1. Главную → лукбук → карточку юбки → весь поток оплаты
2. `https://daspowear.onrender.com/docs` — авто-документация FastAPI (Swagger)
3. GitHub-репо с историей коммитов
4. Личный кабинет ЮKassa → платежи (если препод поверит на слово что у тебя
   там реально появились тестовые платежи)
