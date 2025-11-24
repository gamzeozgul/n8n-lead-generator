# n8n Workflow Setup Guide

Complete step-by-step guide to build the lead generation workflow in n8n.

## Overview

This workflow processes lead generation requests, queries OpenStreetMap's Overpass API, normalizes and deduplicates data, and returns structured JSON responses.

## Workflow Import

**Quick Start:** Import the pre-built workflow directly:

1. Open n8n at `http://localhost:5678`
2. Go to **Workflows** → **Import from File**
3. Select `workflows/leadgen-overpass.json`
4. Activate the workflow

**Note:** You can also build it manually following the steps below (recommended for learning).

---

## Manual Setup (Step-by-Step)

Create a new workflow and name it: `leadgen-overpass`.

### 1. Node: Webhook (Trigger)

- **Path:** `lead-generation`
- **Methods:** `POST, OPTIONS`
- **Response:** Keep default (we'll respond later)
- **CORS:** Enable in final Respond nodes (see step 8)

### 2. Node: Code – Normalize Input

**Purpose:** Validate and extract `city` and `category`, plus optional `limit` and `offset`.

**Code:**
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

### 3. Node: IF – Input Error?

- **Condition:** `{{$json._error === true}}`
- **True** → go to Respond (Error)
- **False** → go to Build Query

### 4. Node: Code – Build Overpass Query

**Purpose:** Map `category` to OSM tags, build Overpass QL using the city name.

**Code:**
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
  .join(";\n    ");

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

return [{ json: { query, limit, offset } }];
```

### 5. Node: HTTP Request – Overpass API

- **Method:** `POST`
- **URL:** `https://overpass-api.de/api/interpreter`
- **Body:** `={{$json.query}}`
- **Options:**
  - **Retry On Fail:** Enabled
  - **Number of retries:** 3
  - **Wait between retries:** 5000 ms

**Fallback Mirrors** (if primary fails):
- `https://z.overpass-api.de/api/interpreter`
- `https://overpass.kumi.systems/api/interpreter`
- `https://overpass.openstreetmap.ru/cgi/interpreter`

### 6. Node: Code – Transform & Dedupe

**Purpose:** Extract relevant fields, normalize data, remove duplicates.

**Code:**
```javascript
const data = $json.elements || [];
const seen = new Set();
const results = [];

for (const item of data) {
  if (!item.tags || !item.tags.name) continue;
  
  const key = `${item.tags.name}|${item.lat}|${item.lon}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const result = {
    id: item.id || null,
    name: item.tags.name || null,
    category: $('Build Overpass Query').item.json.category || null,
    city: $('Build Overpass Query').item.json.city || null,
    street: item.tags["addr:street"] || null,
    housenumber: item.tags["addr:housenumber"] || null,
    address: item.tags["addr:full"] || null,
    phone: item.tags.phone || item.tags["contact:phone"] || null,
    website: item.tags.website || item.tags.url || null,
    lat: item.lat || item.center?.lat || null,
    lon: item.lon || item.center?.lon || null,
    source: "overpass",
  };

  results.push(result);
}

return results.map(x => ({ json: x }));
```

### 7. Node: Code – Slice (Pagination)

**Purpose:** Apply limit/offset for pagination.

**Code:**
```javascript
const items = $input.all().map(item => item.json);
const limit = $('Build Overpass Query').item.json.limit || 20;
const offset = $('Build Overpass Query').item.json.offset || 0;

const page = items.slice(offset, offset + limit);

return page.map(x => ({ json: x }));
```

### 8. Node: Respond to Webhook – Success

- **Respond with:** `JSON`
- **Response Body (Expression):**
  ```
  ={{ { success: true, total: $input.all().length, items: $input.all().map(item => item.json) } }}
  ```
- **Headers:**
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`

### 9. Node: Respond to Webhook – Error (from IF true)

- **Respond with:** `JSON`
- **Response Code:** `={{$json.status || 400}}`
- **Response Body:** `={{ { success: false, error: $json.message || "Invalid input" } }}`
- **Same CORS headers as above**

## Workflow Connections

```
Webhook → Normalize → IF → (true) Error Response
IF (false) → Build Query → HTTP → Transform & Dedupe → Slice → Success Response
```

## Overpass Mirrors & Retries

- **Primary URL:** `https://overpass-api.de/api/interpreter`
- If you hit 502/504 or timeouts, switch to an alternate mirror (see step 5)
- In the `Overpass HTTP` node, open **Settings** → enable **Retry On Fail**, set `Number of retries = 3` and `Wait between retries = 5000` ms. This keeps the workflow resilient when the public mirrors are busy.

**Note:** Overpass is free/shared; if rate-limited, retry after a few seconds or switch to a different public endpoint.

