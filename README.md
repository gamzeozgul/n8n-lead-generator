# n8n Lead Generator

**Full-stack lead generation automation using free, API-keyless data sources.**

This project demonstrates a production-ready automation pipeline that collects local business leads from OpenStreetMap's Overpass API (completely free, no API keys required), processes and normalizes the data through n8n workflows, and presents results in a modern Next.js dashboard with CSV/Google Sheets export capabilities. Perfect for sales teams, marketers, or anyone needing to discover local businesses without expensive API subscriptions.

**Why This Project Is Useful:**
- ✅ **100% Free Data Source** – No paid APIs, no rate limits, no credit card required
- ✅ **Production-Ready Pipeline** – Proper data normalization, deduplication, and error handling
- ✅ **Complete Solution** – From raw OSM data to exportable leads in one workflow
- ✅ **Professional Frontend** – Modern React dashboard with real-time search and export

---

## Architecture Overview

```
┌─────────────┐      POST       ┌──────────────┐      ┌─────────────┐
│   Frontend  │ ───────────────> │   Webhook    │ ───> │  Normalize  │
│  (Next.js)  │                  │    (n8n)     │      │   Input     │
└─────────────┘                  └──────────────┘      └─────────────┘
                                                               │
                                                               ▼
┌─────────────┐      JSON       ┌──────────────┐      ┌─────────────┐
│ CSV/Sheets  │ <─────────────── │   Respond    │ <─── │  Dedupe &   │
│   Export    │                  │   (n8n)      │      │   Slice     │
└─────────────┘                  └──────────────┘      └─────────────┘
                                                               │
                                                               ▼
                                                      ┌─────────────┐
                                                      │  Overpass    │
                                                      │     API     │
                                                      │ (OpenStreetMap)
                                                      └─────────────┘
```

---

## Screenshots

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

## Tech Stack

- **Backend/Workflow:** n8n (workflow automation)
- **Data Source:** Overpass API (OpenStreetMap, free, no API key)
- **Frontend:** Next.js 15, React 19, TypeScript
- **Export:** CSV download, Google Sheets API (optional)
- **Testing:** Jest + React Testing Library (98% coverage)
- **Deployment:** Vercel (frontend), n8n Cloud or self-hosted

---

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/gamzeozgul/n8n-lead-generator.git
cd n8n-lead-generator
cd frontend && npm install && cd ..
```

### 2. Start n8n and Import Workflow

```bash
npx n8n@latest start
```

Open `http://localhost:5678` and import the pre-built workflow:

- Go to **Workflows** → **Import from File**
- Select `workflows/leadgen-overpass.json`
- Activate the workflow

**Or build manually:** See [Workflow Setup](#workflow-setup) section below.

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`

### 4. Run Tests

```bash
cd frontend
npm test
```

---

## API Reference

### Endpoint

**URL:** `POST /webhook/lead-generation`

**Base URL (local):** `http://localhost:5678/webhook/lead-generation`

### Request

```json
{
  "city": "Istanbul",
  "category": "coffee",
  "limit": 20,
  "offset": 0
}
```

**Required Fields:**
- `city` (string) – City name (e.g., "Istanbul", "New York", "Berlin")
- `category` (string) – Business category (see supported categories below)

**Optional Fields:**
- `limit` (number, default: 20, max: 100) – Number of results to return
- `offset` (number, default: 0) – Pagination offset

**Supported Categories:**
- `coffee` – Coffee shops and cafes
- `restaurant` – Restaurants
- `bar` – Bars and pubs
- `hair` – Hairdressers
- `pharmacy` – Pharmacies

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "total": 45,
  "items": [
    {
      "id": "123456789",
      "name": "Starbucks",
      "category": "coffee",
      "city": "Istanbul",
      "address": "Istiklal Caddesi 123, Istanbul",
      "phone": "+90 212 123 4567",
      "website": "https://www.starbucks.com.tr",
      "lat": 41.0369,
      "lon": 28.9850,
      "source": "overpass"
    }
  ]
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "city and category are required"
}
```

### Example Usage

**cURL:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"city":"Istanbul","category":"coffee","limit":20,"offset":0}' \
  http://localhost:5678/webhook/lead-generation
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:5678/webhook/lead-generation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    city: 'Istanbul',
    category: 'coffee',
    limit: 20,
    offset: 0,
  }),
});
const data = await response.json();
```

---

## Workflow Setup

### Quick Import (Recommended)

Import the pre-built workflow from `workflows/leadgen-overpass.json` (see Quick Start section above).

### Manual Setup

Create a new workflow in n8n named `leadgen-overpass`:

1. **Webhook (Trigger)**
   - Path: `lead-generation`
   - Methods: `POST, OPTIONS`

2. **Code – Normalize Input**
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

3. **IF – Input Error?**
   - Condition: `{{$json._error === true}}`
   - True → Error Response
   - False → Build Query

4. **Code – Build Overpass Query**
   ```javascript
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

   const tags = tagMap[category] ?? ["amenity=restaurant"];
   const filters = tags.map(t => `nwr[${t}](area.searchArea)`).join(";\n    ");

   const query = `[out:json][timeout:25];
   (
     relation["name"="${city}"]["admin_level"~"^[45678]$"]["boundary"="administrative"];
   );
   out geom;
   map_to_area;
   (
     ${filters};
   );
   out center meta;
   `;

   return [{ json: { query, limit, offset, city, category } }];
   ```

