/**
 * GO-AI Annotation Practice Studio - Performance Dashboard & Metrics Visualizer
 * Calculates QA KPI metrics (mIoU, F1, throughput, defect distribution)
 * and renders interactive vector SVG charts.
 */

const DashboardModule = (function () {
  function renderDashboard(containerId, onTaskSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const submissions = StorageModule.getAllSubmissions();
    const tasks = (window.GROUND_TRUTH_DATA && window.GROUND_TRUTH_DATA.tasks) || [];

    // Calculate aggregated metrics
    let completedCount = 0;
    let totalScore = 0;
    let totalTimeSec = 0;
    let totalAnnotations = 0;

    let errorCounts = {
      missed: 0,
      extra: 0,
      wrong_label: 0,
      imperfect_box: 0
    };

    const taskTrendData = [];

    tasks.forEach((t, idx) => {
      const sub = submissions[t.id];
      if (sub && sub.overallScore != null) {
        completedCount++;
        totalScore += sub.overallScore;
        totalTimeSec += sub.durationSeconds || 0;
        totalAnnotations += (sub.userBoxes && sub.userBoxes.length) || 0;

        if (sub.errors) {
          sub.errors.forEach(e => {
            if (errorCounts[e.type] !== undefined) {
              errorCounts[e.type]++;
            }
          });
        }

        taskTrendData.push({
          taskId: t.id,
          taskNum: idx + 1,
          score: sub.overallScore,
          mIoU: sub.mIoU * 100,
          f1: sub.f1 * 100
        });
      } else {
        taskTrendData.push({
          taskId: t.id,
          taskNum: idx + 1,
          score: null,
          mIoU: null,
          f1: null
        });
      }
    });

    const avgScore = completedCount > 0 ? (totalScore / completedCount).toFixed(1) : "0.0";
    const avgTimePerTask = completedCount > 0 ? Math.round(totalTimeSec / completedCount) : 0;
    const annotationsPerHour = totalTimeSec > 0 ? Math.round((totalAnnotations / totalTimeSec) * 3600) : 0;
    const totalDefects = errorCounts.missed + errorCounts.extra + errorCounts.wrong_label + errorCounts.imperfect_box;

    container.innerHTML = `
      <div class="dashboard-wrapper">
        <div class="dash-header">
          <div>
            <h2 class="dash-title">GO-AI Quality & Productivity Analytics</h2>
            <p class="dash-subtitle">Human-in-the-Loop Performance Audit against Ground Truth Standards</p>
          </div>
          <div class="dash-actions">
            <button id="btn-export-html" class="btn btn-outline">🖨️ Quality Audit Report</button>
            <button id="btn-export-csv" class="btn btn-outline">📊 Export CSV</button>
            <button id="btn-export-json" class="btn btn-outline">💾 Export JSON</button>
            <button id="btn-reset-data" class="btn btn-danger-outline">🔄 Reset Progress</button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon">🎯</div>
            <div class="kpi-info">
              <span class="kpi-label">Average Quality</span>
              <span class="kpi-val ${avgScore >= 80 ? 'text-success' : 'text-warning'}">${avgScore}%</span>
              <span class="kpi-target">Target: ≥ 80.0%</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon">📋</div>
            <div class="kpi-info">
              <span class="kpi-label">Tasks Completed</span>
              <span class="kpi-val">${completedCount} <span class="kpi-total">/ ${tasks.length}</span></span>
              <span class="kpi-target">${((completedCount / tasks.length) * 100).toFixed(0)}% Queue Complete</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon">⏱️</div>
            <div class="kpi-info">
              <span class="kpi-label">Avg Time / Task</span>
              <span class="kpi-val">${avgTimePerTask}s</span>
              <span class="kpi-target">Cycle time benchmark: ≤ 90s</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon">⚡</div>
            <div class="kpi-info">
              <span class="kpi-label">Throughput</span>
              <span class="kpi-val">${annotationsPerHour}</span>
              <span class="kpi-target">Annotations / Hour</span>
            </div>
          </div>
        </div>

        <!-- SVG Analytics Charts -->
        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-header">
              <h3>Accuracy Trend Across Task Queue</h3>
              <span class="legend-badge"><span class="dot dot-pass"></span> Quality Score %</span>
            </div>
            <div class="chart-body" id="trend-chart-container">
              ${renderTrendSVGChart(taskTrendData)}
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <h3>Defect Distribution Breakdown</h3>
              <span class="badge-total">${totalDefects} Total Flagged</span>
            </div>
            <div class="chart-body" id="defect-chart-container">
              ${renderDefectBarSVGChart(errorCounts)}
            </div>
          </div>
        </div>

        <!-- Task Performance Breakdown Table -->
        <div class="table-card">
          <div class="table-header">
            <h3>Queue Task Performance Matrix</h3>
          </div>
          <div class="table-responsive">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Score</th>
                  <th>mIoU</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1 Score</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${tasks.map((t, idx) => {
                  const sub = submissions[t.id];
                  if (!sub) {
                    return `
                      <tr>
                        <td><strong>${t.title}</strong></td>
                        <td><span class="category-pill">${t.category}</span></td>
                        <td><span class="badge-diff ${t.difficulty.toLowerCase()}">${t.difficulty}</span></td>
                        <td colspan="6" class="text-muted text-center">Not started yet</td>
                        <td><button class="btn-table-start" data-task-id="${t.id}">Start Task</button></td>
                      </tr>
                    `;
                  }
                  const scoreClass = sub.overallScore >= 80 ? 'text-success' : sub.overallScore >= 60 ? 'text-warning' : 'text-danger';
                  return `
                    <tr>
                      <td><strong>${t.title}</strong></td>
                      <td><span class="category-pill">${t.category}</span></td>
                      <td><span class="badge-diff ${t.difficulty.toLowerCase()}">${t.difficulty}</span></td>
                      <td class="${scoreClass}"><strong>${sub.overallScore.toFixed(1)}%</strong></td>
                      <td>${(sub.mIoU * 100).toFixed(1)}%</td>
                      <td>${(sub.precision * 100).toFixed(1)}%</td>
                      <td>${(sub.recall * 100).toFixed(1)}%</td>
                      <td>${(sub.f1 * 100).toFixed(1)}%</td>
                      <td>${sub.durationSeconds || 0}s</td>
                      <td><button class="btn-table-review" data-task-id="${t.id}">Review Task</button></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Hook up buttons
    document.getElementById('btn-export-html').addEventListener('click', () => StorageModule.openPrintableHTMLReport());
    document.getElementById('btn-export-csv').addEventListener('click', () => StorageModule.exportCSVReport());
    document.getElementById('btn-export-json').addEventListener('click', () => StorageModule.exportJSONReport());
    document.getElementById('btn-reset-data').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all progress, scores, and annotations? This cannot be undone.')) {
        StorageModule.resetAllProgress();
        renderDashboard(containerId, onTaskSelect);
        if (onTaskSelect) onTaskSelect(null, true);
      }
    });

    // Task table clicks
    container.querySelectorAll('.btn-table-start, .btn-table-review').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.currentTarget.getAttribute('data-task-id');
        if (onTaskSelect && taskId) {
          onTaskSelect(taskId);
        }
      });
    });
  }

  function renderTrendSVGChart(trendData) {
    const width = 500;
    const height = 180;
    const padding = { top: 20, right: 30, bottom: 30, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const benchmarkY = padding.top + chartH * (1 - 0.80);

    const stepX = chartW / Math.max(1, trendData.length - 1);

    const points = [];
    trendData.forEach((d, i) => {
      if (d.score !== null) {
        const px = padding.left + i * stepX;
        const py = padding.top + chartH * (1 - d.score / 100);
        points.push({ x: px, y: py, ...d });
      }
    });

    let polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');

    return `
      <svg viewBox="0 0 ${width} ${height}" class="svg-chart">
        <!-- Grid lines -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="var(--border-subtle)" stroke-dasharray="3,3" />
        <line x1="${padding.left}" y1="${benchmarkY}" x2="${width - padding.right}" y2="${benchmarkY}" stroke="#10b981" stroke-dasharray="4,4" stroke-width="1.5" />
        <text x="${width - padding.right}" y="${benchmarkY - 4}" fill="#10b981" font-size="10" text-anchor="end">80% Pass Benchmark</text>
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="var(--border-color)" />

        <!-- Y Axis labels -->
        <text x="${padding.left - 6}" y="${padding.top + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">100%</text>
        <text x="${padding.left - 6}" y="${benchmarkY + 3}" fill="#10b981" font-size="10" text-anchor="end">80%</text>
        <text x="${padding.left - 6}" y="${padding.top + chartH}" fill="var(--text-muted)" font-size="10" text-anchor="end">0%</text>

        <!-- Trend Line -->
        ${points.length > 1 ? `<polyline fill="none" stroke="#3b82f6" stroke-width="3" points="${polylineStr}" />` : ''}

        <!-- Data points & X axis -->
        ${trendData.map((d, i) => {
          const cx = padding.left + i * stepX;
          const hasScore = d.score !== null;
          const cy = hasScore ? (padding.top + chartH * (1 - d.score / 100)) : (padding.top + chartH);
          return `
            <g>
              <line x1="${cx}" y1="${padding.top + chartH}" x2="${cx}" y2="${padding.top + chartH + 4}" stroke="var(--border-color)" />
              <text x="${cx}" y="${padding.top + chartH + 16}" fill="var(--text-muted)" font-size="10" text-anchor="middle">T${d.taskNum}</text>
              ${hasScore ? `
                <circle cx="${cx}" cy="${cy}" r="5" fill="#3b82f6" stroke="#ffffff" stroke-width="2" />
                <text x="${cx}" y="${cy - 8}" fill="var(--text-primary)" font-size="10" font-weight="bold" text-anchor="middle">${d.score.toFixed(0)}%</text>
              ` : `
                <circle cx="${cx}" cy="${padding.top + chartH}" r="3" fill="var(--border-color)" />
              `}
            </g>
          `;
        }).join('')}
      </svg>
    `;
  }

  function renderDefectBarSVGChart(counts) {
    const width = 500;
    const height = 180;
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const data = [
      { key: 'missed', label: 'Missed (FN)', count: counts.missed, color: '#ef4444' },
      { key: 'extra', label: 'Extra Box (FP)', count: counts.extra, color: '#f59e0b' },
      { key: 'wrong_label', label: 'Wrong Label', count: counts.wrong_label, color: '#dc2626' },
      { key: 'imperfect_box', label: 'Loose / Tight', count: counts.imperfect_box, color: '#38bdf8' }
    ];

    const maxCount = Math.max(5, ...data.map(d => d.count));
    const barWidth = chartW / data.length - 30;

    return `
      <svg viewBox="0 0 ${width} ${height}" class="svg-chart">
        <!-- Baseline -->
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="var(--border-color)" />

        ${data.map((d, idx) => {
          const x = padding.left + idx * (chartW / data.length) + 15;
          const barH = (d.count / maxCount) * chartH;
          const y = padding.top + chartH - barH;
          return `
            <g>
              <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="${d.color}" />
              <text x="${x + barWidth / 2}" y="${y - 6}" fill="var(--text-primary)" font-size="11" font-weight="bold" text-anchor="middle">${d.count}</text>
              <text x="${x + barWidth / 2}" y="${padding.top + chartH + 18}" fill="var(--text-muted)" font-size="10" text-anchor="middle">${d.label}</text>
            </g>
          `;
        }).join('')}
      </svg>
    `;
  }

  return {
    renderDashboard
  };
})();

// Expose on window
window.DashboardModule = DashboardModule;
