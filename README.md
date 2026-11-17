# CampusKart

**Your Campus. Your Shops. Real-Time Updates.**

CampusKart helps campus students check whether nearby shops are open before walking there. Shop owners can sign in and update their shop status; students can browse shops, see when each status was last updated, and call the owner when a status is stale.

> Assignment integrity: the records in `data/shops.csv` are illustrative dummy data for development only. Replace them with at least 20 genuine observations collected during fieldwork before final submission. Do not present dummy records as fieldwork evidence.

## Project structure

- `frontend/` — React + Vite + Tailwind frontend
- `backend/` — FastAPI API, SQLite owner accounts/status updates, CSV import
- `data/shops.csv` — development-only sample shop data
- `docs/` — research and fieldwork templates
- `screenshots/` — timestamped fieldwork photos for final submission
- `ai-chats/` — exported AI conversations used during the assignment

## Run locally

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: http://127.0.0.1:8000  
Interactive API docs: http://127.0.0.1:8000/docs

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Demo owner accounts

These accounts are seeded for local development only. Change the passwords and create real owner accounts before any public deployment.

- Food Corner: `foodowner` / `demo123`
- Campus Bakery: `bakeryowner` / `demo123`
- General Store: `storeowner` / `demo123`

Students can continue as guests. Owner accounts can update only their assigned shop.

## Status rules

- A recent owner update displays `OPEN` or `CLOSED`.
- A status older than 30 minutes displays `NOT UPDATED` (unverified), not a guessed open/closed state.
- The student can use the listed phone number to call the owner.
- The 30-minute threshold is a development default and should be confirmed with shop owners during fieldwork.

## Data notes

The backend imports the CSV at startup to initialize the local SQLite shop list. Owner status changes are persisted in SQLite with a server-generated timestamp. The original CSV remains the fieldwork input and must be replaced with at least 20 genuine collected observation rows before final submission. The application will continue to read the CSV on startup, while owner updates are stored separately so that the original field observations are not overwritten.

## Assignment deliverables still requiring real-world work

- `research.md`: finalize with the actual person/shop selected and two sources you personally read.
- `fieldwork.md`: complete after visiting the shop, interviewing the owner, and taking two timestamped photos.
- `data/shops.csv`: replace dummy data with 20+ genuine observations and a collection note.
- `reflection.md`: write personally, without AI, as required by the assignment.
- Record a three-minute demo and add its link here.
- Export the AI chats used into `ai-chats/`.
- Make at least five meaningful commits across the day; first commit must be within the first hour.

## Known limitations (development version)

- This is a local prototype, not production deployment.
- Demo credentials are intentionally simple and must not be reused publicly.
- Status freshness depends on owners remembering to update the app.
- The app cannot independently verify whether a shop is physically open.
- Phone links depend on the user's device supporting `tel:` links.
- The sample data is dummy data and is not valid fieldwork evidence.
