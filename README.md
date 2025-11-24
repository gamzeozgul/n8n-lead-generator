## Lead Gen Dashboard (Free, API-keyless) – Overpass/OSM + n8n + Next.js

This project collects local business leads without paid APIs using OpenStreetMap's Overpass API, processes them in n8n, and displays/exports results from a Next.js dashboard.

### Tech Stack
- **Backend/Workflow:** n8n (workflow automation)
- **Data Source:** Overpass API (OpenStreetMap, free, no API key)
- **Frontend:** Next.js 15, React 19, TypeScript
- **Export:** CSV download, Google Sheets API (optional)
- **Deployment:** Vercel (frontend), n8n Cloud or self-hosted

### What you get
- Free data source (Overpass, no API key)
- n8n workflow built manually in UI (no JSON import)
- Input validation, clean normalization, dedupe
- Optional limit/offset (pseudo pagination)
- CSV export and Google Sheets append
- Next.js UI + Vercel deploy

### Screenshots

**Frontend Dashboard:**
![Frontend Dashboard](screenshots/Frontend%20Dashboard.png)
*Search interface with city autocomplete, category selection, and real-time results*

**n8n Workflow:**
![n8n Workflow](screenshots/n8n%20Workflow.png)
*Complete workflow showing data flow from webhook to Google Sheets*

**Google Sheets Export:**
![Google Sheets Export](screenshots/Google%20Sheets%20Export.png)
*Automated data export with proper formatting and timestamps*

---

## Quick Start

1. **Clone and setup:**
   ```bash
   cd n8n-projects/lead-gen-dashboard
   cd frontend && npm install && cd ..
   ```

2. **Start n8n:**
   ```bash
   npx n8n@latest start
   ```
   Open `http://localhost:5678` and import workflow from `workflows/leadgen-overpass.json`

3. **Start frontend:**
   ```bash
   cd frontend && npm run dev
   ```
   Open `http://localhost:3000`

4. **Optional:** Set up Google Sheets export (see section 2 below)

5. **Run tests:**
   ```bash
   cd frontend
   npm install
   npm test
   ```

---

## 1) n8n – Build workflow in UI (manual, no imports)

Create a new workflow and name it: `leadgen-overpass`.

1. Node: Webhook (Trigger)
   - Path: `lead-generation`
   - Methods: `POST, OPTIONS`
   - Response: Keep default (we’ll respond later)
   - CORS: Enable in final Respond nodes (see step 6)

2. Node: Code – Normalize Input
   - Purpose: Validate and extract `city` and `category`, plus optional `limit` and `offset`.
   - Code:
   ```javascript
   const body = $json.body ?? $json;
   const city = (body.city || "").toString().trim();
   const category = (body.category || "").toString().trim();
   const limit = Math.max(1, Math.min(parseInt(body.limit ?? '20', 10) || 20, 100));
   const offset = Math.max(0, parseInt(body.offset ?? '0', 10) || 0);

   if (!city || !category) {
     return [{ json: { _error: true, status: 400, message: "city and category are required" } }];
   }

   return [{ json: { city, category, limit, offset } }];
   ```

3. Node: IF – Input Error?
   - Condition: `{{$json._error === true}}`
   - True → go to Respond (Error)
   - False → go to Build Query

4. Node: Code – Build Overpass Query
   - Purpose: Map `category` to OSM tags, build Overpass QL using the city name.
   - Code:
   ```javascript
   // Minimal tag map – extend as needed
   const category = $json.category.toLowerCase();
   const city = $json.city;
   const limit = $json.limit;
   const offset = $json.offset;

   const tagMap = {
     "coffee": ["amenity=cafe", "amenity=coffee_shop"],
     "restaurant": ["amenity=restaurant"],
     "bar": ["amenity=bar", "amenity=pub"],
     "hair": ["shop=hairdresser"],
     "pharmacy": ["amenity=pharmacy"],
   };

  const tags = tagMap[category] ?? ["amenity=restaurant"]; // default

  // Overpass query: find city boundary by name, search nodes/ways with given tags inside
  // Her satırda alan filtresi olsun (union syntax düzeltmesi)
  // ÖNEMLİ: nwr[...] ile (area.searchArea) arasında BOŞLUK OLMAMALI
  // ÖNEMLİ: Union içindeki her statement'ın sonunda ; olmalı (son eleman dahil)
const filters = tags
  .map(t => `nwr[${t}](area.searchArea)`)
  .join(";\n") + ";";

const ql = `[out:json][timeout:60];
area["name"~"${city}", i]["boundary"="administrative"]["admin_level"~"4|5|6|8"]->.searchArea;
(
${filters}
);
out center ${limit};`;

  return [{ json: { ql, limit, offset, city, category } }];
   ```

