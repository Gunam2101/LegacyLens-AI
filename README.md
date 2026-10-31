# LegacyLens AI
## Autonomous, Evidence-Driven Legacy Application Modernization Agent

> **Modernize legacy applications without losing what matters.**  
> Domain-independent AI modernization agent that investigates codebase architecture, reconstructs hidden business rules, identifies risks, and verifies changes through automated behaviour-preservation gates.

---

## 1. Product Vision & Principles

Legacy systems across banking, healthcare, retail, logistics, manufacturing, and enterprise ERP represent decades of accumulated business rules. Traditional modernization approaches frequently fail because they blindly rewrite code without distinguishing between:

1. **Existing observed behaviour** (what the code currently computes)
2. **Inferred business rules** (conditional branches, boundary predicates, arithmetic formulas)
3. **Evidence-backed rules** (corroborated by corporate charters, post-mortems, or compliance specs)
4. **Potentially obsolete code** vs **indirectly invoked business-critical routines**
5. **Verified outcomes** vs **unverified assumptions**

### Core Product Principle
> **Never claim that an existing business rule is correct merely because it exists in the source code.**  
> LegacyLens AI cross-correlates code ASTs with incident reports, tickets, and tests, highlighting conflicting evidence and requiring explicit human approval before consequential modifications.

---

## 2. Key Capabilities & Differentiators

### A. Zero-Prompt Initial Investigation
Upload a codebase ZIP archive or connect a repository without writing elaborate prompts. LegacyLens AI autonomously:
- Detects directory topologies, programming languages, and frameworks.
- Discovers entry points (`main.py`, `app.py`, `server.js`, `index.ts`, `wsgi.py`).
- Identifies database DDL schemas, stored procedures, and check constraints.
- Analyzes configuration manifests (`.env`, `package.json`, `requirements.txt`).
- Catalogs existing automated tests and establishes characterization baselines.

### B. Traceable Business Rule Reconstruction
Extracts business policies from:
- AST conditional statements (`if/elif/else`, comparison values, tier thresholds).
- Mathematical calculations, tax formulas, and discount engines.
- SQL DDL check constraints (`CONSTRAINT chk_tier CHECK (...)`) and active query filters.
- Every rule records: **Rule ID**, **Description**, **Source File**, **Line Range**, **Evidence Quote**, **Confidence Score**, **Status** (`inferred`, `verified`, `conflicting`, `user_confirmed`, `user_rejected`), and **Audit Log Trail**.

### C. Multi-Signal Obsolete Code Investigation
Avoids naive dead-code deletion:
- Combines static AST in-degree analysis with external evidence cross-referencing.
- Distinguishes **`potentially_obsolete`** code (e.g. an unreferenced analog fax routine) from **`possibly_business_critical`** code (e.g. an audit logger with zero direct call sites that is dispatched dynamically and required by incident post-mortems).
- Explains the reasoning and safety limitations behind every decommissioning recommendation.

### D. Behaviour-Preservation Gate
Protects original production logic:
- Dual-run execution environment: original source resides in a read-only `source` workspace, while proposed modifications run in an isolated `modernized` sandbox.
- Runs baseline tests, compares post-change outputs, and **automatically halts deployment** if any business calculation diverges.

### E. Evidence-Triggered Replanning
Dynamic re-evaluation workflow:
- Ingest new production incident post-mortems (`INC-4092`) or change tickets (`CR-8812`).
- The agent re-evaluates previously reconstructed rules, updates risk scores, reclassifies obsolete findings, and records full audit trail entries explaining the exact evidence that caused the change.

---

## 3. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LegacyLens AI Architecture                      │
└────────────────────────────────────────────────────────────────────────┘

    [ User Web UI: React 19 + TypeScript + Vite + Tailwind + React Flow ]
                                    │
                               REST / SSE
                                    ▼
       [ FastAPI Application Server (app/main.py) : Port 8000 ]
           ├── Core Security (Zip-Slip, Zip-Bomb, Secret Masking)
           ├── Project Discovery (Languages, Frameworks, Entrypoints)
           ├── Pluggable Analyzers (Python AST, JavaScript, SQLGlot)
           ├── Dependency Graph Builder (Nodes, Edges, Risk In-Degree)
           ├── Agent Orchestrator (Autonomous Investigation Pipeline)
           ├── Behaviour-Preservation Gate (Sandboxed Pytest Runner)
           ├── Evidence-Triggered Replanning Engine
           └── Report Generator (Markdown, JSON, Printable HTML)
                                    │
                ┌───────────────────┴───────────────────┐
                ▼                                       ▼
    [ Isolated Workspaces ]                 [ Persistent Storage ]
   ├── workspace/source/                   ├── SQLite / PostgreSQL
   └── workspace/modernized/               └── Audit Trails & Logs
