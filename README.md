# GO-AI Annotation Practice Studio 🎯
> **A Human-in-the-Loop Fulfillment Center Data Annotation & Quality Audit Simulator**  
> *Tailored specifically as a portfolio demonstration for the Amazon Robotics Global Operations - Artificial Intelligence (GO-AI Operations) Associate role.*

---

## 📌 Project Overview

**GO-AI Annotation Practice Studio** is an interactive, browser-based computer vision annotation platform simulating fulfillment center (FC) operations. It replicates the end-to-end data pipeline utilized by Human-in-the-Loop (HITL) operational teams to train, evaluate, and calibrate frontier computer vision and robotic manipulation models.

The application requires **zero frameworks, zero build steps, and zero external image dependencies**. It features 8 procedural vector-drawn fulfillment center scenes (with exact mathematical ground truth), real-time Intersection over Union (IoU) evaluation, defect classification, productivity tracking, and exportable quality audit reports.

---

## 🤝 Alignment with the Amazon GO-AI Operations Role

This project directly demonstrates operational mastery across all competencies specified in the Amazon GO-AI job description:

| Role Requirement | Implementation in GO-AI Studio |
| :--- | :--- |
| **Image Annotation & Object Detection** | Interactive canvas supporting bounding-box creation, sub-pixel edge alignment, move/resize handles, and attribute tags (`Occluded`, `Truncated`, `Damaged`). |
| **Obsessive Precision & Quality Metrics** | Real-time automated scoring comparing annotator boxes against ground truth using **IoU**, computing **Precision, Recall, F1 Score, and Mean IoU**. |
| **Error Identification & Root Cause Analysis** | Automatic error diagnostics categorizing defects into **False Negatives (Missed Objects)**, **False Positives (Extra Boxes)**, **Wrong Label Mismatches**, and **Sub-optimal Boundary Hugs (Loose/Tight Boxes)**. |
| **Fulfillment Center Operational Context** | 8 realistic fulfillment domains: Packaging benches, High-speed Sortation Chutes, Robotic Drive Pods, Conveyor Roller Lines, Pallet Staging, and Damaged Item QA Benches. |
| **Human Judgment & Ambiguity Resolution** | Built-in **Standard Operating Procedure (SOP) Guidelines** providing explicit rules for partially visible items, frame truncations, and severe structural damage. |
| **Productivity & SLA Tracking** | Automated per-task timer with smart pause/resume during tab switches, calculating throughput metrics (**Annotations per Hour**, cycle times). |

---

## 🧮 How Scoring & IoU Matching Works

The evaluation engine adheres to the standard benchmark protocols used in robotic perception pipelines:

### 1. Intersection over Union (IoU)
For any predicted box $A$ and ground truth box $B$:

$$\text{IoU}(A, B) = \frac{\text{Area}(A \cap B)}{\text{Area}(A \cup B)} = \frac{\text{Area}(A \cap B)}{\text{Area}(A) + \text{Area}(B) - \text{Area}(A \cap B)}$$

- **IoU $\ge 0.75$**: High-precision boundary alignment ("Tight Box" standard).
- **$0.50 \le \text{IoU} < 0.75$**: Accepted detection with a warning for loose or tight boundaries.
- **$\text{IoU} < 0.50$**: Insufficient overlap to constitute a true match.

### 2. Greedy Bipartite Matching
1. All candidate pairs between user annotations and ground-truth boxes are computed and sorted by descending IoU.
2. If $\text{IoU} \ge 0.50$ and the class labels match, the pair is registered as a **True Positive (TP)**.
3. If $\text{IoU} \ge 0.50$ but the class labels differ, the pair is flagged as a **Wrong Label Defect**.
4. Any remaining ground truth boxes become **False Negatives (FN - Missed Objects)**.
5. Any remaining user boxes become **False Positives (FP - Extra Annotations)**.

### 3. Metric Formulations
- **Precision**: $\frac{\text{TP}}{\text{TP} + \text{FP}}$
- **Recall**: $\frac{\text{TP}}{\text{TP} + \text{FN}}$
- **F1 Score**: $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$
- **Mean IoU (mIoU)**: $\frac{1}{|\text{TP}|} \sum \text{IoU}(\text{TP}_i)$
- **Composite Score %**: $(0.50 \times \text{F1} + 0.35 \times \text{mIoU} + 0.15 \times \text{Attribute Accuracy}) \times 100$

