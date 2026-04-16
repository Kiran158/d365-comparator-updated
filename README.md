# D365 F&O Entity Comparator

A full-stack web application to compare configuration and reference data across **Legal Entities** in Microsoft Dynamics 365 Finance & Operations using **Data Management Templates**.

---

## Project Structure

```
d365-comparator/
├── backend/                    # Node.js / Express API
│   ├── config/
│   │   └── authConfig.js       # Azure AD + D365 config
│   ├── middleware/
│   │   └── errorHandler.js     # Global error handling
│   ├── routes/
│   │   ├── templates.js        # GET templates & entities
│   │   ├── legalEntities.js    # GET legal entities
│   │   └── comparison.js       # POST run comparison + export
│   ├── services/
│   │   ├── authService.js      # MSAL token acquisition
│   │   ├── d365Service.js      # OData queries + comparison logic
│   │   ├── exportService.js    # Excel (.xlsx) export
│   │   └── loggerService.js    # Winston logger
│   ├── .env.example
│   ├── package.json
│   └── server.js               # Express app entry
│
└── frontend/                   # React app
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── TemplateSidebar.jsx     # Left panel – template list
    │   │   ├── LegalEntityPicker.jsx   # Multi-select legal entities
    │   │   ├── EntityList.jsx          # Entities in template
    │   │   ├── ComparisonTable.jsx     # Per-entity diff table
    │   │   └── SummaryCards.jsx        # Dashboard summary
    │   ├── pages/
    │   │   └── ComparatorPage.jsx      # Main orchestrator page
    │   ├── services/
    │   │   └── api.js                  # Axios API client
    │   ├── App.jsx
    │   ├── index.js
    │   └── index.css
    └── package.json
```

---

## Prerequisites

- **Node.js** >= 18
- A **Microsoft Azure AD App Registration** with:
  - Client credentials (client ID + secret)
  - API permission: `Dynamics CRM → user_impersonation` (or application permission)
- A running **D365 Finance & Operations** instance with OData enabled

---

## Setup

### 1. Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App Registrations → New Registration
2. Note the **Application (client) ID** and **Directory (tenant) ID**
3. Under **Certificates & Secrets** → create a new client secret
4. Under **API Permissions** → Add → `Dynamics CRM` → `user_impersonation` → Grant admin consent

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Azure AD and D365 details
npm install
npm run dev      # development (nodemon)
# or
npm start        # production
```

Backend runs on **http://localhost:4000**

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on **http://localhost:3000** and proxies `/api` requests to the backend.

---

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `D365_BASE_URL` | Your D365 instance URL, e.g. `https://xxx.cloudax.dynamics.com` |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_CLIENT_SECRET` | App registration client secret |
| `D365_RESOURCE` | Same as D365_BASE_URL (used as OAuth resource) |
| `PORT` | Backend port (default 4000) |
| `FRONTEND_URL` | Frontend origin for CORS (default http://localhost:3000) |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/templates` | List all Data Management Templates |
| GET | `/api/templates/:id` | Get single template |
| GET | `/api/templates/:id/entities` | List entities in a template |
| GET | `/api/legal-entities` | List all legal entities |
| POST | `/api/comparison/run` | Run comparison |
| POST | `/api/comparison/export` | Export comparison to Excel |

### POST /api/comparison/run — Request Body

```json
{
  "templateId": "Test 001",
  "legalEntities": ["USMF", "GBSI", "DEMF"],
  "entities": ["AccountStructures", "MainAccounts"]
}
```

---

## How It Works

1. **Template Selection** — User picks a Data Management Template from the sidebar (fetched from `DataManagementDefinitionGroups` OData entity)
2. **Entity Discovery** — Template entities are loaded from `DataManagementDefinitionGroupDetails`
3. **Legal Entity Selection** — User picks 2+ legal entities to compare
4. **Comparison Run** — Backend fetches data from each entity filtered by `dataAreaId` for every selected legal entity, then runs field-level diff
5. **Results Display** — Summary dashboard + per-entity diff tables with status: `matched`, `different`, `partial`, `missing`
6. **Export** — Full comparison exported to Excel with one sheet per entity + a differences-only sheet

---

## Comparison Statuses

| Status | Meaning |
|---|---|
| ✅ Matched | Record exists in all legal entities with identical field values |
| 🟡 Different | Record exists in all, but one or more field values differ |
| 🟣 Partial | Record exists in some but not all legal entities |
| 🔴 Missing | Record is absent from all compared legal entities |

---

## Extending

- **Add authentication to frontend**: Integrate MSAL.js for user-based auth instead of service principal
- **Add more OData entities**: The `d365Service.js` `getEntityData()` function handles any valid D365 OData entity name
- **Custom key fields**: Pass `keyField` to `compareEntityData()` for entities with known primary keys
- **Pagination**: For entities with >5000 records, implement `@odata.nextLink` pagination in `d365Service.js`