5. Node: HTTP Request – Overpass API
   - Method: `POST`
   - URL: `https://overpass-api.de/api/interpreter`
   - Send Query Parameters: **OFF**
   - Send Headers: **OFF**
   - Send Body: **ON**
   - Body Content Type: `Form Urlencoded`
   - Specify Body: `Using Fields Below`
   - **Body Parameters:**
     - Click "Add field" or edit existing field
     - **Name:** `data` (literal string, NOT "Name")
     - **Value:** `{{$json.ql}}` (expression)
   - Authentication: `None`

6. Node: Code – Transform & Dedupe
   - Purpose: Normalize OSM response to a clean schema and remove duplicates by OSM id.
   - Code:
   ```javascript
   const results = $json.elements || [];
   // Get category and city from Build Overpass Query node
   const prevData = $('Build Overpass Query').item.json || {};
   const category = prevData.category || null;
   const city = prevData.city || null;
   
   const items = [];
   for (const r of results) {
     const lat = r.lat ?? r.center?.lat ?? null;
     const lon = r.lon ?? r.center?.lon ?? null;
     const tags = r.tags ?? {};
     items.push({
       id: r.id,
       name: tags.name ?? null,
       category: category,
       address: tags["addr:full"] ?? null,
       street: tags["addr:street"] ?? null,
       housenumber: tags["addr:housenumber"] ?? null,
       city: tags["addr:city"] ?? city,
       website: tags.website ?? null,
       phone: tags.phone ?? null,
       lat, lon,
       source: "osm-overpass"
     });
   }
   // Deduplicate by id
   const seen = new Set();
   const unique = [];
   for (const x of items) {
     if (!seen.has(x.id)) { seen.add(x.id); unique.push(x); }
   }
   return unique.map(x => ({ json: x }));
   ```

7. Node: Code – Slice (limit/offset)
   - Purpose: Apply offset/limit after transform.
   - Code:
   ```javascript
   const all = $input.all().map(i => i.json);
   // Get limit and offset from Build Overpass Query node
   const prevData = $('Build Overpass Query').item.json || {};
   const limit = prevData.limit || 20;
   const offset = prevData.offset || 0;
   const page = all.slice(offset, offset + limit);
   return page.map(x => ({ json: x }));
   ```

8. Node: Respond to Webhook – Success
   - Respond with: `JSON`
   - Response Body (Expression):
     ```
     ={{ { success: true, total: $input.all().length, items: $input.all().map(item => item.json) } }}
     ```
   - Headers:
     - `Access-Control-Allow-Origin: *`
     - `Access-Control-Allow-Methods: POST, OPTIONS`
     - `Access-Control-Allow-Headers: Content-Type`

#### Overpass mirrors & retries
- Primary URL: `https://overpass-api.de/api/interpreter`
- If you hit 502/504 or timeouts, switch to an alternate mirror:
  - `https://z.overpass-api.de/api/interpreter`
  - `https://overpass.kumi.systems/api/interpreter`
  - `https://overpass.openstreetmap.ru/cgi/interpreter`
- In the `Overpass HTTP` node, open **Settings** → enable **Retry On Fail**, set `Number of retries = 3` and `Wait between retries = 5000` ms. This keeps the workflow resilient when the public mirrors are busy.

9. Node: Respond to Webhook – Error (from IF true)
   - Respond with: `JSON`
   - Response Code: `={{$json.status || 400}}`
   - Response Body: `={{ { success: false, error: $json.message || "Invalid input" } }}`
   - Same CORS headers as above

Wire:
- Webhook → Normalize → IF → (true) Error Response
- IF (false) → Build Query → HTTP → Transform & Dedupe → Slice → Success Response

Note: Overpass is free/shared; if rate-limited, retry after a few seconds or switch to a different public endpoint (e.g., `https://overpass.kumi.systems/api/interpreter`).

---

## 2) Optional: Google Sheets Export

### Option A: Add Google Sheets node to existing workflow (recommended)

After the `Slice` node, add a Google Sheets append node:

