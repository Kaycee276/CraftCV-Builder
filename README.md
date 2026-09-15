# CraftCV 📄✨

> **Your story, well told.**  
> A conversational, human-centric CV builder powered by Google Gemini AI.

CraftCV replaces rigid form fields and intimidating blank boxes with a calm, interactive conversation. It listens to your work experience, asks intuitive follow-up questions to spot key achievements, and shapes your stories into a polished, print-ready CV in real time.

---

## 🌟 Key Features

* **💬 Conversational AI Career Coach**: Talk about your work in plain text. Powered by Google Gemini (`gemini-3.6-flash`), CraftCV guides you through your career history, uncovers hidden signals, and clarifies key details.
* **⚡ Live Side-by-Side Preview**: Watch your structured CV take shape automatically as you chat—separating your Profile, Experience, Skills, and Education.
* **📥 WYSIWYG PDF Export**: Download your CV with a single click in high-quality PDF format, styled to match the exact typography, colors, and layout of the UI preview.
* **📚 Saved Snapshot Archive**: Keep every version of your CV. Every generation creates a new snapshot version, letting you preview, download, or delete past versions anytime.
* **🔒 Private & Local Storage**: Uses server-side password hashing (`scrypt`), secure `httpOnly` sessions, and a zero-dependency local SQLite database (`craftcv.db`). Your API keys and secrets stay safely on the server.

---

## 🛠️ Tech Stack

### **Frontend (`@workspace/craftcv`)**
* **Framework**: React 19 + Vite
* **Styling**: Tailwind CSS + Custom Editorial Parchment Theme
* **Icons**: Lucide React
* **State & Query Management**: TanStack React Query v5
* **Routing**: Wouter
* **PDF Export**: `html2pdf.js` / `jsPDF` + `html2canvas`

### **Backend (`@workspace/api-server`)**
* **Runtime**: Node.js (v22+)
* **Server**: Express 5
* **AI Provider**: Google Gemini API (`@google/genai`, model `gemini-3.6-flash`)
* **Validation**: Zod
* **Authentication**: Database-backed session tokens with `scrypt` password hashing

### **Database (`@workspace/db`)**
* **Engine**: Local SQLite via Node.js native `node:sqlite` (`DatabaseSync`)
* **Persistence**: Local `craftcv.db` file (automatically initialized with tables for users, sessions, messages, and saved CVs)

---

## 🚀 Getting Started

### **Prerequisites**
Make sure you have the following installed on your machine:
* **Node.js**: v22.0.0 or higher
* **pnpm**: v9.0.0 or higher (`corepack enable pnpm`)
* **Google Gemini API Key**: Get a free API key from [Google AI Studio](https://aistudio.google.com/)

---

### **1. Clone the Repository**

```bash
git clone https://github.com/Kaycee276/CraftCV-Builder.git
cd CraftCV-Builder
```

### **2. Install Dependencies**

```bash
pnpm install
```

### **3. Configure Environment Variables**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Or manually create a `.env` file with your Gemini API Key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

*(Note: SQLite data will be saved locally to `craftcv.db` in the workspace root by default).*

---

### **4. Start the Application**

Run the backend server and frontend web app concurrently:

#### **Option A: Run in two separate terminal windows**

**Terminal 1: Start Backend API Server**
```bash
pnpm dev:server
# Server running at http://localhost:5001
```

**Terminal 2: Start Frontend Web App**
```bash
pnpm dev:web
# Web app running at http://localhost:3000
```

#### **Option B: Run individual package commands**
```bash
# Start API Server on port 5001
PORT=5001 pnpm --filter @workspace/api-server run dev

# Start Frontend on port 3000
PORT=3000 pnpm --filter @workspace/craftcv run dev
```

---

### **5. Open in Browser**

Open your browser and navigate to:
```
http://localhost:3000
```

1. Click **Start your CV** or **Sign up**.
2. Create an account with your full name, email, and password.
3. Start chatting with your AI coach to build your first CV!

---

## 📂 Project Structure

```
CraftCV-Builder/
├── artifacts/
│   ├── api-server/         # Fastify/Express backend server & Gemini AI logic
│   └── craftcv/            # React + Vite frontend web application
├── lib/
│   ├── api-client-react/   # Generated React Query hooks for the API
│   ├── api-spec/           # OpenAPI 3.0 specification & Orval config
│   ├── api-zod/            # Zod validation schemas derived from OpenAPI
│   └── db/                 # SQLite database schema, repos & initialization
├── craftcv.db              # Auto-created local SQLite database file
├── package.json            # Root workspace configuration and scripts
└── pnpm-workspace.yaml     # pnpm monorepo workspace definition
```

---

## 🧪 Development Commands

* **Typecheck entire codebase**:
  ```bash
  pnpm run typecheck
  ```
* **Build production bundles**:
  ```bash
  pnpm run build
  ```
* **Regenerate API hooks from OpenAPI spec**:
  ```bash
  pnpm --filter @workspace/api-spec run codegen
  ```

---

## 📜 License

Distributed under the MIT License.
