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

## Live Demo

🚀 **Coming soon:** Live demo will be available on Vercel.

*Note: Frontend can be deployed to Vercel. Ensure `NEXT_PUBLIC_N8N_WEBHOOK` environment variable points to your n8n instance.*

**Track progress:** [Issue #1: Deploy demo to Vercel](https://github.com/gamzeozgul/n8n-lead-generator/issues/1)

---

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

### Tech Stack

- **Backend/Workflow:** n8n (workflow automation)
- **Data Source:** Overpass API (OpenStreetMap, free, no API key)
- **Frontend:** Next.js 15, React 19, TypeScript
- **Export:** CSV download, Google Sheets API (optional)
- **Testing:** Jest + React Testing Library (98% coverage)
- **Deployment:** Vercel (frontend), n8n Cloud or self-hosted

### What You Get

- ✅ **Free Data Source** – Overpass API (no API key, no rate limits)
- ✅ **Production-Ready Workflow** – Built manually in n8n UI with proper error handling
- ✅ **Data Quality** – Input validation, normalization, deduplication
- ✅ **Pagination Support** – Limit/offset for handling large datasets
- ✅ **Multiple Export Options** – CSV download + Google Sheets integration
- ✅ **Modern Frontend** – Next.js dashboard with city autocomplete and real-time results
- ✅ **Test Coverage** – Unit tests with 98% coverage on utility functions

---

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/gamzeozgul/n8n-lead-generator.git
cd n8n-lead-generator
cd frontend && npm install && cd ..
```

### 2. Start n8n

```bash
npx n8n@latest start
```

Open `http://localhost:5678` and **import the workflow**:

- Go to **Workflows** → **Import from File**
- Select `workflows/leadgen-overpass.json`
- Activate the workflow

**Or build manually:** See [Workflow Setup Guide](docs/WORKFLOW_SETUP.md)

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

## Documentation

- 📖 **[Workflow Setup Guide](docs/WORKFLOW_SETUP.md)** – Complete step-by-step n8n workflow setup
- 📖 **[API Reference](docs/API_REFERENCE.md)** – Detailed API documentation with examples
- 📖 **[Google Sheets Setup](docs/GOOGLE_SHEETS_SETUP.md)** – Optional Google Sheets export configuration
- 📖 **[Frontend README](frontend/README.md)** – Frontend-specific documentation
- 📖 **[Testing Guide](frontend/TESTING.md)** – Test setup and coverage

---

## API Quick Reference

**Endpoint:** `POST /webhook/lead-generation`

**Request:**
```json
{
  "city": "Istanbul",
  "category": "coffee",
  "limit": 20,
  "offset": 0
}
```

**Response:**
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

**Full API Documentation:** [docs/API_REFERENCE.md](docs/API_REFERENCE.md)

---

## Features

### Backend (n8n)

- ✅ Webhook-based API endpoint
- ✅ Input validation and normalization
- ✅ Overpass API integration with retry logic
- ✅ Data deduplication
- ✅ Pagination support (limit/offset)
- ✅ Error handling with proper HTTP status codes
- ✅ CORS configuration for frontend integration
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
├── docs/                        # Detailed documentation
│   ├── WORKFLOW_SETUP.md        # Workflow setup guide
│   ├── API_REFERENCE.md         # API documentation
│   └── GOOGLE_SHEETS_SETUP.md   # Google Sheets setup
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
- Portfolio: [GitHub Profile](https://github.com/gamzeozgul)

---

## Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) for free, open geographic data
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) for query interface
- [n8n](https://n8n.io/) for workflow automation platform
- [Next.js](https://nextjs.org/) for the React framework