1. **Node: Google Sheets – Append Row**
   - **Operation:** `Append Row`
   - **Credential:** Create new Google OAuth2 credential (see setup below)
   - **Spreadsheet ID:** Your Google Sheet ID (from the sheet URL)
   - **Sheet Name:** Sheet name (e.g., `Sheet1` or `Leads`)
   - **Columns:**
     - `id`: `={{$json.id}}`
     - `name`: `={{$json.name}}`
     - `category`: `={{$json.category}}`
     - `city`: `={{$json.city}}`
     - `street`: `={{$json.street}}`
     - `housenumber`: `={{$json.housenumber}}`
     - `address`: `={{$json.address}}`
     - `phone`: `={{$json.phone ? "'" + $json.phone : ""}}` (prefix with `'` to prevent phone numbers from being treated as formulas)
     - `website`: `={{$json.website}}`
     - `lat`: `={{$json.lat}}`
     - `lon`: `={{$json.lon}}`
     - `source`: `={{$json.source}}`
     - `fetched_at`: `={{$now.toISO()}}`

2. **Wire the flow:**
   - `Slice` → `Google Sheets – Append Row` → `Respond to Webhook – Success`
   - This way, data is appended to Sheets AND returned to frontend

### Google OAuth2 Setup (for Google Sheets node)

1. **Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable **Google Sheets API** and **Google Drive API**

2. **Create OAuth 2.0 Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:5678/rest/oauth2-credential/callback` (for local n8n)
   - Copy **Client ID** and **Client Secret**

3. **OAuth Consent Screen:**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Choose **External** (unless you have Google Workspace)
   - Fill required fields (App name, User support email, Developer contact)
   - Add scopes: `https://www.googleapis.com/auth/spreadsheets` and `https://www.googleapis.com/auth/drive`
   - **Important:** Add your email (`gamzeozgul@gmail.com`) as a **Test user** in the "Test users" section

4. **Add Credential in n8n:**
   - In n8n, go to **Credentials** → **Add Credential** → **Google OAuth2 API**
   - Paste **Client ID** and **Client Secret**
   - Click **Connect my account** → Sign in with Google
   - Authorize n8n to access Google Sheets

5. **Create a Google Sheet:**
   - Create a new Google Sheet
   - **Important:** Add headers in row 1 exactly as shown (lowercase, no spaces):
     ```
     id | name | category | city | street | housenumber | address | phone | website | lat | lon | source | fetched_at
     ```
   - **Column order matters!** Make sure columns are in this exact order
   - Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
   - Use this ID in the Google Sheets node

**⚠️ Common Mistake:** If you change column names in Google Sheets (e.g., "Id" → "ID" or "Name" → "NAME"), the n8n mapping will break. Keep column headers exactly as shown above (lowercase, no spaces).

### Option B: Separate webhook for Google Sheets export (alternative)

Create a second webhook that only appends to Sheets (no JSON response). Frontend can call this after displaying results.

**Note:** CSV export is already implemented in the frontend (`downloadCsv` function). Google Sheets is optional and requires OAuth setup.

---

## 3) Frontend (Next.js)

Minimal client (later in `frontend/`):
- Form: `city`, `category`, optional `limit`, `offset`
- `POST` to n8n webhook
- Render table: name, address, phone, website, lat/lon
- Buttons: CSV download, "Append to Google Sheets"

Deploy to Vercel; set `NEXT_PUBLIC_N8N_WEBHOOK_URL` and ensure CORS headers in n8n Respond nodes.

---

## 4) Example requests (curl)

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"city":"Istanbul","category":"coffee","limit":20,"offset":0}' \
  http://localhost:5678/webhook-test/lead-generation -v
```

When workflow is active (production webhook):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"city":"Berlin","category":"restaurant","limit":25,"offset":0}' \
  http://localhost:5678/webhook/lead-generation
```

---

## 5) Export n8n Workflow

### How to Export Workflow as JSON

**Note:** Some n8n versions don't have a "Download" option. Use one of these methods:

### Method 1: Browser Console (Recommended)

1. **Open the workflow in n8n editor:**
   - Go to `http://localhost:5678`
   - Open `leadgen-overpass` workflow

2. **Open Browser Console:**
   - Press `F12` (or `Ctrl+Shift+I`)
   - Go to **Console** tab

3. **Run this command:**
   ```javascript
   copy(JSON.stringify(window.$workflow || window.workflow, null, 2))
   ```
   This copies the workflow JSON to your clipboard.

