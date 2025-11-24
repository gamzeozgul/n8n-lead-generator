## Lead Generation Dashboard – Frontend

Next.js 15 (App Router, TypeScript) client that talks to the n8n Overpass workflow and renders a searchable lead table with CSV export.

### 1. Environment variables

Create a `.env.local` file in this directory. Point it at your running n8n webhook (local or hosted):

```bash
NEXT_PUBLIC_N8N_WEBHOOK=http://localhost:5678/webhook/lead-generation
```

When deploying, swap the value with the public webhook URL.

### 2. Install & run

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the dashboard.

### 3. Workflow expectations

- `city` and `category` are required; limit defaults to `10`, offset defaults to `0`.
- The UI displays the workflow-reported total count plus the number of items returned for the current page.
- CSV export mirrors the JSON payload exactly (id, contact info, coordinates, etc.).
- Retry handling and alternate Overpass mirrors are configured inside the n8n README.

### 4. Build & deploy

```bash
npm run build
npm run start
```

Deploy to Vercel or any Node-compatible host. Ensure the `NEXT_PUBLIC_N8N_WEBHOOK` environment variable is configured in the target platform.
