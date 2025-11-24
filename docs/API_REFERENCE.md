# API Reference

Complete API documentation for the n8n Lead Generator webhook endpoint.

## Endpoint

**URL:** `POST /webhook/lead-generation`

**Base URL (local):** `http://localhost:5678/webhook/lead-generation`

**Base URL (production):** `https://your-n8n-instance.com/webhook/lead-generation`

---

## Request

### Headers

```
Content-Type: application/json
```

### Request Body

```json
{
  "city": "Istanbul",
  "category": "coffee",
  "limit": 20,
  "offset": 0
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `city` | string | ✅ Yes | - | City name (e.g., "Istanbul", "New York", "Berlin") |
| `category` | string | ✅ Yes | - | Business category (see supported categories below) |
| `limit` | number | ❌ No | 20 | Number of results to return (max: 100) |
| `offset` | number | ❌ No | 0 | Pagination offset |

### Supported Categories

- `coffee` – Coffee shops and cafes
- `restaurant` – Restaurants
- `bar` – Bars and pubs
- `hair` – Hairdressers
- `pharmacy` – Pharmacies

---

## Response

### Success Response (200 OK)

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
      "street": "Istiklal Caddesi",
      "housenumber": "123",
      "address": "Istiklal Caddesi 123, Istanbul",
      "phone": "+90 212 123 4567",
      "website": "https://www.starbucks.com.tr",
      "lat": 41.0369,
      "lon": 28.9850,
      "source": "overpass"
    },
    {
      "id": "987654321",
      "name": "Kahve Dünyası",
      "category": "coffee",
      "city": "Istanbul",
      "street": "Bagdat Caddesi",
      "housenumber": "456",
      "address": "Bagdat Caddesi 456, Istanbul",
      "phone": null,
      "website": null,
      "lat": 40.9876,
      "lon": 29.0123,
      "source": "overpass"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `total` | number | Total number of items found (before pagination) |
| `items` | array | Array of lead objects |
| `items[].id` | string/number | OSM element ID |
| `items[].name` | string | Business name |
| `items[].category` | string | Business category |
| `items[].city` | string | City name |
| `items[].street` | string | Street name (if available) |
| `items[].housenumber` | string | House number (if available) |
| `items[].address` | string | Full address (if available) |
| `items[].phone` | string | Phone number (if available) |
| `items[].website` | string | Website URL (if available) |
| `items[].lat` | number | Latitude coordinate |
| `items[].lon` | number | Longitude coordinate |
| `items[].source` | string | Data source (always "overpass") |

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "error": "city and category are required"
}
```

### Error Response (500 Internal Server Error)

```json
{
  "success": false,
  "error": "Overpass API timeout. Please try again later."
}
```

---

## Examples

### cURL

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"city":"Istanbul","category":"coffee","limit":20,"offset":0}' \
  http://localhost:5678/webhook/lead-generation
```

### JavaScript (Fetch)

```javascript
const response = await fetch('http://localhost:5678/webhook/lead-generation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    city: 'Istanbul',
    category: 'coffee',
    limit: 20,
    offset: 0,
  }),
});

const data = await response.json();
console.log(data);
```

### Python (Requests)

```python
import requests

response = requests.post(
    'http://localhost:5678/webhook/lead-generation',
    json={
        'city': 'Istanbul',
        'category': 'coffee',
        'limit': 20,
        'offset': 0,
    }
)

data = response.json()
print(data)
```

---

## Rate Limiting

The Overpass API is a free, shared service. Please be respectful:

- **No official rate limits** – but avoid excessive requests
- **Recommended:** Wait 1-2 seconds between requests
- **If rate-limited:** Wait 30-60 seconds before retrying
- **Use retry logic** – The workflow includes automatic retries (3 attempts, 5s delay)

---

## CORS

The endpoint includes CORS headers for cross-origin requests:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