---

## 🚀 Key Features

### 1. Curated Fulfillment Task Queue
- **Task 1: Packing Station Infeed** (Corrugated RSC cartons and kraft mailers on packing table)
- **Task 2: Sortation Rack with Occlusion** (Items hidden behind totes; tests partial visibility rule)
- **Task 3: Inbound Pallet Staging & Damaged Carton** (Timber GMA pallet with crushed corner package)
- **Task 4: High-Speed Polybag Sortation Chute** (Overlapping flexible polybags on stainless steel slide)
- **Task 5: Quality Audit & Damaged Package Station** (Punctured cartons with exposed cushioning)
- **Task 6: High-Speed Roller Conveyor & Truncation** (Conveyor packages with frame-edge truncation)
- **Task 7: Robotics Mobile Drive Stow Pod** (Multi-compartment pod with dense item packing)
- **Task 8: End-of-Arm Robotic Stacking & Palletizing** (Heavy carton palletizing with crushed box detection)
- **Custom Image Upload**: Test and annotate real warehouse photographs or custom mockups.

### 2. Ergonomic Annotation Canvas
- **Drawing & Editing**: Click-and-drag drawing, interactive 8-point resize handles, and box drag-to-move.
- **Undo / Redo Stack**: Multi-level state history (`Ctrl+Z`, `Ctrl+Y`).
- **Rapid Keyboard Shortcuts**:
  - `1`: Cardboard Box
  - `2`: Polybag
  - `3`: Envelope
  - `4`: Tote Bin
  - `5`: Pallet
  - `6`: Damaged Package
  - `Delete` / `Backspace`: Remove selected box
  - `Enter`: Submit & run automated audit
  - `D`: Draw tool / `S`: Select tool

### 3. Inspection & Defect Audit Review Mode
- Visual overlay comparing **Ground Truth (green dashed)** vs. **User Annotations (blue solid)**.
- Color-coded defect flags highlighting missed items, extra boxes, and loose boundaries.
- Dedicated toggles to isolate ground truth, user boxes, or error flags.

### 4. Comprehensive Quality Dashboard
- **KPI Cards**: Average Quality Score, Tasks Completed, Cycle Time per Task, and Annotations per Hour.
- **Trend Charts**: Vector SVG line chart showing accuracy progression across tasks with an 80% passing benchmark.
- **Defect Distribution**: Vector SVG bar chart breaking down errors by category.
- **Multi-Format Export**: One-click export to **JSON**, **CSV**, and **Printable HTML / PDF Quality Audit Reports**.

### 5. Standard Operating Procedure (SOP) Guidelines
- Built-in guideline tab detailing the Tight Box Rule, Occlusion Criteria, Truncation Handling, and Damage Escalation.

---

## 🖼️ Application Screenshots (Interface Layout)

```
+---------------------------------------------------------------------------------------------------+
| [GO-AI] Annotation Practice Studio    [Annotation Studio]  [QA Dashboard]  [Guidelines]  [Shortcuts] |
+-----------------------+---------------------------------------------------+-----------------------+
| TASK QUEUE            | CANVAS VIEWPORT                                   | BOX INSPECTOR         |
|                       | Task 1: Packing Station Infeed            ⏱️ 01:24 | Object Label: [1-6]   |
| [1] Packing Table     | [✏️ Draw] [✋ Select] [↩️ Undo] [↪️ Redo] [🗑️ Clear] | [ Cardboard Box    v] |
|     Score: 92% (Pass) | +-----------------------------------------------+ | Attributes:           |
| [2] Sortation Rack    | |                                               | | [ ] Occluded          |
|     Score: 84% (Pass) | |      [User Box: Blue]                         | | [ ] Truncated         |
| [3] Pallet Staging    | |        +-------------+                        | | [ ] Damaged           |
|     Status: Pending   | |        |             |  [GT: Green Dashed]    |                       |
| [4] Chute Slide       | |        |  Cardboard  |    +---------+         | BOXES ON CANVAS (3)   |
|     Status: Pending   | |        +-------------+    |  Tote   |         | #1 Cardboard Box      |
| [5] QA Damaged Dock   | |                           +---------+         | #2 Envelope           |
|     Status: Pending   | |                                               | #3 Polybag            |
| ...                   | +-----------------------------------------------+ |                       |
|                       | 🔍 Review: [x] Ground Truth  [x] Errors         | [🚀 Submit & Audit]   |
| [📁 Upload Image]     |                                                   | Score: 91.4% (AUDIT)  |
+-----------------------+---------------------------------------------------+-----------------------+
```

