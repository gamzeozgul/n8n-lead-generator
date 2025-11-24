# Google Sheets Export Setup

Optional guide to set up automated Google Sheets export for lead data.

## Overview

After the workflow processes leads, you can automatically append them to a Google Sheet for easy tracking and analysis.

---

## Prerequisites

- Google account
- n8n instance (local or cloud)
- Google Cloud Console access

---

## Setup Steps

### 1. Google Cloud Console Setup

1. **Go to Google Cloud Console:**
   - Visit https://console.cloud.google.com/
   - Create a new project or select an existing one

2. **Enable Google Sheets API:**
   - Go to **APIs & Services** → **Library**
   - Search for "Google Sheets API"
   - Click **Enable**

3. **Create OAuth 2.0 Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs:** Add your n8n callback URL:
     - Local: `http://localhost:5678/rest/oauth2-credential/callback`
     - Cloud: `https://your-n8n-instance.com/rest/oauth2-credential/callback`
   - **Important:** Remove any trailing spaces or characters
   - Click **Create**
   - Copy **Client ID** and **Client Secret**

### 2. OAuth Consent Screen

1. **Go to OAuth Consent Screen:**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Choose **External** (unless you have Google Workspace)
   - Fill required fields:
     - **App name:** n8n Lead Generator
     - **User support email:** Your email
     - **Developer contact:** Your email

2. **Add Scopes:**
   - Click **Add or Remove Scopes**
   - Add:
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/drive`
   - Click **Update**

3. **Add Test Users:**
   - Scroll to **Test users** section
   - Click **Add Users**
   - Add your email (e.g., `gamzeozgul@gmail.com`)
   - Click **Save**

### 3. Add Credential in n8n

1. **Open n8n:**
   - Go to `http://localhost:5678`
   - Navigate to **Credentials** → **Add Credential**

2. **Select Google OAuth2 API:**
   - Search for "Google OAuth2 API"
   - Click to create

3. **Enter Credentials:**
   - **Client ID:** Paste from Google Cloud Console
   - **Client Secret:** Paste from Google Cloud Console
   - Click **Connect my account**
   - Sign in with Google
   - Authorize n8n to access Google Sheets

### 4. Create Google Sheet

1. **Create New Sheet:**
   - Go to https://sheets.google.com
   - Create a new spreadsheet

2. **Add Headers (Row 1):**
   - **Important:** Use exact column names (lowercase, no spaces):
     ```
     id | name | category | city | street | housenumber | address | phone | website | lat | lon | source | fetched_at
     ```
   - **Column order matters!** Make sure columns are in this exact order

3. **Get Sheet ID:**
   - Copy the Sheet ID from the URL:
     ```
     https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
     ```
   - Example: If URL is `https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j/edit`, the Sheet ID is `1a2b3c4d5e6f7g8h9i0j`

### 5. Add Google Sheets Node to Workflow

1. **Open Workflow:**
   - Open `leadgen-overpass` workflow in n8n

2. **Add Google Sheets Node:**
   - After the `Slice` node, add **Google Sheets** node
   - **Operation:** `Append Row`
   - **Spreadsheet ID:** Paste your Sheet ID
   - **Sheet Name:** Usually `Sheet1` (or your sheet name)
   - **Credential:** Select the Google OAuth2 credential you created

3. **Map Columns:**
   - Map each field to the corresponding column:
     - `id` → `={{$json.id}}`
     - `name` → `={{$json.name}}`
     - `category` → `={{$json.category}}`
     - `city` → `={{$json.city}}`
     - `street` → `={{$json.street}}`
     - `housenumber` → `={{$json.housenumber}}`
     - `address` → `={{$json.address}}`
     - `phone` → `={{$json.phone ? "'" + $json.phone : ""}}` (leading apostrophe prevents Excel formula interpretation)
     - `website` → `={{$json.website}}`
     - `lat` → `={{$json.lat}}`
     - `lon` → `={{$json.lon}}`
     - `source` → `={{$json.source}}`
     - `fetched_at` → `={{$now.toISO()}}`

4. **Connect Nodes:**
   - Connect `Slice` → `Google Sheets` → `Respond to Webhook (Success)`

---

## Common Issues

### ⚠️ "Credential with ID does not exist"

**Solution:**
- Delete the old credential in n8n
- Recreate it with correct Client ID and Client Secret
- Ensure redirect URI has no trailing spaces

### ⚠️ "Error 401: invalid_client"

**Solution:**
- Verify Client ID and Client Secret are correct
- Check redirect URI matches exactly (no trailing spaces)
- Ensure your email is added as a Test user in OAuth Consent Screen

### ⚠️ Phone numbers show as `#ERROR!` in Google Sheets

**Solution:**
- Use the expression: `={{$json.phone ? "'" + $json.phone : ""}}`
- The leading apostrophe prevents Google Sheets from interpreting phone numbers as formulas

### ⚠️ Column names changed in Google Sheets

**Solution:**
- Keep column headers exactly as shown (lowercase, no spaces)
- If you change column names, update the n8n node mappings accordingly

---

## Alternative: Separate Webhook for Export

You can create a second webhook that only appends to Sheets (no JSON response). Frontend can call this after displaying results.

**Note:** CSV export is already implemented in the frontend (`downloadCsv` function). Google Sheets is optional and requires OAuth setup.

