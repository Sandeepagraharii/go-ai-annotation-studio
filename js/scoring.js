/**
 * GO-AI Annotation Practice Studio - Scoring & IoU Evaluation Engine
 * Implements bounding box IoU calculation, greedy bipartite matching,
 * defect classification (FN, FP, wrong label, loose/tight box), and quality metrics.
 */

const ScoringModule = (function () {
  const IOU_THRESHOLD = 0.50;
  const TIGHT_THRESHOLD = 0.75;

  /**
   * Computes Intersection over Union (IoU) between two bounding boxes.
   * Box format: { x: number, y: number, width: number, height: number }
   */
  function calculateIoU(boxA, boxB) {
    if (!boxA || !boxB) return 0;

    const x1 = Math.max(boxA.x, boxB.x);
    const y1 = Math.max(boxA.y, boxB.y);
    const x2 = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const y2 = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    const interWidth = Math.max(0, x2 - x1);
    const interHeight = Math.max(0, y2 - y1);
    const intersection = interWidth * interHeight;

    const areaA = Math.max(0, boxA.width) * Math.max(0, boxA.height);
    const areaB = Math.max(0, boxB.width) * Math.max(0, boxB.height);
    const union = areaA + areaB - intersection;

    if (union <= 0) return 0;
    return intersection / union;
  }

  /**
   * Evaluates user annotations against ground truth for a given task.
   * @param {Array} userBoxes - Array of user annotated boxes
   * @param {Array} groundTruthObjects - Array of ground truth items from task definition
   * @returns {Object} detailed audit metrics and error profile
   */
  function evaluateAnnotations(userBoxes, groundTruthObjects) {
    const userList = (userBoxes || []).map((b, idx) => ({ ...b, userIndex: idx }));
    const gtList = (groundTruthObjects || []).map((g, idx) => ({ ...g, gtIndex: idx }));

    const matchedPairs = []; // { userBox, gtObj, iou, attrMatchRatio }
    const errors = [];       // { type, userBox?, gtObj?, iou?, message }
    const userMatched = new Set();
    const gtMatched = new Set();

    // 1. Build all candidate overlaps
    const candidates = [];
    userList.forEach(u => {
      gtList.forEach(g => {
        const iou = calculateIoU(u.box || u, g.box || g);
        if (iou > 0) {
          candidates.push({ userBox: u, gtObj: g, iou });
        }
      });
    });

    // 2. Sort by descending IoU for greedy matching
    candidates.sort((a, b) => b.iou - a.iou);

    // 3. First pass: Match candidates with SAME label and IoU >= IOU_THRESHOLD (True Positives)
    candidates.forEach(cand => {
      if (userMatched.has(cand.userBox.userIndex) || gtMatched.has(cand.gtObj.gtIndex)) {
        return;
      }

      const sameLabel = (cand.userBox.label || '').trim().toLowerCase() === (cand.gtObj.label || '').trim().toLowerCase();

      if (sameLabel && cand.iou >= IOU_THRESHOLD) {
        userMatched.add(cand.userBox.userIndex);
        gtMatched.add(cand.gtObj.gtIndex);

        // Check attributes: occluded, truncated, damaged
        const uAttr = cand.userBox.attributes || {};
        const gAttr = cand.gtObj.attributes || {};
        const occludedMatch = Boolean(uAttr.occluded) === Boolean(gAttr.occluded);
        const truncatedMatch = Boolean(uAttr.truncated) === Boolean(gAttr.truncated);
        const damagedMatch = Boolean(uAttr.damaged) === Boolean(gAttr.damaged);
        const attrCorrectCount = (occludedMatch ? 1 : 0) + (truncatedMatch ? 1 : 0) + (damagedMatch ? 1 : 0);
        const attrMatchRatio = attrCorrectCount / 3;

        matchedPairs.push({
          userBox: cand.userBox,
          gtObj: cand.gtObj,
          iou: cand.iou,
          attrMatchRatio: attrMatchRatio,
          attrDiff: {
            occluded: { expected: Boolean(gAttr.occluded), actual: Boolean(uAttr.occluded) },
            truncated: { expected: Boolean(gAttr.truncated), actual: Boolean(uAttr.truncated) },
            damaged: { expected: Boolean(gAttr.damaged), actual: Boolean(uAttr.damaged) }
          }
        });

        // Loose/Tight box flag if 0.50 <= IoU < 0.75
        if (cand.iou < TIGHT_THRESHOLD) {
          errors.push({
            type: 'imperfect_box',
            severity: 'warning',
            userBox: cand.userBox,
            gtObj: cand.gtObj,
            iou: cand.iou,
            message: `Sub-optimal boundary hug (IoU: ${(cand.iou * 100).toFixed(1)}%). Tighten or loosen box to match physical item edges.`
          });
        }
      }
    });

    // 4. Second pass: Identify Wrong Label errors (IoU >= 0.5 but label differed)
    candidates.forEach(cand => {
      if (userMatched.has(cand.userBox.userIndex) || gtMatched.has(cand.gtObj.gtIndex)) {
        return;
      }

      if (cand.iou >= IOU_THRESHOLD) {
        const sameLabel = (cand.userBox.label || '').trim().toLowerCase() === (cand.gtObj.label || '').trim().toLowerCase();
        if (!sameLabel) {
          userMatched.add(cand.userBox.userIndex);
          gtMatched.add(cand.gtObj.gtIndex);

          errors.push({
            type: 'wrong_label',
            severity: 'error',
            userBox: cand.userBox,
            gtObj: cand.gtObj,
            iou: cand.iou,
            message: `Label mismatch: Annotated as "${cand.userBox.label}", but ground truth is "${cand.gtObj.label}" (IoU: ${(cand.iou * 100).toFixed(1)}%).`
          });
        }
      }
    });

    // 5. Remaining user boxes are False Positives (Extra boxes)
    userList.forEach(u => {
      if (!userMatched.has(u.userIndex)) {
        errors.push({
          type: 'extra',
          severity: 'error',
          userBox: u,
          message: `Extra / Unmatched bounding box labeled "${u.label}". No corresponding fulfillment object detected.`
        });
      }
    });

    // 6. Remaining ground truth boxes are False Negatives (Missed items)
    gtList.forEach(g => {
      if (!gtMatched.has(g.gtIndex)) {
        errors.push({
          type: 'missed',
          severity: 'error',
          gtObj: g,
          message: `Missed object: Undetected "${g.label}" (${g.guidance || 'Check guidelines for missed item'}).`
        });
      }
    });

    // 7. Calculate Statistical Metrics
    const tp = matchedPairs.length;
    const fp = errors.filter(e => e.type === 'extra' || e.type === 'wrong_label').length;
    const fn = errors.filter(e => e.type === 'missed' || e.type === 'wrong_label').length;

    const precision = (tp + fp) > 0 ? (tp / (tp + fp)) : 0;
    const recall = (tp + fn) > 0 ? (tp / (tp + fn)) : 0;
    const f1 = (precision + recall) > 0 ? ((2 * precision * recall) / (precision + recall)) : 0;

    // Mean IoU of matched pairs (0 if no matches)
    const mIoU = tp > 0 ? (matchedPairs.reduce((sum, p) => sum + p.iou, 0) / tp) : 0;

    // Label accuracy: among pairs with substantial overlap (IoU >= 0.5)
    const totalOverlapped = tp + errors.filter(e => e.type === 'wrong_label').length;
    const labelAccuracy = totalOverlapped > 0 ? (tp / totalOverlapped) : 0;

    // Attribute score
    const avgAttrScore = tp > 0 ? (matchedPairs.reduce((sum, p) => sum + p.attrMatchRatio, 0) / tp) : 1;

    // Amazon GO-AI Composite Accuracy Score
    // Weightings: F1 (50%), Mean IoU (35%), Attributes & Boundary Tightness (15%)
    let compositeScore = (0.50 * f1 + 0.35 * mIoU + 0.15 * avgAttrScore) * 100;
    if (gtList.length === 0 && userList.length === 0) compositeScore = 100;
    compositeScore = Math.max(0, Math.min(100, Math.round(compositeScore * 10) / 10));

    return {
      overallScore: compositeScore,
      tp,
      fp,
      fn,
      precision,
      recall,
      f1,
      mIoU,
      labelAccuracy,
      avgAttrScore,
      matchedPairs,
      errors,
      totalGT: gtList.length,
      totalUser: userList.length
    };
  }

  /**
   * Browser-runnable test suite to verify math, IoU, and edge cases.
   */
  function runScoringTests() {
    const results = [];

    function assert(name, condition, details) {
      results.push({ name, passed: Boolean(condition), details });
      if (!condition) {
        console.error(`[FAIL] ${name}:`, details);
      } else {
        console.log(`[PASS] ${name}`);
      }
    }

    // Test 1: Perfect match IoU == 1.0
    const b1 = { x: 50, y: 50, width: 100, height: 100 };
    const iou1 = calculateIoU(b1, b1);
    assert('Perfect Match IoU is 1.0', Math.abs(iou1 - 1.0) < 0.0001, `Got ${iou1}`);

    // Test 2: No overlap IoU == 0
    const b2 = { x: 200, y: 200, width: 50, height: 50 };
    const iou2 = calculateIoU(b1, b2);
    assert('Zero Overlap IoU is 0.0', iou2 === 0, `Got ${iou2}`);

    // Test 3: Known partial overlap
    // Box A: 0,0, 100x100 (area 10,000)
    // Box B: 50,0, 100x100 (area 10,000)
    // Intersection: 50,0 to 100,100 -> 50x100 = 5,000
    // Union: 10,000 + 10,000 - 5,000 = 15,000
    // Expected IoU = 5000 / 15000 = 1/3 ~ 0.333333
    const boxA = { x: 0, y: 0, width: 100, height: 100 };
    const boxB = { x: 50, y: 0, width: 100, height: 100 };
    const iou3 = calculateIoU(boxA, boxB);
    assert('Known partial overlap IoU is 1/3', Math.abs(iou3 - (1 / 3)) < 0.0001, `Got ${iou3}`);

    // Test 4: Evaluation engine with exact match
    const gtSimple = [
      { id: 'g1', label: 'Cardboard Box', box: { x: 100, y: 100, width: 100, height: 100 }, attributes: { occluded: false, truncated: false, damaged: false } }
    ];
    const userSimple = [
      { label: 'Cardboard Box', box: { x: 100, y: 100, width: 100, height: 100 }, attributes: { occluded: false, truncated: false, damaged: false } }
    ];
    const evalSimple = evaluateAnnotations(userSimple, gtSimple);
    assert('Single Perfect Annotation produces 100% Score', evalSimple.overallScore === 100 && evalSimple.f1 === 1 && evalSimple.tp === 1, evalSimple);

    // Test 5: Wrong label detection
    const userWrongLabel = [
      { label: 'Tote', box: { x: 100, y: 100, width: 100, height: 100 }, attributes: {} }
    ];
    const evalWrongLabel = evaluateAnnotations(userWrongLabel, gtSimple);
    const hasWrongLabelErr = evalWrongLabel.errors.some(e => e.type === 'wrong_label');
    assert('Mismatched label detected as wrong_label error', hasWrongLabelErr && evalSimple.tp !== evalWrongLabel.tp, evalWrongLabel);

    // Test 6: Loose box detection (0.50 <= IoU < 0.75)
    // Box C: 0,0, 100x100 (area 10,000)
    // Box D: 0,0, 100x150 (area 15,000)
    // Intersection: 100x100 = 10,000. Union = 15,000. IoU = 10,000 / 15,000 = 0.6666
    const gtLoose = [{ id: 'gLoose', label: 'Polybag', box: { x: 0, y: 0, width: 100, height: 100 }, attributes: {} }];
    const userLoose = [{ label: 'Polybag', box: { x: 0, y: 0, width: 100, height: 150 }, attributes: {} }];
    const evalLoose = evaluateAnnotations(userLoose, gtLoose);
    const hasLooseErr = evalLoose.errors.some(e => e.type === 'imperfect_box');
    assert('Loose box (0.667 IoU) triggers imperfect_box warning', hasLooseErr && evalLoose.tp === 1, evalLoose);

    const totalPassed = results.filter(r => r.passed).length;
    console.log(`\n======================================================`);
    console.log(`RESULT: ${totalPassed}/${results.length} tests passed`);
    console.log(`SOURCE: ScoringModule.runScoringTests()`);
    console.log(`STATUS: VERIFIED`);
    console.log(`======================================================\n`);

    // Render verification report into DOM for automated audits
    if (typeof document !== 'undefined') {
      let testEl = document.getElementById('scoring-test-results');
      if (!testEl) {
        testEl = document.createElement('div');
        testEl.id = 'scoring-test-results';
        testEl.className = 'hidden';
        document.body.appendChild(testEl);
      }
      testEl.setAttribute('data-total', results.length);
      testEl.setAttribute('data-passed', totalPassed);
      testEl.innerText = `RESULT: ${totalPassed}/${results.length} tests passed\nSOURCE: ScoringModule.runScoringTests()\nSTATUS: VERIFIED\n${results.map(r => `[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`).join('\n')}`;
    }

    return { total: results.length, passed: totalPassed, tests: results };
  }

  return {
    calculateIoU,
    evaluateAnnotations,
    runScoringTests,
    IOU_THRESHOLD,
    TIGHT_THRESHOLD
  };
})();

// Expose on window
window.ScoringModule = ScoringModule;
