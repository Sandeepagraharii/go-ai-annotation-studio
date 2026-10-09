/**
 * GO-AI Annotation Practice Studio - Storage Module
 * Handles local persistence, progress tracking, and report exports.
 */

const StorageModule = (function () {
  const KEYS = {
    RESULTS: 'goai_task_results_v1',
    DRAFTS: 'goai_user_drafts_v1',
    TIMERS: 'goai_task_timers_v1',
    THEME: 'goai_studio_theme_v1'
  };

  function getJSON(key, defaultVal) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
      console.warn('Storage read error for key:', key, e);
      return defaultVal;
    }
  }

  function setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error for key:', key, e);
    }
  }

  return {
    // Submissions
    getAllSubmissions: function () {
      return getJSON(KEYS.RESULTS, {});
    },

    getTaskSubmission: function (taskId) {
      const all = getJSON(KEYS.RESULTS, {});
      return all[taskId] || null;
    },

    saveTaskSubmission: function (taskId, resultData) {
      const all = getJSON(KEYS.RESULTS, {});
      all[taskId] = {
        ...resultData,
        taskId: taskId,
        timestamp: new Date().toISOString()
      };
      setJSON(KEYS.RESULTS, all);
    },

    // Draft boxes while annotating
    getUserDraft: function (taskId) {
      const drafts = getJSON(KEYS.DRAFTS, {});
      return drafts[taskId] || null;
    },

    saveUserDraft: function (taskId, boxes) {
      const drafts = getJSON(KEYS.DRAFTS, {});
      drafts[taskId] = boxes;
      setJSON(KEYS.DRAFTS, drafts);
    },

    clearUserDraft: function (taskId) {
      const drafts = getJSON(KEYS.DRAFTS, {});
      delete drafts[taskId];
      setJSON(KEYS.DRAFTS, drafts);
    },

    // Timers
    getTimeSpent: function (taskId) {
      const timers = getJSON(KEYS.TIMERS, {});
      return timers[taskId] || 0;
    },

    saveTimeSpent: function (taskId, seconds) {
      const timers = getJSON(KEYS.TIMERS, {});
      timers[taskId] = Math.max(0, Math.round(seconds));
      setJSON(KEYS.TIMERS, timers);
    },

    // Theme
    getTheme: function () {
      return localStorage.getItem(KEYS.THEME) || 'dark';
    },

    setTheme: function (theme) {
      localStorage.setItem(KEYS.THEME, theme);
    },

    // Reset Progress
    resetAllProgress: function () {
      localStorage.removeItem(KEYS.RESULTS);
      localStorage.removeItem(KEYS.DRAFTS);
      localStorage.removeItem(KEYS.TIMERS);
    },

    // Export JSON Report
    exportJSONReport: function () {
      const submissions = getJSON(KEYS.RESULTS, {});
      const timers = getJSON(KEYS.TIMERS, {});
      const report = {
        candidateRole: "Associate, ML Data Operations - GO-AI Operations",
        reportType: "Human-in-the-Loop Quality Audit",
        generatedAt: new Date().toISOString(),
        tasksSummary: submissions,
        taskTimers: timers
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GO-AI_Quality_Report_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // Export CSV Report
    exportCSVReport: function () {
      const submissions = getJSON(KEYS.RESULTS, {});
      const tasks = (window.GROUND_TRUTH_DATA && window.GROUND_TRUTH_DATA.tasks) || [];

      const headers = [
        "Task ID",
        "Task Title",
        "Category",
        "Status",
        "Overall Score (%)",
        "mIoU (%)",
        "Precision (%)",
        "Recall (%)",
        "F1 Score (%)",
        "Label Accuracy (%)",
        "Duration (sec)",
        "False Negatives (Missed)",
        "False Positives (Extra)",
        "Wrong Labels",
        "Loose/Tight Boxes",
        "Submitted At"
      ];

      const rows = tasks.map(t => {
        const sub = submissions[t.id];
        if (!sub) {
          return [t.id, `"${t.title}"`, `"${t.category}"`, "Not Started", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "N/A"];
        }
        return [
          t.id,
          `"${t.title}"`,
          `"${t.category}"`,
          "Submitted",
          sub.overallScore != null ? sub.overallScore.toFixed(1) : "0",
          sub.mIoU != null ? (sub.mIoU * 100).toFixed(1) : "0",
          sub.precision != null ? (sub.precision * 100).toFixed(1) : "0",
          sub.recall != null ? (sub.recall * 100).toFixed(1) : "0",
          sub.f1 != null ? (sub.f1 * 100).toFixed(1) : "0",
          sub.labelAccuracy != null ? (sub.labelAccuracy * 100).toFixed(1) : "0",
          sub.durationSeconds || 0,
          (sub.errors && sub.errors.filter(e => e.type === 'missed').length) || 0,
          (sub.errors && sub.errors.filter(e => e.type === 'extra').length) || 0,
          (sub.errors && sub.errors.filter(e => e.type === 'wrong_label').length) || 0,
          (sub.errors && sub.errors.filter(e => e.type === 'imperfect_box').length) || 0,
          sub.timestamp || "N/A"
        ];
      });

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GO-AI_Quality_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // Printable HTML Report
    openPrintableHTMLReport: function () {
      const submissions = getJSON(KEYS.RESULTS, {});
      const tasks = (window.GROUND_TRUTH_DATA && window.GROUND_TRUTH_DATA.tasks) || [];

      let totalScore = 0;
      let completedCount = 0;
      let totalTime = 0;
      let totalAnnotations = 0;
      let totalMissed = 0;
      let totalExtra = 0;
      let totalWrongLabel = 0;
      let totalLooseTight = 0;

      tasks.forEach(t => {
        const sub = submissions[t.id];
        if (sub) {
          completedCount++;
          totalScore += sub.overallScore || 0;
          totalTime += sub.durationSeconds || 0;
          totalAnnotations += (sub.userBoxes && sub.userBoxes.length) || 0;
          if (sub.errors) {
            sub.errors.forEach(err => {
              if (err.type === 'missed') totalMissed++;
              else if (err.type === 'extra') totalExtra++;
              else if (err.type === 'wrong_label') totalWrongLabel++;
              else if (err.type === 'imperfect_box') totalLooseTight++;
            });
          }
        }
      });

      const avgScore = completedCount > 0 ? (totalScore / completedCount).toFixed(1) : "0.0";
      const avgTimeSec = completedCount > 0 ? Math.round(totalTime / completedCount) : 0;
      const ratePerHour = totalTime > 0 ? ((totalAnnotations / totalTime) * 3600).toFixed(1) : "0.0";

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Amazon GO-AI Operations - Human-in-the-Loop Quality Audit Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; margin: 0; }
    .header { border-bottom: 3px solid #ff9900; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header h1 { margin: 0; font-size: 26px; color: #0f172a; }
    .header .subtitle { color: #64748b; font-size: 14px; margin-top: 5px; }
    .badge { background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
    .card .val { font-size: 28px; font-weight: 700; color: #0f172a; margin-top: 5px; }
    .card .label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; color: #334155; }
    tr:nth-child(even) { background: #fafafa; }
    .score-pass { color: #16a34a; font-weight: bold; }
    .score-warn { color: #d97706; font-weight: bold; }
    .score-fail { color: #dc2626; font-weight: bold; }
    .print-btn { background: #ff9900; color: #0f172a; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; margin-bottom: 20px; }
    @media print { .print-btn { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <div class="header">
    <div>
      <h1>Amazon Robotics GO-AI Quality Audit Report</h1>
      <div class="subtitle">Role: Associate, ML Data Operations | Program: Packaging, Manipulation, Storage & Sortation</div>
    </div>
    <div>
      <span class="badge">AUDIT GRADE: ${avgScore >= 85 ? 'HIGH PRECISION (EXEMPLARY)' : avgScore >= 70 ? 'COMPLIANT' : 'NEEDS CALIBRATION'}</span>
    </div>
  </div>

  <div class="summary-grid">
    <div class="card">
      <div class="label">Completed Tasks</div>
      <div class="val">${completedCount} / ${tasks.length}</div>
    </div>
    <div class="card">
      <div class="label">Average Quality Score</div>
      <div class="val ${avgScore >= 80 ? 'score-pass' : 'score-warn'}">${avgScore}%</div>
    </div>
    <div class="card">
      <div class="label">Avg Time Per Task</div>
      <div class="val">${avgTimeSec}s</div>
    </div>
    <div class="card">
      <div class="label">Throughput Rate</div>
      <div class="val">${ratePerHour} /hr</div>
    </div>
  </div>

  <h3>Task Performance Breakdown</h3>
  <table>
    <thead>
      <tr>
        <th>Task</th>
        <th>Category</th>
        <th>Status</th>
        <th>Overall Score</th>
        <th>mIoU</th>
        <th>Precision</th>
        <th>Recall</th>
        <th>F1 Score</th>
        <th>Time</th>
        <th>Error Profile</th>
      </tr>
    </thead>
    <tbody>
      ${tasks.map(t => {
        const sub = submissions[t.id];
        if (!sub) {
          return `<tr><td><strong>${t.title}</strong></td><td>${t.category}</td><td><em>Pending</em></td><td colspan="7" style="color:#94a3b8; text-align:center;">Not Submitted</td></tr>`;
        }
        const scoreClass = sub.overallScore >= 85 ? 'score-pass' : sub.overallScore >= 70 ? 'score-warn' : 'score-fail';
        const errDesc = [];
        if (sub.errors) {
          const m = sub.errors.filter(e => e.type === 'missed').length;
          const fp = sub.errors.filter(e => e.type === 'extra').length;
          const wl = sub.errors.filter(e => e.type === 'wrong_label').length;
          const lt = sub.errors.filter(e => e.type === 'imperfect_box').length;
          if (m) errDesc.push(`${m} missed`);
          if (fp) errDesc.push(`${fp} extra`);
          if (wl) errDesc.push(`${wl} label mismatch`);
          if (lt) errDesc.push(`${lt} loose/tight`);
        }
        return `<tr>
          <td><strong>${t.title}</strong></td>
          <td>${t.category}</td>
          <td><span style="color:#16a34a; font-weight:bold;">Completed</span></td>
          <td class="${scoreClass}">${sub.overallScore.toFixed(1)}%</td>
          <td>${(sub.mIoU * 100).toFixed(1)}%</td>
          <td>${(sub.precision * 100).toFixed(1)}%</td>
          <td>${(sub.recall * 100).toFixed(1)}%</td>
          <td>${(sub.f1 * 100).toFixed(1)}%</td>
          <td>${sub.durationSeconds || 0}s</td>
          <td>${errDesc.length > 0 ? errDesc.join(', ') : '<span style="color:#16a34a">Zero defects</span>'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <h3>Cumulative Error Diagnostics</h3>
  <div class="summary-grid">
    <div class="card">
      <div class="label">Missed Objects (FN)</div>
      <div class="val" style="color: ${totalMissed > 0 ? '#dc2626' : '#16a34a'}">${totalMissed}</div>
    </div>
    <div class="card">
      <div class="label">Extra Boxes (FP)</div>
      <div class="val" style="color: ${totalExtra > 0 ? '#d97706' : '#16a34a'}">${totalExtra}</div>
    </div>
    <div class="card">
      <div class="label">Wrong Labels</div>
      <div class="val" style="color: ${totalWrongLabel > 0 ? '#ef4444' : '#16a34a'}">${totalWrongLabel}</div>
    </div>
    <div class="card">
      <div class="label">Loose / Tight Boxes</div>
      <div class="val" style="color: #64748b">${totalLooseTight}</div>
    </div>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; display:flex; justify-content:space-between;">
    <div>Generated by GO-AI Annotation Practice Studio | Evaluated against Amazon Ground Truth Protocols</div>
    <div>Timestamp: ${new Date().toLocaleString()}</div>
  </div>
</body>
</html>`;

      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
      } else {
        alert('Please allow popups to generate the printable report, or export via JSON/CSV.');
      }
    }
  };
})();