4. **Save to file:**
   - Create: `workflows/leadgen-overpass.json`
   - Paste the content and save

### Method 2: Network Tab

1. **Open workflow in editor**
2. **Open DevTools** (`F12`) → **Network** tab
3. **Clear network log**, then refresh the page
4. **Find the API request** that loads the workflow (look for `/api/v1/workflows/...` or similar)
5. **Click the request** → **Response** tab
6. **Copy the JSON response**
7. **Save as** `workflows/leadgen-overpass.json`

### Method 3: n8n Data Folder

n8n stores workflows locally. Check:
- Windows: `%USERPROFILE%\.n8n\workflows\` or `C:\Users\<YourUsername>\.n8n\workflows\`
- Look for a JSON file matching your workflow name

**Note:** The exported JSON contains all node configurations, credentials references (not actual secrets), and workflow structure. This allows you to:
- Backup your workflow
- Version control the workflow
- Share the workflow with others
- Restore if needed

---

## 6) Best Practices & Code Quality

### Architecture & Design Principles

**✅ SOLID Principles:**
- **Single Responsibility:** Each node/function has one clear purpose
- **Open/Closed:** Category mapping extensible via `tagMap` without modifying core logic
- **Dependency Inversion:** Frontend depends on webhook abstraction, not n8n internals

**✅ DRY (Don't Repeat Yourself):**
- Helper functions: `formatAddress()`, `safeValue()`, `findSimilarCity()`
- Reusable validation logic in n8n nodes
- Centralized error handling

**✅ KISS (Keep It Simple, Stupid):**
- Straightforward data flow: Webhook → Transform → Export
- No over-engineering
- Clear, readable code

**✅ Component-Based Architecture:**
- Next.js App Router with modular components
- Separation of concerns: UI, logic, data fetching

### Security

**✅ Input Validation:**
- Frontend: Required fields, type checking, range limits (limit: 1-100)
- Backend (n8n): Input sanitization, trim, type coercion
- SQL injection prevention: No direct SQL queries (using Overpass API)

**✅ XSS Protection:**
- CSV export uses `safeValue()` to escape special characters
- React automatically escapes user input in JSX
- External links use `rel="noreferrer"` for security

**✅ Data Handling:**
- No hardcoded secrets (uses environment variables)
- OAuth2 for Google Sheets (secure credential management)
- CORS headers properly configured
- No sensitive data in logs

**✅ Error Handling:**
- Graceful error messages for users
- Fallback error handling (JSON → text → generic message)
- Network error detection
- Empty result handling with suggestions

### Scalability

**✅ Performance:**
- Pagination support (limit/offset)
- Efficient deduplication using `Set`
- Memoized calculations (`useMemo` for formatted total)
- Retry logic for external API calls

**✅ Extensibility:**
- Easy to add new categories via `tagMap`
- Modular n8n workflow (nodes can be modified independently)
- Frontend can be extended with new features

**✅ Maintainability:**
- TypeScript for type safety
- Clear variable naming
- Comprehensive comments in n8n code nodes
- Well-structured README

### Code Quality Checklist

- [x] TypeScript for type safety
- [x] Input validation (frontend + backend)
- [x] Error handling
- [x] CORS configuration
- [x] Environment variables (no hardcoded secrets)
- [x] Clean code principles (DRY, KISS, SOLID)
- [x] Component-based architecture
- [x] Security best practices (XSS protection, input sanitization)
- [x] Scalable design (pagination, modular structure)
- [x] User-friendly error messages
- [x] Accessibility (ARIA labels, semantic HTML)
- [x] Unit tests (Jest + React Testing Library)

### Known Limitations & Future Improvements

**Current Limitations:**
- No rate limiting (Overpass is free/shared, be respectful)
- No authentication (local use case)
- No database persistence (data only in Sheets/CSV)
- Limited error logging (console only)

**Future Enhancements:**
- Add rate limiting middleware
- Implement caching for frequently searched cities
- Add database persistence (PostgreSQL/MongoDB)
- Implement user authentication
- Add analytics dashboard
- Support for more data sources

---

## 6) Notes
- No API keys needed; do not hardcode secrets anywhere.
- Keep categories mapped in Code (Build Overpass Query); extend `tagMap` as needed.
- Use small limits (10–50) to be a good citizen; Overpass is a shared service.
- This project follows industry best practices and is portfolio-ready.


