/**
 * GO-AI Annotation Practice Studio - Main Application Controller
 * Orchestrates task queue, timer, canvas toolset, inspector, scoring, guidelines, and views.
 */

(function () {
  // App State
  let tasks = [];
  let currentTaskId = 'task-1';
  let isCustomImageMode = false;
  let activeTab = 'studio'; // 'studio' | 'dashboard' | 'guidelines'

  // Timer state
  let timerInterval = null;
  let taskSeconds = 0;
  let isTimerRunning = false;

  // Cache DOM elements
  const el = {};

  document.addEventListener('DOMContentLoaded', initApp);

  function initApp() {
    bindDOMElements();
    initTheme();
    setupCanvas();
    loadTasksData();
    setupEventListeners();
    setupKeyboardShortcuts();
    renderGuidelinesTab();

    // Run scoring verification tests in console
    if (window.ScoringModule && window.ScoringModule.runScoringTests) {
      window.ScoringModule.runScoringTests();
    }
  }

  function bindDOMElements() {
    el.appContainer = document.getElementById('app-container');
    el.themeToggleBtn = document.getElementById('theme-toggle-btn');
    el.shortcutsBtn = document.getElementById('shortcuts-btn');
    el.shortcutsModal = document.getElementById('shortcuts-modal');
    el.closeShortcutsModal = document.getElementById('close-shortcuts-modal');

    // Guided Tour Modal
    el.tourBtn = document.getElementById('tour-btn');
    el.tourModal = document.getElementById('tour-modal');
    el.closeTourModal = document.getElementById('close-tour-modal');
    el.tourStartBtn = document.getElementById('tour-start-btn');

    // Navigation Tabs
    el.tabStudioBtn = document.getElementById('tab-studio-btn');
    el.tabDashboardBtn = document.getElementById('tab-dashboard-btn');
    el.tabGuidelinesBtn = document.getElementById('tab-guidelines-btn');

    el.viewStudio = document.getElementById('view-studio');
    el.viewDashboard = document.getElementById('view-dashboard');
    el.viewGuidelines = document.getElementById('view-guidelines');

    // Sidebar
    el.taskListContainer = document.getElementById('task-list-container');
    el.uploadImageInput = document.getElementById('upload-image-input');
    el.uploadImageBtn = document.getElementById('upload-image-btn');

    // Canvas & Toolbar
    el.toolDrawBtn = document.getElementById('tool-draw-btn');
    el.toolSelectBtn = document.getElementById('tool-select-btn');
    el.toolUndoBtn = document.getElementById('tool-undo-btn');
    el.toolRedoBtn = document.getElementById('tool-redo-btn');
    el.toolClearBtn = document.getElementById('tool-clear-btn');

    el.taskTitleHeader = document.getElementById('task-title-header');
    el.taskCategoryBadge = document.getElementById('task-category-badge');
    el.taskDifficultyBadge = document.getElementById('task-difficulty-badge');
    el.taskDescriptionText = document.getElementById('task-description-text');
    el.taskTimerDisplay = document.getElementById('task-timer-display');

    // Review controls
    el.reviewControlsBar = document.getElementById('review-controls-bar');
    el.toggleGtCheckbox = document.getElementById('toggle-gt-checkbox');
    el.toggleUserCheckbox = document.getElementById('toggle-user-checkbox');
    el.toggleErrorsCheckbox = document.getElementById('toggle-errors-checkbox');
    el.exitReviewBtn = document.getElementById('exit-review-btn');

    // Right Inspector Panel
    el.inspectorEmptyState = document.getElementById('inspector-empty-state');
    el.inspectorActiveBox = document.getElementById('inspector-active-box');
    el.boxLabelSelect = document.getElementById('box-label-select');
    el.attrOccluded = document.getElementById('attr-occluded');
    el.attrTruncated = document.getElementById('attr-truncated');
    el.attrDamaged = document.getElementById('attr-damaged');
    el.boxCoordsDisplay = document.getElementById('box-coords-display');
    el.deleteBoxBtn = document.getElementById('delete-box-btn');

    el.boxListContainer = document.getElementById('box-list-container');
    el.boxCountBadge = document.getElementById('box-count-badge');

    // Submit & Results
    el.submitTaskBtn = document.getElementById('submit-task-btn');
    el.scoreResultsCard = document.getElementById('score-results-card');
  }

  function initTheme() {
    const savedTheme = StorageModule.getTheme();
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    el.themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      StorageModule.setTheme(next);
      updateThemeIcon(next);
    });
  }

  function updateThemeIcon(theme) {
    el.themeToggleBtn.innerHTML = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
  }

  function loadTasksData() {
    // Prefer offline window.GROUND_TRUTH_DATA; fallback to fetch if served via HTTP
    if (window.GROUND_TRUTH_DATA && window.GROUND_TRUTH_DATA.tasks) {
      tasks = window.GROUND_TRUTH_DATA.tasks;
      renderTaskList();
      loadTask(tasks[0].id);
    } else {
      fetch('data/ground_truth.json')
        .then(res => res.json())
        .then(data => {
          tasks = data.tasks;
          renderTaskList();
          loadTask(tasks[0].id);
        })
        .catch(err => {
          console.error('Failed to load ground truth JSON:', err);
        });
    }
  }

  function setupCanvas() {
    CanvasModule.init('main-scene-canvas', 'overlay-canvas', {
      onBoxSelectionChanged: handleBoxSelectionChanged,
      onBoxesChanged: handleBoxesChanged
    });
  }

  function setupEventListeners() {
    // Navigation Tabs
    el.tabStudioBtn.addEventListener('click', () => switchTab('studio'));
    el.tabDashboardBtn.addEventListener('click', () => {
      switchTab('dashboard');
      DashboardModule.renderDashboard('view-dashboard', (taskId, reset) => {
        if (reset) {
          renderTaskList();
          loadTask(tasks[0].id);
        } else if (taskId) {
          switchTab('studio');
          loadTask(taskId);
        }
      });
    });
    el.tabGuidelinesBtn.addEventListener('click', () => switchTab('guidelines'));

    // Canvas tools
    el.toolDrawBtn.addEventListener('click', () => {
      setTool('draw');
    });
    el.toolSelectBtn.addEventListener('click', () => {
      setTool('select');
    });
    el.toolUndoBtn.addEventListener('click', () => CanvasModule.undo());
    el.toolRedoBtn.addEventListener('click', () => CanvasModule.redo());
    el.toolClearBtn.addEventListener('click', () => {
      if (confirm('Clear all bounding boxes for this task?')) {
        CanvasModule.clearAllBoxes();
      }
    });

    // Custom Image upload
    el.uploadImageBtn.addEventListener('click', () => el.uploadImageInput.click());
    el.uploadImageInput.addEventListener('change', handleCustomImageUpload);

    // Inspector events
    el.boxLabelSelect.addEventListener('change', (e) => {
      CanvasModule.updateSelectedBoxLabel(e.target.value);
    });

    [el.attrOccluded, el.attrTruncated, el.attrDamaged].forEach(chk => {
      chk.addEventListener('change', () => {
        CanvasModule.updateSelectedBoxAttributes({
          occluded: el.attrOccluded.checked,
          truncated: el.attrTruncated.checked,
          damaged: el.attrDamaged.checked
        });
      });
    });

    el.deleteBoxBtn.addEventListener('click', () => CanvasModule.deleteSelectedBox());

    // Submit button
    el.submitTaskBtn.addEventListener('click', handleSubmitTask);

    // Review toggles
    el.toggleGtCheckbox.addEventListener('change', updateReviewToggles);
    el.toggleUserCheckbox.addEventListener('change', updateReviewToggles);
    el.toggleErrorsCheckbox.addEventListener('change', updateReviewToggles);
    el.exitReviewBtn.addEventListener('click', () => {
      CanvasModule.setReviewMode(false, null);
      el.reviewControlsBar.classList.add('hidden');
    });

    // Shortcuts modal
    el.shortcutsBtn.addEventListener('click', () => el.shortcutsModal.classList.remove('hidden'));
    el.closeShortcutsModal.addEventListener('click', () => el.shortcutsModal.classList.add('hidden'));

    // Guided Tour modal
    if (el.tourBtn) {
      el.tourBtn.addEventListener('click', () => el.tourModal.classList.remove('hidden'));
    }
    if (el.closeTourModal) {
      el.closeTourModal.addEventListener('click', () => el.tourModal.classList.add('hidden'));
    }
    if (el.tourStartBtn) {
      el.tourStartBtn.addEventListener('click', () => {
        el.tourModal.classList.add('hidden');
        if (tasks && tasks.length > 0) loadTask(tasks[0].id);
      });
    }

    window.addEventListener('click', (e) => {
      if (e.target === el.shortcutsModal) el.shortcutsModal.classList.add('hidden');
      if (e.target === el.tourModal) el.tourModal.classList.add('hidden');
    });

    // Window Visibility Change (Pause timer when user changes tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pauseTimer();
      } else {
        resumeTimer();
      }
    });
  }

  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      // 1-6 label selection
      const keyMap = {
        '1': 'Cardboard Box',
        '2': 'Polybag',
        '3': 'Envelope',
        '4': 'Tote',
        '5': 'Pallet',
        '6': 'Damaged Package'
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        CanvasModule.updateSelectedBoxLabel(keyMap[e.key]);
        el.boxLabelSelect.value = keyMap[e.key];
        return;
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        CanvasModule.deleteSelectedBox();
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        CanvasModule.undo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        CanvasModule.redo();
        return;
      }

      // Enter to Submit
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitTask();
        return;
      }

      // D for draw, S for select
      if (e.key.toLowerCase() === 'd') {
        setTool('draw');
      } else if (e.key.toLowerCase() === 's') {
        setTool('select');
      }
    });
  }

  function setTool(tool) {
    if (tool === 'draw') {
      el.toolDrawBtn.classList.add('active');
      el.toolSelectBtn.classList.remove('active');
      CanvasModule.setActiveTool('draw');
    } else {
      el.toolSelectBtn.classList.add('active');
      el.toolDrawBtn.classList.remove('active');
      CanvasModule.setActiveTool('select');
    }
  }

  function switchTab(tab) {
    activeTab = tab;
    el.tabStudioBtn.classList.toggle('active', tab === 'studio');
    el.tabDashboardBtn.classList.toggle('active', tab === 'dashboard');
    el.tabGuidelinesBtn.classList.toggle('active', tab === 'guidelines');

    el.viewStudio.classList.toggle('hidden', tab !== 'studio');
    el.viewDashboard.classList.toggle('hidden', tab !== 'dashboard');
    el.viewGuidelines.classList.toggle('hidden', tab !== 'guidelines');

    if (tab === 'studio') {
      resumeTimer();
    } else {
      pauseTimer();
    }
  }

  function renderTaskList() {
    const submissions = StorageModule.getAllSubmissions();

    el.taskListContainer.innerHTML = tasks.map((t, idx) => {
      const isCurrent = (t.id === currentTaskId && !isCustomImageMode);
      const sub = submissions[t.id];
      const isSubmitted = Boolean(sub);
      const scoreBadge = isSubmitted
        ? `<span class="task-score-pill ${sub.overallScore >= 80 ? 'pill-pass' : 'pill-warn'}">${sub.overallScore.toFixed(0)}%</span>`
        : `<span class="task-status-pill">Pending</span>`;

      return `
        <div class="task-item ${isCurrent ? 'active' : ''} ${isSubmitted ? 'submitted' : ''}" data-task-id="${t.id}">
          <div class="task-item-top">
            <span class="task-index">#${idx + 1}</span>
            <span class="task-item-title">${t.title.replace(/^Task \d+:\s*/, '')}</span>
          </div>
          <div class="task-item-meta">
            <span class="task-item-cat">${t.category}</span>
            ${scoreBadge}
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to task items
    el.taskListContainer.querySelectorAll('.task-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const taskId = e.currentTarget.getAttribute('data-task-id');
        loadTask(taskId);
      });
    });
  }

  function loadTask(taskId) {
    currentTaskId = taskId;
    isCustomImageMode = false;

    // Reset review controls
    el.reviewControlsBar.classList.add('hidden');
    el.scoreResultsCard.classList.add('hidden');

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Header info
    el.taskTitleHeader.innerText = task.title;
    el.taskCategoryBadge.innerText = task.category;
    el.taskDifficultyBadge.innerText = task.difficulty;
    el.taskDifficultyBadge.className = `badge-diff ${task.difficulty.toLowerCase()}`;
    el.taskDescriptionText.innerText = task.description;

    // Load scene into canvas
    CanvasModule.loadTaskScene(task);

    // Load saved draft or past submission boxes
    const submission = StorageModule.getTaskSubmission(taskId);
    const draft = StorageModule.getUserDraft(taskId);

    if (submission && submission.userBoxes) {
      CanvasModule.setBoxes(submission.userBoxes);
      displayScoreResults(submission, true);
    } else if (draft) {
      CanvasModule.setBoxes(draft);
    } else {
      CanvasModule.setBoxes([]);
    }

    // Start / restore timer
    taskSeconds = StorageModule.getTimeSpent(taskId) || 0;
    updateTimerDisplay();
    startTimer();

    renderTaskList();
    setTool('draw');
  }

  function handleCustomImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        isCustomImageMode = true;
        currentTaskId = 'custom';

        el.taskTitleHeader.innerText = `Custom Image: ${file.name}`;
        el.taskCategoryBadge.innerText = 'User Upload';
        el.taskDifficultyBadge.innerText = 'Unscored Sandbox';
        el.taskDifficultyBadge.className = 'badge-diff easy';
        el.taskDescriptionText.innerText = 'Draw, inspect, and export bounding boxes on your custom image. Note: Automated ground truth evaluation is disabled for custom uploads.';

        el.reviewControlsBar.classList.add('hidden');
        el.scoreResultsCard.classList.add('hidden');

        CanvasModule.loadCustomImage(img);
        CanvasModule.setBoxes([]);

        taskSeconds = 0;
        updateTimerDisplay();
        startTimer();

        // Deselect task list items
        el.taskListContainer.querySelectorAll('.task-item').forEach(i => i.classList.remove('active'));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset file input
  }

  // -------------------------------------------------------------
  // TIMER FUNCTIONS
  // -------------------------------------------------------------
  function startTimer() {
    clearInterval(timerInterval);
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      taskSeconds++;
      updateTimerDisplay();
      if (!isCustomImageMode) {
        StorageModule.saveTimeSpent(currentTaskId, taskSeconds);
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!isTimerRunning) return;
    clearInterval(timerInterval);
    isTimerRunning = false;
  }

  function resumeTimer() {
    if (isTimerRunning || activeTab !== 'studio') return;
    startTimer();
  }

  function updateTimerDisplay() {
    const mins = Math.floor(taskSeconds / 60).toString().padStart(2, '0');
    const secs = (taskSeconds % 60).toString().padStart(2, '0');
    el.taskTimerDisplay.innerText = `${mins}:${secs}`;
  }

  // -------------------------------------------------------------
  // CANVAS CALLBACKS & INSPECTOR
  // -------------------------------------------------------------
  function handleBoxSelectionChanged(selectedBox) {
    if (!selectedBox) {
      el.inspectorEmptyState.classList.remove('hidden');
      el.inspectorActiveBox.classList.add('hidden');
      return;
    }

    el.inspectorEmptyState.classList.add('hidden');
    el.inspectorActiveBox.classList.remove('hidden');

    el.boxLabelSelect.value = selectedBox.label;
    el.attrOccluded.checked = Boolean(selectedBox.attributes && selectedBox.attributes.occluded);
    el.attrTruncated.checked = Boolean(selectedBox.attributes && selectedBox.attributes.truncated);
    el.attrDamaged.checked = Boolean(selectedBox.attributes && selectedBox.attributes.damaged);

    const b = selectedBox.box;
    el.boxCoordsDisplay.innerText = `X: ${b.x}px  Y: ${b.y}px  W: ${b.width}px  H: ${b.height}px`;

    // Highlight row in box list
    renderBoxList();
  }

  function handleBoxesChanged(boxes) {
    // Save draft
    if (!isCustomImageMode) {
      StorageModule.saveUserDraft(currentTaskId, boxes);
    }
    renderBoxList();
  }

  function renderBoxList() {
    const boxes = CanvasModule.getBoxes();
    el.boxCountBadge.innerText = `${boxes.length}`;

    if (boxes.length === 0) {
      el.boxListContainer.innerHTML = `<div class="empty-list-note">No boxes drawn. Click and drag on the image to annotate.</div>`;
      return;
    }

    el.boxListContainer.innerHTML = boxes.map((b, idx) => {
      const color = CanvasModule.LABEL_COLORS[b.label] || '#3b82f6';
      return `
        <div class="box-list-row" data-box-id="${b.id}">
          <div class="box-list-info">
            <span class="box-color-bullet" style="background-color: ${color};"></span>
            <span class="box-row-label">#${idx + 1} ${b.label}</span>
            <span class="box-row-dim">${b.box.width}×${b.box.height}</span>
          </div>
          <button class="btn-box-delete" title="Delete Box" data-box-id="${b.id}">✕</button>
        </div>
      `;
    }).join('');

    // Attach row select & delete
    el.boxListContainer.querySelectorAll('.box-list-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-box-delete')) return;
        const boxId = row.getAttribute('data-box-id');
        CanvasModule.setSelectedBox(boxId);
      });
    });

    el.boxListContainer.querySelectorAll('.btn-box-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const boxId = btn.getAttribute('data-box-id');
        CanvasModule.setSelectedBox(boxId);
        CanvasModule.deleteSelectedBox();
      });
    });
  }

  // -------------------------------------------------------------
  // SUBMISSION & SCORING
  // -------------------------------------------------------------
  function handleSubmitTask() {
    if (isCustomImageMode) {
      // Export custom annotations
      const boxes = CanvasModule.getBoxes();
      const exportData = {
        image: el.taskTitleHeader.innerText,
        boxCount: boxes.length,
        annotations: boxes
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `custom_annotations_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('Custom annotations exported as JSON!');
      return;
    }

    const task = tasks.find(t => t.id === currentTaskId);
    if (!task) return;

    const userBoxes = CanvasModule.getBoxes();

    if (userBoxes.length === 0) {
      if (!confirm('You have not drawn any bounding boxes! Are you sure you want to submit zero annotations?')) {
        return;
      }
    }

    // Evaluate using ScoringModule
    const evalResult = ScoringModule.evaluateAnnotations(userBoxes, task.objects);
    evalResult.durationSeconds = taskSeconds;
    evalResult.userBoxes = userBoxes;

    // Save to local storage
    StorageModule.saveTaskSubmission(currentTaskId, evalResult);

    // Update Sidebar
    renderTaskList();

    // Show Results Card
    displayScoreResults(evalResult, false);

    // Enter Review Mode automatically
    enterReviewMode(evalResult);
  }

  function displayScoreResults(evalResult, isHistorical) {
    el.scoreResultsCard.classList.remove('hidden');

    const score = evalResult.overallScore;
    const scoreColorClass = score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-danger';

    const errors = evalResult.errors || [];
    const missedCount = errors.filter(e => e.type === 'missed').length;
    const extraCount = errors.filter(e => e.type === 'extra').length;
    const wrongLabelCount = errors.filter(e => e.type === 'wrong_label').length;
    const imperfectCount = errors.filter(e => e.type === 'imperfect_box').length;

    let errorListHtml = '';
    if (errors.length === 0) {
      errorListHtml = `<div class="zero-defect-msg">✨ Zero Defects! Exceptional precision matching all ground truth specifications.</div>`;
    } else {
      errorListHtml = errors.map(err => {
        const badgeClass = err.type === 'missed' ? 'err-missed' : err.type === 'extra' ? 'err-extra' : err.type === 'wrong_label' ? 'err-label' : 'err-tight';
        return `
          <div class="error-item">
            <span class="error-badge ${badgeClass}">${err.type.toUpperCase().replace('_', ' ')}</span>
            <span class="error-desc">${err.message}</span>
          </div>
        `;
      }).join('');
    }

    el.scoreResultsCard.innerHTML = `
      <div class="score-card-header">
        <div>
          <h4>${isHistorical ? 'Historical Quality Audit' : 'Evaluation Result'}</h4>
          <span class="audit-badge ${score >= 80 ? 'badge-pass' : 'badge-audit'}">${score >= 80 ? 'AUDIT PASSED' : 'NEEDS RE-CALIBRATION'}</span>
        </div>
        <div class="score-big ${scoreColorClass}">
          ${score.toFixed(1)}%
        </div>
      </div>

      <div class="score-metrics-grid">
        <div class="score-submetric">
          <span class="submetric-name">Precision</span>
          <span class="submetric-val">${(evalResult.precision * 100).toFixed(1)}%</span>
        </div>
        <div class="score-submetric">
          <span class="submetric-name">Recall</span>
          <span class="submetric-val">${(evalResult.recall * 100).toFixed(1)}%</span>
        </div>
        <div class="score-submetric">
          <span class="submetric-name">F1 Score</span>
          <span class="submetric-val">${(evalResult.f1 * 100).toFixed(1)}%</span>
        </div>
        <div class="score-submetric">
          <span class="submetric-name">Mean IoU</span>
          <span class="submetric-val">${(evalResult.mIoU * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div class="error-breakdown-box">
        <div class="error-summary-chips">
          <span class="chip-count">FN: ${missedCount}</span>
          <span class="chip-count">FP: ${extraCount}</span>
          <span class="chip-count">Label Err: ${wrongLabelCount}</span>
          <span class="chip-count">Loose: ${imperfectCount}</span>
        </div>
        <div class="error-list-scroll">
          ${errorListHtml}
        </div>
      </div>

      <div class="score-card-footer">
        <button id="btn-toggle-review" class="btn btn-primary full-width">🔍 Toggle Ground Truth Overlay</button>
      </div>
    `;

    document.getElementById('btn-toggle-review').addEventListener('click', () => {
      enterReviewMode(evalResult);
    });
  }

  function enterReviewMode(evalResult) {
    el.reviewControlsBar.classList.remove('hidden');
    CanvasModule.setReviewMode(true, evalResult);
    updateReviewToggles();
  }

  function updateReviewToggles() {
    CanvasModule.setReviewToggles(
      el.toggleGtCheckbox.checked,
      el.toggleUserCheckbox.checked,
      el.toggleErrorsCheckbox.checked
    );
  }

  // -------------------------------------------------------------
  // GUIDELINES TAB RENDERING
  // -------------------------------------------------------------
  function renderGuidelinesTab() {
    const gl = window.ANNOTATION_GUIDELINES;
    if (!gl) return;

    el.viewGuidelines.innerHTML = `
      <div class="guidelines-wrapper">
        <div class="guidelines-header">
          <div>
            <h1 class="guidelines-title">Amazon GO-AI Operations Annotation Standard</h1>
            <p class="guidelines-sub">Standard Operating Procedure (SOP) | Machine Learning Ground Truth Data Labeling</p>
          </div>
          <span class="badge badge-sop">Standard: v${gl.version}</span>
        </div>

        <div class="guidelines-content">
          ${gl.categories.map(cat => `
            <section class="guidelines-section">
              <h2 class="section-title">${cat.title}</h2>
              ${cat.rules ? `
                <div class="rules-grid">
                  ${cat.rules.map(r => `
                    <div class="rule-card">
                      <div class="rule-card-header">
                        <h3>${r.name}</h3>
                        <span class="badge-rule">${r.badge}</span>
                      </div>
                      <p class="rule-desc">${r.description}</p>
                      ${r.goodExample ? `
                        <div class="example-box">
                          <div class="ex-good"><strong>✓ Correct:</strong> ${r.goodExample}</div>
                          <div class="ex-bad"><strong>✕ Defect:</strong> ${r.badExample}</div>
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${cat.labels ? `
                <div class="labels-grid">
                  ${cat.labels.map(l => `
                    <div class="label-card" style="border-top: 4px solid ${l.color};">
                      <div class="label-card-head">
                        <span class="label-icon">${l.icon}</span>
                        <div>
                          <h4 class="label-name" style="color: ${l.color};">${l.name}</h4>
                          <span class="label-shortcut">Shortcut Key: [${l.key}]</span>
                        </div>
                      </div>
                      <p class="label-desc">${l.description}</p>
                      <div class="label-criteria"><strong>Criterion:</strong> ${l.criteria}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </section>
          `).join('')}
        </div>
      </div>
    `;
  }

})();