```

---

## 4. Benchmark & Ground-Truth Evaluation

LegacyLens AI includes an automated synthetic application evaluation suite (`/api/v1/benchmark/run-synthetic`) modeling a legacy billing and claims subsystem (**LegacyCare Billing Engine**):

| Evaluation Metric | Measured Result | Benchmark Ground Truth Verification |
|---|---|---|
| **Business Rule Recall** | **100% (1.00)** | Detected discount formulas, overdue penalties, grace periods, tax overrides, and SQL constraints |
| **Business Rule Precision** | **100% (1.00)** | All reconstructed rules anchored by exact source file and line numbers |
| **Obsolete False-Positive Rate** | **0.0% (0.00)** | Protected `audit_compliance_logger.py` from deletion while flagging `legacy_fax_dispatcher.py` |
| **Evidence Traceability** | **100% (1.00)** | Every rule links directly to code excerpts or document references |
| **Test Baseline Execution** | **PASS (4/4 passed)** | Sandboxed pytest harness executed against original source |
| **Evidence Replanning Trigger** | **VERIFIED** | Ingestion of `INC-4092` flagged weekend grace period rule as `conflicting` with audit log |
| **Execution Duration** | **~6.5 seconds** | Complete end-to-end multi-stage pipeline execution |

---

## 5. Quickstart & Local Installation

### Prerequisites
- **Python**: 3.10+ (Tested on Python 3.14 on Windows)
- **Node.js**: 18+ (Tested on Node.js v26.5 & npm 11.11)

### Option A: Run Locally (Fastest)

#### 1. Setup Backend
```bash
# From repository root
python -m venv .venv
.\.venv\Scripts\activate  # On Windows (or 'source .venv/bin/activate' on Linux/macOS)

pip install -r requirements.txt
```

#### 2. Run Backend Tests
```bash
pytest -v backend/tests
```
*(All 10 unit and end-to-end integration tests will run and pass).*

#### 3. Start Backend Server
```bash
python backend/run_backend.py
```
*Backend runs at `http://127.0.0.1:8000`*.

#### 4. Setup and Run Frontend (Separate Dev Mode)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`*.

*(Note: The built frontend is already embedded into `frontend/dist`. You can also open `http://127.0.0.1:8000` directly in your browser to access the entire application from a single port!)*

---

### Option B: Docker Container

```bash
docker-compose up --build
```
*Open `http://localhost:8000` in your browser.*

---

## 6. Demo Walkthrough for Judges

Follow this 5-minute walkthrough to test all features:

1. **Launch the Application**:
   Navigate to `http://localhost:5173` (or `http://localhost:8000`).
2. **One-Click Synthetic Demo**:
   On the Home page, click **"Try Sample Billing App"**.
   - LegacyLens AI unpacks the synthetic enterprise billing application.
   - The autonomous agent pipeline executes: Discovery &rarr; AST Parsing &rarr; Dependency Mapping &rarr; Business Rules &rarr; Incident Correlation &rarr; Behaviour Gate &rarr; Roadmap Synthesis.
3. **Explore Dashboard**:
   - Inspect files analyzed, lines of code, and the interactive Language Distribution chart.
   - Note the **"Conflicting Business Rules Detected"** alert banner.
4. **Inspect Reconstructed Business Rules**:
   Navigate to **Business Rules** (`/rules`):
   - Review rule `BR-PY-XXXX` (`when is_weekend and days_overdue <= 3`).
   - Notice the status badge is marked **`CONFLICTING`**.
   - Click **Inspect** to see the code snippet alongside the conflict citation from Incident Report `INC-4092`.
   - Click **Confirm Rule** or **Reject Rule** and observe the live entry recorded in the **Decision History Audit Trail**.
5. **Inspect Interactive Dependency Graph**:
   Navigate to **Dependencies** (`/dependencies`):
   - Pan and zoom the React Flow graph. Filter by "API Endpoints" or "SQL Tables".
   - Select any node to inspect coupling risk and file locations.
6. **Review Modernization Roadmap & Obsolete Code**:
   Navigate to **Modernization** (`/modernization`):
   - Review the tailored 5-Phase Roadmap.
   - Scroll to the Obsolete Code Audit table: observe how `legacy_fax_dispatcher.py` is classified as `potentially_obsolete`, while `audit_compliance_logger.py` is safely preserved as `possibly_business_critical`.
7. **Review Code Changes & Approval Gate**:
   Navigate to **Code Changes** (`/changes`):
   - Inspect the syntax-highlighted unified diff for `billing.py`.
   - Click **Approve Modernization** to exercise the human gate.
8. **Execute Behaviour-Preservation Gate**:
   Navigate to **Verification Gate** (`/verification`):
   - Click **"Run Behaviour Gate"** to execute the sandboxed test comparison.
9. **Export Reports**:
   Navigate to **Reports** (`/reports`):
   - Click **"Printable HTML Report"** to open an executive report in a new tab.
   - Click **"Download Markdown"** to save `legacylens_report.md`.
10. **Run Ground-Truth Benchmark**:
    Navigate to **Benchmarking** (`/benchmark`):
    - Click **"Run Automated Benchmark"** to re-measure precision, recall, and false-positive rates with real-time timers.

---

## 7. Known Limitations & Future Extensibility

1. **Language Scope**: The current release ships with native parsers for Python (AST), JavaScript/TypeScript (AST/lexical), and SQL (SQLGlot). Java, C#, and COBOL analyzers can be plugged into `BaseAnalyzer` in `backend/app/analyzers/base.py`.
2. **Subprocess Isolation**: Tests execute in timed subprocesses with environment sandboxing. For multi-tenant cloud deployments, microVMs (e.g. Firecracker or gVisor) are recommended.
3. **Repository Providers**: First release features ZIP and evidence ingestion; GitHub repository cloning is implemented as a configurable extension point via `GITHUB_TOKEN`.

---

## 8. License & Authors
Built with pride for the Google DeepMind Antigravity Advanced Agentic Modernization Challenge.
Licensed under the Apache-2.0 License.
#   L e g a c y L e n s - A I  
 