5. **HTTP Request – Overpass API**
   - Method: `POST`
   - URL: `https://overpass-api.de/api/interpreter`
   - Body: `={{$json.query}}`
   - **Settings:** Enable Retry On Fail (3 retries, 5s delay)

   **Fallback Mirrors** (if primary fails):
   - `https://z.overpass-api.de/api/interpreter`
   - `https://overpass.kumi.systems/api/interpreter`
   - `https://overpass.openstreetmap.ru/cgi/interpreter`

6. **Code – Transform & Dedupe**
   ```javascript
   const data = $json.elements || [];
   const seen = new Set();
   const results = [];
   const prevData = $('Build Overpass Query').item.json || {};

   for (const item of data) {
     if (!item.tags || !item.tags.name) continue;
     
     const key = `${item.tags.name}|${item.lat}|${item.lon}`;
     if (seen.has(key)) continue;
     seen.add(key);

     results.push({
       id: item.id || null,
       name: item.tags.name || null,
       category: prevData.category || null,
       city: prevData.city || null,
       street: item.tags["addr:street"] || null,
       housenumber: item.tags["addr:housenumber"] || null,
       address: item.tags["addr:full"] || null,
       phone: item.tags.phone || item.tags["contact:phone"] || null,
       website: item.tags.website || item.tags.url || null,
       lat: item.lat || item.center?.lat || null,
       lon: item.lon || item.center?.lon || null,
       source: "overpass",
     });
   }

   return results.map(x => ({ json: x }));
   ```

7. **Code – Slice (Pagination)**
   ```javascript
   const items = $input.all().map(item => item.json);
   const prevData = $('Build Overpass Query').item.json || {};
   const limit = prevData.limit || 20;
   const offset = prevData.offset || 0;
   const page = items.slice(offset, offset + limit);
   return page.map(x => ({ json: x }));
   ```

8. **Respond to Webhook – Success**
   - Response Body: `={{ { success: true, total: $input.all().length, items: $input.all().map(item => item.json) } }}`
   - Headers:
     - `Access-Control-Allow-Origin: *`
     - `Access-Control-Allow-Methods: POST, OPTIONS`
     - `Access-Control-Allow-Headers: Content-Type`

9. **Respond to Webhook – Error**
   - Response Code: `={{$json.status || 400}}`
   - Response Body: `={{ { success: false, error: $json.message || "Invalid input" } }}`
   - Same CORS headers as above

**Workflow Flow:**
```
Webhook → Normalize → IF → (true) Error Response
IF (false) → Build Query → HTTP → Transform & Dedupe → Slice → Success Response
```

---

## Optional: Google Sheets Export

After the `Slice` node, add a **Google Sheets – Append Row** node:

1. **Google Cloud Console Setup:**
   - Enable **Google Sheets API** and **Google Drive API**
   - Create OAuth 2.0 credentials (Web application)
   - Authorized redirect URI: `http://localhost:5678/rest/oauth2-credential/callback`
   - Add your email as a Test user in OAuth Consent Screen

2. **Add Credential in n8n:**
   - Go to **Credentials** → **Add Credential** → **Google OAuth2 API**
   - Paste Client ID and Client Secret
   - Connect your Google account

3. **Create Google Sheet:**
   - Create a new sheet with headers (row 1):
     ```
     id | name | category | city | street | housenumber | address | phone | website | lat | lon | source | fetched_at
     ```
   - Copy Sheet ID from URL

4. **Configure Google Sheets Node:**
   - Operation: `Append Row`
   - Spreadsheet ID: Your Sheet ID
   - Map columns (use expressions like `={{$json.name}}`)
   - **Important:** For `phone`, use `={{$json.phone ? "'" + $json.phone : ""}}` to prevent formula interpretation
   - For `fetched_at`, use `={{$now.toISO()}}`

5. **Wire:** `Slice` → `Google Sheets` → `Respond to Webhook (Success)`

**Note:** CSV export is already implemented in the frontend. Google Sheets is optional.

---

## Features

### Backend (n8n)
- ✅ Webhook-based API endpoint
- ✅ Input validation and normalization
- ✅ Overpass API integration with retry logic
- ✅ Data deduplication
- ✅ Pagination support (limit/offset)
- ✅ Error handling with proper HTTP status codes
- ✅ CORS configuration
- ✅ Optional Google Sheets export

### Frontend (Next.js)
- ✅ Modern React dashboard with TypeScript
- ✅ City autocomplete (no API required)
- ✅ Category selection
- ✅ Real-time search results
- ✅ CSV export functionality
- ✅ Responsive design
- ✅ Error handling and loading states
- ✅ Unit tests with 98% coverage

---

## Project Structure

```
n8n-lead-generator/
├── workflows/
│   └── leadgen-overpass.json    # Pre-built n8n workflow (import ready)
├── frontend/                     # Next.js dashboard
│   ├── src/
│   │   ├── app/                 # Next.js app router
│   │   ├── lib/                 # Utility functions
│   │   └── types/               # TypeScript types
│   └── __tests__/               # Unit tests
├── screenshots/                 # Project screenshots
└── README.md                    # This file
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License – see [LICENSE](LICENSE) file for details.

---

## Author

**Gamze Özgül**

- GitHub: [@gamzeozgul](https://github.com/gamzeozgul)

---

## Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) for free, open geographic data
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) for query interface
- [n8n](https://n8n.io/) for workflow automation platform
- [Next.js](https://nextjs.org/) for the React framework