---

## 💻 How to Run Locally

Because the project uses purely vanilla technologies with zero dependencies, running it requires no installation:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/go-ai-annotation-studio.git
   cd go-ai-annotation-studio
   ```

2. Open `index.html` directly in any modern web browser:
   - **Double-click** `index.html` in File Explorer, or
   - Right-click and choose **Open with > Google Chrome / Microsoft Edge / Firefox**.

3. *(Optional)* If you prefer serving it via a local HTTP server:
   ```bash
   # Using Python 3 (if installed)
   python -m http.server 8000
   
   # Or using Node.js npx
   npx serve .
   ```
   Then navigate to `http://localhost:8000`.

---

## 🌐 How to Deploy to GitHub Pages (Free Hosting)

Deploy in under 2 minutes:

1. Create a new public repository on GitHub (e.g., `go-ai-annotation-studio`).
2. Push your files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: GO-AI Annotation Practice Studio"
   git branch -M main
   git remote add origin https://github.com/your-username/go-ai-annotation-studio.git
   git push -u origin main
   ```
3. On GitHub, navigate to your repository **Settings** > **Pages** (left sidebar).
4. Under **Build and deployment** > **Branch**:
   - Select `main` as the source branch.
   - Select `/ (root)` as the folder.
   - Click **Save**.
5. Your live portfolio app will be accessible at:  
   `https://your-username.github.io/go-ai-annotation-studio/`

---

## 🧪 Built-in Unit Verification Tests

To verify mathematical accuracy and compliance with anti-hallucination standards:
1. Open the app in your browser.
2. Open Developer Tools (`F12` or `Ctrl+Shift+I`) and go to the **Console** tab.
3. The automated test suite runs on initialization, or you can invoke it manually:
   ```javascript
   window.ScoringModule.runScoringTests();
   ```
4. Output format:
   ```
   [PASS] Perfect Match IoU is 1.0
   [PASS] Zero Overlap IoU is 0.0
   [PASS] Known partial overlap IoU is 1/3
   [PASS] Single Perfect Annotation produces 100% Score
   [PASS] Mismatched label detected as wrong_label error
   [PASS] Loose box (0.667 IoU) triggers imperfect_box warning

   ======================================================
   RESULT: 6/6 tests passed
   SOURCE: ScoringModule.runScoringTests()
   STATUS: VERIFIED
   ======================================================
   ```

---

## 📁 Repository Structure

```text
├── index.html                # Main application single-page structure
├── css/
│   └── style.css             # Theme palettes, 3-column layout, responsive styles
├── data/
│   └── ground_truth.json     # Machine-readable ground truth dataset for 8 tasks
├── js/
│   ├── ground_truth_data.js  # Offline-first ground truth repository
│   ├── guidelines.js         # Amazon GO-AI operational SOP definitions
│   ├── storage.js            # LocalStorage persistence & JSON/CSV/HTML reporting
│   ├── scoring.js            # IoU math, greedy bipartite matching & verification tests
│   ├── canvas.js             # Vector fulfillment scene graphics & box interaction
│   ├── dashboard.js          # KPI computation & dynamic SVG analytics charts
│   └── app.js                # Master coordinator, timer, shortcuts & view routing
├── AGENTS.md                 # Anti-hallucination and data integrity protocols
└── README.md                 # Complete documentation and portfolio overview
```

---

## 📄 License & Attribution
Developed for educational, portfolio, and interview demonstration purposes representing the Human-in-the-Loop workflows of Amazon Robotics Global Operations - Artificial Intelligence (GO-AI).
