# Implementation Plan: Auth + Forecast & Alerts

Two features for the finance-hledger project. Each step lists files, dependencies, effort, and a test plan.

---

## Feature 1: Simple Password Authentication

YAGNI approach: two env-var passwords, HMAC-signed tokens, single FastAPI dependency. No JWT library needed — use `hmac` + `hashlib` from stdlib.

### Token strategy

Generate a deterministic token: `HMAC-SHA256(secret_key, username)` encoded as hex. The secret key is a server-side `TOKEN_SECRET` env var (or derived from the passwords themselves). The token never expires (it's a homelab). The backend maps token → username by recomputing the HMAC for each known user.

**Simpler alternative (even more YAGNI):** Store tokens in an in-memory dict at login time. Token = `secrets.token_hex(32)`. Map `{token: username}` in memory. Tokens last until server restart (fine for a systemd service). No crypto gymnastics.

→ **Decision: in-memory token store.** Simpler, no deps, tokens last across requests (service rarely restarts).

---

### Step 1.1: Backend — Auth config and login endpoint
**Files:** `backend/main.py`
**Effort:** ~40 min
**Dependencies:** None

**Changes:**
1. Add imports: `import secrets`, `import hmac` (for constant-time compare)
2. Read env vars at module level:
   ```python
   USERS = {}
   _lucas_pw = os.environ.get("PASSWORD_LUCAS")
   _gio_pw = os.environ.get("PASSWORD_GIO")
   if _lucas_pw:
       USERS["lucas"] = _lucas_pw
   if _gio_pw:
       USERS["gio"] = _gio_pw
   AUTH_ENABLED = bool(USERS)
   ```
3. Create in-memory token store:
   ```python
   _tokens: dict[str, str] = {}  # token -> username
   ```
4. Add `POST /api/login` endpoint:
   - Accepts JSON body `{"password": "..."}`
   - Iterates `USERS` dict, uses `hmac.compare_digest` to check password
   - On match: generates `secrets.token_hex(32)`, stores in `_tokens`, returns `{"token": "...", "user": "lucas"}`
   - On no match: returns 401 `{"detail": "Senha incorreta"}`
   - Add `POST` to CORS `allow_methods`

**Test plan:**
```bash
# Without env vars → AUTH_ENABLED=False, all routes open (backwards compatible)
export PASSWORD_LUCAS=abc123 PASSWORD_GIO=xyz789
uvicorn main:app --port 8080
# Login with wrong password → 401
curl -X POST localhost:8080/api/login -H 'Content-Type: application/json' -d '{"password":"wrong"}'
# Login with correct password → 200 + token
curl -X POST localhost:8080/api/login -H 'Content-Type: application/json' -d '{"password":"abc123"}'
# Use token on protected route
curl localhost:8080/api/summary -H 'Authorization: Bearer <token>'
```

---

### Step 1.2: Backend — Auth dependency/middleware
**Files:** `backend/main.py`
**Effort:** ~30 min
**Dependencies:** Step 1.1

**Changes:**
1. Add FastAPI `Depends` import, create auth dependency:
   ```python
   from fastapi import Depends, Header

   def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
       """Valida token do header Authorization. Retorna username ou None."""
       if not AUTH_ENABLED:
           return None  # auth desligado — passa direto
       if not authorization:
           raise HTTPException(401, "Token necessário")
       # Aceita "Bearer <token>" ou só "<token>"
       token = authorization.removeprefix("Bearer ").strip()
       user = _tokens.get(token)
       if not user:
           raise HTTPException(401, "Token inválido")
       return user
   ```
2. Apply to **existing** endpoints by adding `user: Optional[str] = Depends(get_current_user)` to each handler. Since `get_current_user` returns `None` when auth is disabled, existing behavior is preserved.
   - Alternative: use FastAPI `APIRouter` with a dependency — but that's more refactoring for a single file. Per-endpoint `Depends` is simpler and explicit.
3. Exclude `/api/login`, `/api/health` from auth (they don't have the dependency).
4. Exclude static files and SPA catch-all (they aren't API endpoints).

**Test plan:**
```bash
# Auth disabled (no env vars) → all routes work without token
# Auth enabled → /api/summary without token → 401
# Auth enabled → /api/summary with valid token → 200
# /api/health works without token always
# /api/login works without token always
# Frontend SPA loads fine without token (static files not affected)
```

---

### Step 1.3: Frontend — Login screen and auth context
**Files:** `frontend/src/api.js`, `frontend/src/Dashboard.jsx`, new file `frontend/src/Login.jsx`
**Effort:** ~50 min
**Dependencies:** Step 1.2

**Changes:**

1. **`api.js`** — Modify `useApi` and `fetchCategoryDetail` to include auth header:
   ```js
   function authHeaders() {
     const token = localStorage.getItem('token');
     return token ? { Authorization: `Bearer ${token}` } : {};
   }
   ```
   - Add `headers: authHeaders()` to all fetch calls
   - On 401 response: clear token, trigger re-render to show login
   - Export a helper: `export function getToken() { return localStorage.getItem('token'); }`

2. **`Login.jsx`** (new, ~50 lines) — Simple centered form:
   - Password input + submit button
   - Calls `POST /api/login` with `{"password": value}`
   - On success: stores `token` and `user` in localStorage, calls `onLogin()` callback
   - On error: shows "Senha incorreta" message
   - Matches existing dark theme styling (bg `#1a1816`, card `#252220`, accent `#d4a574`)

3. **`Dashboard.jsx`** — Wrap with auth state:
   ```jsx
   const [token, setToken] = useState(localStorage.getItem('token'));
   if (!token) return <Login onLogin={() => setToken(localStorage.getItem('token'))} />;
   ```
   - Show logged-in user name in header (small text next to "Visão familiar")
   - Optional: add a logout button that clears localStorage and resets state

**Test plan:**
```bash
npm run dev
# First visit → login screen
# Enter wrong password → error message
# Enter correct password → dashboard loads
# Refresh page → stays logged in (localStorage)
# Open DevTools → clear localStorage → refresh → login screen again
```

---

### Step 1.4: Systemd service — Add env vars
**Files:** systemd unit file on `10.0.0.110`
**Effort:** ~5 min
**Dependencies:** Step 1.1

**Changes:**
Add to the `[Service]` section:
```
Environment=PASSWORD_LUCAS=<actual_password>
Environment=PASSWORD_GIO=<actual_password>
```
Then `systemctl --user daemon-reload && systemctl --user restart finance-hledger`.

**Test plan:**
```bash
ssh 10.0.0.110 "systemctl --user status finance-hledger"
# Verify env vars: ssh 10.0.0.110 "systemctl --user show finance-hledger -p Environment"
# Test login from outside: curl -X POST https://<tailscale-ip>/api/login ...
```

---

### Feature 1 summary

| Step | Effort | Deps |
|------|--------|------|
| 1.1 Backend login | 40 min | — |
| 1.2 Backend auth middleware | 30 min | 1.1 |
| 1.3 Frontend login | 50 min | 1.2 |
| 1.4 Systemd env vars | 5 min | 1.1 |
| **Total** | **~2 h** | |

**Backwards compatibility:** When `PASSWORD_LUCAS` and `PASSWORD_GIO` are not set, `AUTH_ENABLED=False` and all endpoints work exactly as before. Zero breakage.

---

## Feature 2: Fase 3 — Forecast & Alerts

All new endpoints follow the existing pattern: shell out to hledger CLI, parse JSON, return Portuguese-keyed JSON.

---

### Step 2.1: Backend — `/api/forecast` endpoint
**Files:** `backend/main.py`
**Effort:** ~45 min
**Dependencies:** None

**Changes:**
1. Add `months_forward_bounds(n)` helper (mirrors `months_back_bounds` but forward):
   ```python
   def months_forward_bounds(n: int) -> tuple[str, str]:
       """Retorna (hoje, hoje + n meses) em ISO."""
       begin = date.today().replace(day=1).isoformat()
       end = date.today()
       for _ in range(n):
           if end.month == 12:
               end = end.replace(year=end.year + 1, month=1)
           else:
               end = end.replace(month=end.month + 1)
       return begin, end.isoformat()
   ```

2. Add `/api/forecast` endpoint:
   ```python
   @app.get("/api/forecast")
   def forecast(months: int = 6, user: Optional[str] = Depends(get_current_user)):
       """Projeção de saldo N meses à frente baseada em transações periódicas."""
       begin, end = months_forward_bounds(months)
       data = hledger("incomestatement", "-M", "--forecast",
                      "-b", begin, "-e", end)
       # Parse identically ao /api/cashflow — mesma estrutura cbrSubreports
       result = []
       if isinstance(data, dict):
           cbr_dates = data.get("cbrDates", [])
           subreports = data.get("cbrSubreports", [])
           revenues_report = expenses_report = None
           for sub in subreports:
               title = (sub[0] if isinstance(sub, list) else "").lower()
               report = sub[1] if isinstance(sub, list) else {}
               if "revenue" in title or "income" in title:
                   revenues_report = report
               elif "expense" in title:
                   expenses_report = report

           for period_idx, date_range in enumerate(cbr_dates):
               first_date = date_range[0] if isinstance(date_range, list) else date_range
               date_str = first_date.get("contents", "") if isinstance(first_date, dict) else str(first_date)
               mes = date_str[:7]
               receitas = despesas = 0.0
               if revenues_report and "prRows" in revenues_report:
                   for row in revenues_report["prRows"]:
                       amounts = row.get("prrAmounts", [])
                       if period_idx < len(amounts) and amounts[period_idx]:
                           receitas += abs(float(amounts[period_idx][0].get("aquantity", {}).get("floatingPoint", 0)))
               if expenses_report and "prRows" in expenses_report:
                   for row in expenses_report["prRows"]:
                       amounts = row.get("prrAmounts", [])
                       if period_idx < len(amounts) and amounts[period_idx]:
                           despesas += abs(float(amounts[period_idx][0].get("aquantity", {}).get("floatingPoint", 0)))
               result.append({
                   "mes": mes,
                   "receitas": round(receitas, 2),
                   "despesas": round(despesas, 2),
                   "saldo": round(receitas - despesas, 2),
               })
       return {"months": result, "forecast": True}
   ```

   This mirrors `/api/cashflow` almost exactly — the only difference is `--forecast` flag and forward-looking dates. The periodic transactions (`~ monthly`) in the journal define the template.

**Test plan:**
```bash
export LEDGER_FILE=~/kbm/personal/finance/main.journal
curl 'localhost:8080/api/forecast?months=6'
# Verify: months array with projected receitas/despesas/saldo
# Verify: future months only (starting from current month)
# Verify: hledger --forecast produces non-zero values (requires ~ periodic txns)
```

---

### Step 2.2: Backend — `/api/alerts` endpoint
**Files:** `backend/main.py`
**Effort:** ~50 min
**Dependencies:** None

**Changes:**
1. Add helper to get per-category spending for a given month:
   ```python
   def _category_spending(month: str) -> dict[str, float]:
       """Retorna {categoria: valor} de despesas do mês."""
       begin, end = month_bounds(month)
       data = hledger("balance", "expenses", "--depth=2",
                      "-b", begin, "-e", end, "--layout=bare")
       cats = {}
       if isinstance(data, list) and len(data) >= 1:
           for row in data[0]:
               if isinstance(row, list) and len(row) >= 4:
                   name = row[0].split(":")[-1] if isinstance(row[0], str) else str(row[0])
                   amount = abs(_amount({"amount": row[3]})) if isinstance(row[3], list) else 0
                   if amount > 0:
                       cats[name.lower()] = amount
       return cats
   ```

2. Add `/api/alerts` endpoint:
   ```python
   @app.get("/api/alerts")
   def alerts(month: Optional[str] = None, user: Optional[str] = Depends(get_current_user)):
       """Alertas: categorias com gasto >25% acima da média dos últimos 3 meses."""
       target_month = month or date.today().strftime("%Y-%m")
       target_spending = _category_spending(target_month)

       # Média dos 3 meses anteriores
       historical: dict[str, list[float]] = {}
       for i in range(1, 4):
           hist_month = add_month_str(target_month, -i)
           hist_spending = _category_spending(hist_month)
           for cat, val in hist_spending.items():
               historical.setdefault(cat, []).append(val)

       alertas = []
       for cat, current in target_spending.items():
           hist_vals = historical.get(cat, [])
           if len(hist_vals) < 2:
               continue  # precisa de pelo menos 2 meses de histórico
           avg = sum(hist_vals) / len(hist_vals)
           if avg <= 0:
               continue
           pct_above = ((current - avg) / avg) * 100
           if pct_above > 25:
               alertas.append({
                   "categoria": cat.capitalize(),
                   "atual": round(current, 2),
                   "media": round(avg, 2),
                   "percentual_acima": round(pct_above, 1),
                   "mensagem": f"{cat.capitalize()} está {round(pct_above)}% acima da média (R$ {current:.2f} vs R$ {avg:.2f}/mês)",
               })

       alertas.sort(key=lambda a: a["percentual_acima"], reverse=True)
       return {"month": target_month, "alertas": alertas}
   ```

3. Need a small `add_month_str(ym, delta)` helper for Python (similar to the JS one):
   ```python
   def add_month_str(ym: str, delta: int) -> str:
       y, m = map(int, ym.split("-"))
       m += delta
       while m > 12: m -= 12; y += 1
       while m < 1: m += 12; y -= 1
       return f"{y:04d}-{m:02d}"
   ```

**Test plan:**
```bash
curl 'localhost:8080/api/alerts?month=2026-04'
# Expected: list of alert objects for categories >25% above 3-month average
# Edge cases: month with no data → empty alertas list
# Edge cases: first 2 months of journal → insufficient history, returns []
```

---

### Step 2.3: Backend — `/api/seasonality` endpoint
**Files:** `backend/main.py`
**Effort:** ~45 min
**Dependencies:** None

**Changes:**
1. Add `/api/seasonality` endpoint:
   ```python
   @app.get("/api/seasonality")
   def seasonality(months: int = 12, user: Optional[str] = Depends(get_current_user)):
       """Matriz mês × categoria para heatmap de sazonalidade."""
       begin, end = months_back_bounds(months - 1)
       # Usar balance expenses -M --depth=2 para pegar gastos por categoria por mês
       data = hledger("balance", "expenses", "--depth=2", "-M",
                      "-b", begin, "-e", end, "--layout=bare")

       # Precisamos de uma matriz: [{mes: "2026-01", categorias: {Alimentação: 1200, ...}}, ...]
       # Infelizmente hledger balance -M --layout=bare retorna uma tabela plana,
       # não separa por mês facilmente. Alternativa: usar register com --output-format=json
       # e agrupar manualmente, OU rodar balance para cada mês individualmente.

       # Abordagem mais robusta: usar hledger register + grouping
       # hledger register expenses -M --output-format=json dá transações com período
       # Mas register JSON é mais complexo de parsear.

       # Abordagem YAGNI: iterar mês a mês (≤12 chamadas, rápido o suficiente)
       import calendar
       matrix = []
       start = date.today().replace(day=1)
       for i in range(months - 1, -1, -1):
           m_date = start
           for _ in range(i):
               m_date = (m_date - timedelta(days=1)).replace(day=1)
           ym = m_date.strftime("%Y-%m")
           spending = _category_spending(ym)  # reutiliza helper do Step 2.2
           matrix.append({"mes": ym, "categorias": spending})

       # Coleta todas as categorias únicas
       all_cats = set()
       for row in matrix:
           all_cats.update(row["categorias"].keys())

       return {
           "categorias": sorted(all_cats),
           "meses": matrix,
       }
   ```

   **Note:** The naive approach (12 hledger calls) is fine for ≤12 months. Each call is ~50ms. If we ever need 24+ months, we can optimize with a single `register` call, but YAGNI.

**Test plan:**
```bash
curl 'localhost:8080/api/seasonality?months=12'
# Verify: categorias array with all unique category names
# Verify: meses array with 12 entries, each having {mes: "YYYY-MM", categorias: {...}}
# Verify: values match individual /api/categories?month=YYYY-MM calls
```

---

### Step 2.4: Frontend — Forecast tab
**Files:** `frontend/src/Dashboard.jsx`, `frontend/src/api.js`
**Effort:** ~60 min
**Dependencies:** Step 2.1

**Changes:**
1. **`api.js`** — No changes needed; `useApi` already handles generic paths.

2. **`Dashboard.jsx`**:
   - Add `'previsão'` to the tab list: `['resumo', 'fluxo', 'orçamento', 'previsão', 'transações']`
   - Create `<Previsao />` component (~100 lines):
     - Uses `useApi('/api/forecast?months=12')` to get projected data
     - Renders a `LineChart` with 3 lines: receitas (green), despesas (red), saldo (blue)
     - Dashed line style for forecast months vs solid for historical (merge with cashflow data for "actual + forecast" view)
     - **Simpler approach:** just show forecast months in the chart with a visual divider at "today"
     - Show summary: "Saldo projetado em 6 meses: R$ X"
   - Reuse existing chart styling (Recharts, same palette)

3. **Alerts banner on Resumo tab**:
   - In `<Resumo />`, add `useApi('/api/alerts?month=' + selectedMonth)`
   - If `alertas.length > 0`, render a banner above the summary cards:
     ```jsx
     {alertas.map(a => (
       <div key={a.categoria} style={{ background: '#3a2020', border: '1px solid #5a3030', borderRadius: 4, padding: '12px 16px', marginBottom: 8 }}>
         <AlertCircle size={14} style={{ marginRight: 8 }} />
         {a.mensagem}
       </div>
     ))}
     ```

**Test plan:**
```bash
npm run dev
# Click "previsão" tab → line chart with projected monthly data
# Check "resumo" tab → alert banners if any category is over budget trend
# Verify chart matches existing style (dark theme, Recharts)
```

---

### Step 2.5: Frontend — Seasonality heatmap
**Files:** `frontend/src/Dashboard.jsx`
**Effort:** ~50 min
**Dependencies:** Step 2.3

**Changes:**
1. Add `<Sazonalidade />` component inside the forecast tab (or as a sub-section):
   - Uses `useApi('/api/seasonality?months=12')`
   - Renders a CSS grid heatmap: rows = categories, columns = months
   - Cell color intensity = spending amount (darker = higher)
   - Use inline styles with a simple color scale: `rgba(212, 165, 116, opacity)` where opacity = `value / max_value`
   - Show values on hover (title tooltip)
   - Month labels in Portuguese (Jan, Fev, Mar...)

2. Layout:
   ```
   |             | Jan | Fev | Mar | ... | Dez |
   |-------------|-----|-----|-----|-----|-----|
   | Alimentação | ███ | ██  | ████| ... | ██  |
   | Transporte  | █   | ██  | █   | ... | ███ |
   | ...         |     |     |     |     |     |
   ```

3. Place below the forecast chart in the "previsão" tab, or add a separate 'sazonalidade' tab if it gets too crowded.

**Test plan:**
```bash
npm run dev
# Previsão tab → heatmap grid below the chart
# Verify: cells show color intensity matching spending
# Verify: IPVA shows up heavier in January (if applicable)
# Verify: hover shows exact R$ value
```

---

### Step 2.6: Category budget goals (stretch — optional)
**Files:** `backend/main.py`, `frontend/src/Dashboard.jsx`
**Effort:** ~40 min
**Dependencies:** Step 2.2

**From roadmap:** "Metas por categoria — reduzir delivery pra R$ 400/mês, progresso ao longo do tempo"

**Changes:**
1. **Backend:** Extend `/api/budget` or add `/api/category-goals`:
   - Reuse existing budget data (the `~ monthly` periodic transactions already define category budgets)
   - Add a `progress` field comparing current month vs target
   - Add historical trend: last 6 months of realized vs budgeted per category

2. **Frontend:** In the budget tab, add a small sparkline or trend arrow per category showing whether spending is trending up/down vs target.

**This is stretch scope — defer if Feature 2 core (Steps 2.1–2.5) is sufficient.**

**Test plan:** Same as budget endpoint but with added trend data.

---

### Feature 2 summary

| Step | Effort | Deps |
|------|--------|------|
| 2.1 Forecast endpoint | 45 min | — |
| 2.2 Alerts endpoint | 50 min | — |
| 2.3 Seasonality endpoint | 45 min | — |
| 2.4 Frontend forecast + alerts | 60 min | 2.1, 2.2 |
| 2.5 Frontend heatmap | 50 min | 2.3 |
| 2.6 Category goals (stretch) | 40 min | 2.2 |
| **Total** | **~4.5 h** | |

---

## Deployment sequence

1. Feature 1 first (auth) — it protects all existing endpoints too
2. Feature 2 endpoints can be developed in parallel (no auth dependency for backend logic)
3. Deploy order:
   - Merge Feature 1 backend → test with curl
   - Merge Feature 1 frontend → build, test in browser
   - Merge Feature 2 backend endpoints → test with curl
   - Merge Feature 2 frontend → build, test in browser
   - Update systemd env vars on 10.0.0.110

## Notes

- Code comments in Portuguese to match existing codebase
- All endpoints add `user: Optional[str] = Depends(get_current_user)` for future per-user filtering
- No new Python dependencies — everything uses stdlib (`secrets`, `hmac`, `hashlib`)
- No new npm dependencies — Recharts already has everything needed for charts
- The `_category_spending` helper from Step 2.2 is reused by both Alerts (2.2) and Seasonality (2.3)
