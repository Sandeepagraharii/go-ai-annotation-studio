/**
 * GO-AI Annotation Practice Studio - Canvas & Scene Rendering Engine
 * Handles warehouse scene vector rendering, mouse & touch box drawing,
 * interactive manipulation (move, resize handles), undo/redo, and ground truth audit overlays.
 */

// Safe roundRect polyfill for broad browser compatibility
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    if (!radii) radii = 0;
    if (typeof radii === 'number') radii = [radii, radii, radii, radii];
    const r0 = radii[0] || 0, r1 = radii[1] || 0, r2 = radii[2] || 0, r3 = radii[3] || 0;
    this.moveTo(x + r0, y);
    this.lineTo(x + w - r1, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r1);
    this.lineTo(x + w, y + h - r2);
    this.quadraticCurveTo(x + w, y + h, x + w - r2, y + h);
    this.lineTo(x + r3, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r3);
    this.lineTo(x, y + r0);
    this.quadraticCurveTo(x, y, x + r0, y);
    return this;
  };
}

const CanvasModule = (function () {
  let canvas, ctx;
  let overlayCanvas, overlayCtx;
  let currentTask = null;
  let customImage = null;

  // Box storage & interaction state
  let boxes = []; // Array of { id, label, box: {x,y,width,height}, attributes: {occluded, truncated, damaged} }
  let selectedBoxId = null;
  let activeTool = 'draw'; // 'draw' | 'select'
  let isDragging = false;
  let dragMode = null; // 'draw' | 'move' | 'resize'
  let resizeHandle = null; // 'nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'
  let dragStartPos = { x: 0, y: 0 };
  let originalBoxState = null;
  let tempDrawingBox = null;

  // Undo / Redo history
  let undoStack = [];
  let redoStack = [];
  const MAX_HISTORY = 30;

  // Review Mode state
  let reviewMode = false;
  let reviewData = null;
  let showGroundTruth = true;
  let showUserBoxes = true;
  let showErrorHighlights = true;

  // Listeners
  let onBoxSelectionChanged = null;
  let onBoxesChanged = null;

  // High-Voltage Mission Control Color Map
  const LABEL_COLORS = {
    'Cardboard Box': '#9ef01a',    // Neon Volt Lime
    'Polybag': '#00f0ff',          // Electric Cyan
    'Envelope': '#38bdf8',         // Sky Telemetry Blue
    'Tote': '#a855f7',             // Tactical Purple
    'Pallet': '#eab308',           // Caution Amber
    'Damaged Package': '#ff3366'   // High-Voltage Crimson Red
  };

  const HANDLE_SIZE = 8;

  function init(mainCanvasId, overlayCanvasId, callbacks) {
    canvas = document.getElementById(mainCanvasId);
    overlayCanvas = document.getElementById(overlayCanvasId);
    ctx = canvas.getContext('2d');
    overlayCtx = overlayCanvas.getContext('2d');

    if (callbacks) {
      onBoxSelectionChanged = callbacks.onBoxSelectionChanged;
      onBoxesChanged = callbacks.onBoxesChanged;
    }

    setupEventHandlers();
  }

  function setupEventHandlers() {
    // Mouse events
    overlayCanvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    // Touch events for mobile/tablet annotation
    overlayCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Cursor update
    overlayCanvas.addEventListener('mousemove', updateCursorStyle);
  }

  function getCanvasCoords(clientX, clientY) {
    const rect = overlayCanvas.getBoundingClientRect();
    const scaleX = overlayCanvas.width / rect.width;
    const scaleY = overlayCanvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      handlePointerDown({ clientX: touch.clientX, clientY: touch.clientY });
    }
  }

  function handleTouchMove(e) {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      handlePointerMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
  }

  function handleTouchEnd(e) {
    if (isDragging) {
      e.preventDefault();
      handlePointerUp({});
    }
  }

  function handlePointerDown(e) {
    const pos = getCanvasCoords(e.clientX, e.clientY);
    dragStartPos = pos;

    // Check if clicked a resize handle of currently selected box
    if (selectedBoxId) {
      const selectedBox = boxes.find(b => b.id === selectedBoxId);
      if (selectedBox) {
        const handle = getHandleAtPosition(pos, selectedBox.box);
        if (handle) {
          isDragging = true;
          dragMode = 'resize';
          resizeHandle = handle;
          originalBoxState = { ...selectedBox.box };
          pushUndoState();
          return;
        }
      }
    }

    // Check if clicked inside any existing box (select or move)
    const clickedBox = getBoxAtPosition(pos);
    if (clickedBox && (activeTool === 'select' || e.shiftKey || clickedBox.id === selectedBoxId)) {
      setSelectedBox(clickedBox.id);
      isDragging = true;
      dragMode = 'move';
      originalBoxState = { ...clickedBox.box };
      pushUndoState();
      renderOverlay();
      return;
    }

    if (clickedBox && activeTool === 'draw' && selectedBoxId !== clickedBox.id) {
      // If clicking directly on an existing box in draw mode, let's select it for ease of use
      // unless user drags more than 6px
    }

    // Otherwise, start drawing a new box
    isDragging = true;
    dragMode = 'draw';
    tempDrawingBox = { x: pos.x, y: pos.y, width: 0, height: 0 };
    setSelectedBox(null);
    renderOverlay();
  }

  function handlePointerMove(e) {
    if (!isDragging) return;
    const pos = getCanvasCoords(e.clientX, e.clientY);
    const dx = pos.x - dragStartPos.x;
    const dy = pos.y - dragStartPos.y;

    if (dragMode === 'draw') {
      const x = Math.min(dragStartPos.x, pos.x);
      const y = Math.min(dragStartPos.y, pos.y);
      const width = Math.abs(pos.x - dragStartPos.x);
      const height = Math.abs(pos.y - dragStartPos.y);

      // Clamp to canvas boundaries
      const clampedX = Math.max(0, Math.min(x, overlayCanvas.width));
      const clampedY = Math.max(0, Math.min(y, overlayCanvas.height));
      const clampedW = Math.min(width, overlayCanvas.width - clampedX);
      const clampedH = Math.min(height, overlayCanvas.height - clampedY);

      tempDrawingBox = { x: clampedX, y: clampedY, width: clampedW, height: clampedH };
      renderOverlay();
    } else if (dragMode === 'move') {
      const selectedBox = boxes.find(b => b.id === selectedBoxId);
      if (selectedBox && originalBoxState) {
        let newX = originalBoxState.x + dx;
        let newY = originalBoxState.y + dy;

        // Keep inside canvas
        newX = Math.max(0, Math.min(newX, overlayCanvas.width - originalBoxState.width));
        newY = Math.max(0, Math.min(newY, overlayCanvas.height - originalBoxState.height));

        selectedBox.box.x = Math.round(newX);
        selectedBox.box.y = Math.round(newY);
        renderOverlay();
      }
    } else if (dragMode === 'resize') {
      const selectedBox = boxes.find(b => b.id === selectedBoxId);
      if (selectedBox && originalBoxState) {
        resizeBoxWithHandle(selectedBox.box, originalBoxState, resizeHandle, dx, dy);
        renderOverlay();
      }
    }
  }

  function handlePointerUp(e) {
    if (!isDragging) return;

    if (dragMode === 'draw' && tempDrawingBox) {
      if (tempDrawingBox.width >= 12 && tempDrawingBox.height >= 12) {
        pushUndoState();
        const newBox = {
          id: 'box_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          label: 'Cardboard Box', // Default, immediately editable
          box: {
            x: Math.round(tempDrawingBox.x),
            y: Math.round(tempDrawingBox.y),
            width: Math.round(tempDrawingBox.width),
            height: Math.round(tempDrawingBox.height)
          },
          attributes: {
            occluded: false,
            truncated: false,
            damaged: false
          }
        };
        boxes.push(newBox);
        setSelectedBox(newBox.id);
        notifyBoxesChanged();
      } else {
        // If it was just a tiny click, check if user tapped on a box to select it
        const clickedBox = getBoxAtPosition(dragStartPos);
        if (clickedBox) {
          setSelectedBox(clickedBox.id);
        }
      }
    } else if (dragMode === 'move' || dragMode === 'resize') {
      notifyBoxesChanged();
    }

    isDragging = false;
    dragMode = null;
    resizeHandle = null;
    originalBoxState = null;
    tempDrawingBox = null;
    renderOverlay();
  }

  function resizeBoxWithHandle(box, orig, handle, dx, dy) {
    let x1 = orig.x;
    let y1 = orig.y;
    let x2 = orig.x + orig.width;
    let y2 = orig.y + orig.height;

    if (handle.includes('w')) x1 = Math.min(orig.x + dx, x2 - 10);
    if (handle.includes('e')) x2 = Math.max(orig.x + orig.width + dx, x1 + 10);
    if (handle.includes('n')) y1 = Math.min(orig.y + dy, y2 - 10);
    if (handle.includes('s')) y2 = Math.max(orig.y + orig.height + dy, y1 + 10);

    // Clamp
    x1 = Math.max(0, x1);
    y1 = Math.max(0, y1);
    x2 = Math.min(overlayCanvas.width, x2);
    y2 = Math.min(overlayCanvas.height, y2);

    box.x = Math.round(x1);
    box.y = Math.round(y1);
    box.width = Math.round(x2 - x1);
    box.height = Math.round(y2 - y1);
  }

  function updateCursorStyle(e) {
    if (isDragging) return;
    const pos = getCanvasCoords(e.clientX, e.clientY);

    if (selectedBoxId) {
      const selectedBox = boxes.find(b => b.id === selectedBoxId);
      if (selectedBox) {
        const handle = getHandleAtPosition(pos, selectedBox.box);
        if (handle) {
          const cursors = {
            'nw': 'nwse-resize', 'se': 'nwse-resize',
            'ne': 'nesw-resize', 'sw': 'nesw-resize',
            'n': 'ns-resize', 's': 'ns-resize',
            'e': 'ew-resize', 'w': 'ew-resize'
          };
          overlayCanvas.style.cursor = cursors[handle] || 'pointer';
          return;
        }
      }
    }

    const box = getBoxAtPosition(pos);
    if (box) {
      overlayCanvas.style.cursor = activeTool === 'select' ? 'move' : 'pointer';
    } else {
      overlayCanvas.style.cursor = activeTool === 'draw' ? 'crosshair' : 'default';
    }
  }

  function getHandleAtPosition(pos, box) {
    const handles = getHandleCoordinates(box);
    for (let h in handles) {
      const pt = handles[h];
      if (Math.abs(pos.x - pt.x) <= HANDLE_SIZE && Math.abs(pos.y - pt.y) <= HANDLE_SIZE) {
        return h;
      }
    }
    return null;
  }

  function getHandleCoordinates(box) {
    const x = box.x;
    const y = box.y;
    const w = box.width;
    const h = box.height;
    return {
      'nw': { x: x, y: y },
      'n':  { x: x + w / 2, y: y },
      'ne': { x: x + w, y: y },
      'e':  { x: x + w, y: y + h / 2 },
      'se': { x: x + w, y: y + h },
      's':  { x: x + w / 2, y: y + h },
      'sw': { x: x, y: y + h },
      'w':  { x: x, y: y + h / 2 }
    };
  }

  function getBoxAtPosition(pos) {
    // Search top-to-bottom (newest first)
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i].box;
      if (pos.x >= b.x && pos.x <= b.x + b.width && pos.y >= b.y && pos.y <= b.y + b.height) {
        return boxes[i];
      }
    }
    return null;
  }

  function setSelectedBox(id) {
    selectedBoxId = id;
    renderOverlay();
    if (onBoxSelectionChanged) {
      const box = boxes.find(b => b.id === id);
      onBoxSelectionChanged(box || null);
    }
  }

  function pushUndoState() {
    undoStack.push(JSON.stringify(boxes));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = []; // clear redo on new action
  }

  function undo() {
    if (undoStack.length === 0) return false;
    redoStack.push(JSON.stringify(boxes));
    const previous = undoStack.pop();
    boxes = JSON.parse(previous);
    if (!boxes.some(b => b.id === selectedBoxId)) {
      setSelectedBox(null);
    }
    renderOverlay();
    notifyBoxesChanged();
    return true;
  }

  function redo() {
    if (redoStack.length === 0) return false;
    undoStack.push(JSON.stringify(boxes));
    const next = redoStack.pop();
    boxes = JSON.parse(next);
    renderOverlay();
    notifyBoxesChanged();
    return true;
  }

  function notifyBoxesChanged() {
    if (onBoxesChanged) {
      onBoxesChanged(boxes);
    }
  }

  // Box CRUD methods
  function updateSelectedBoxLabel(newLabel) {
    if (!selectedBoxId) return;
    const box = boxes.find(b => b.id === selectedBoxId);
    if (box && box.label !== newLabel) {
      pushUndoState();
      box.label = newLabel;
      renderOverlay();
      notifyBoxesChanged();
      if (onBoxSelectionChanged) onBoxSelectionChanged(box);
    }
  }

  function updateSelectedBoxAttributes(attributes) {
    if (!selectedBoxId) return;
    const box = boxes.find(b => b.id === selectedBoxId);
    if (box) {
      pushUndoState();
      box.attributes = { ...box.attributes, ...attributes };
      renderOverlay();
      notifyBoxesChanged();
    }
  }

  function deleteSelectedBox() {
    if (!selectedBoxId) return;
    pushUndoState();
    boxes = boxes.filter(b => b.id !== selectedBoxId);
    setSelectedBox(null);
    renderOverlay();
    notifyBoxesChanged();
  }

  function clearAllBoxes() {
    if (boxes.length === 0) return;
    pushUndoState();
    boxes = [];
    setSelectedBox(null);
    renderOverlay();
    notifyBoxesChanged();
  }

  function setBoxes(newBoxes) {
    boxes = (newBoxes || []).map(b => ({
      id: b.id || 'box_' + Math.random().toString(36).substr(2, 6),
      label: b.label || 'Cardboard Box',
      box: { ...b.box },
      attributes: {
        occluded: Boolean(b.attributes && b.attributes.occluded),
        truncated: Boolean(b.attributes && b.attributes.truncated),
        damaged: Boolean(b.attributes && b.attributes.damaged)
      }
    }));
    selectedBoxId = null;
    undoStack = [];
    redoStack = [];
    renderOverlay();
    notifyBoxesChanged();
  }

  function getBoxes() {
    return boxes;
  }

  // -------------------------------------------------------------
  // RENDERING SCENES (Inline vector drawings for ground truth)
  // -------------------------------------------------------------
  function loadTaskScene(task) {
    currentTask = task;
    customImage = null;
    reviewMode = false;
    reviewData = null;

    canvas.width = task.scene.width || 800;
    canvas.height = task.scene.height || 550;
    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;

    renderSceneBackground(task);
    renderOverlay();
  }

  function loadCustomImage(img) {
    currentTask = null;
    customImage = img;
    reviewMode = false;
    reviewData = null;

    canvas.width = 800;
    canvas.height = 550;
    overlayCanvas.width = 800;
    overlayCanvas.height = 550;

    // Draw uploaded image fitted on canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const aspectImg = img.width / img.height;
    const aspectCanvas = canvas.width / canvas.height;
    let drawW, drawH, drawX, drawY;

    if (aspectImg > aspectCanvas) {
      drawW = canvas.width;
      drawH = canvas.width / aspectImg;
      drawX = 0;
      drawY = (canvas.height - drawH) / 2;
    } else {
      drawH = canvas.height;
      drawW = canvas.height * aspectImg;
      drawX = (canvas.width - drawW) / 2;
      drawY = 0;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    renderOverlay();
  }

  function renderSceneBackground(task) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const bgType = task.scene.background;

    // Base industrial warehouse floor / backdrop
    drawWarehouseFloorAndWall(ctx, w, h);

    switch (bgType) {
      case 'conveyor_table':
        drawPackingTableScene(ctx, w, h, task);
        break;
      case 'shelf_rack':
        drawShelfRackScene(ctx, w, h, task);
        break;
      case 'pallet_staging':
        drawPalletStagingScene(ctx, w, h, task);
        break;
      case 'chute_slide':
        drawChuteScene(ctx, w, h, task);
        break;
      case 'qa_station':
        drawQAStationScene(ctx, w, h, task);
        break;
      case 'conveyor_belt':
        drawConveyorBeltScene(ctx, w, h, task);
        break;
      case 'robotic_pod':
        drawRoboticPodScene(ctx, w, h, task);
        break;
      case 'robotic_arm_pallet':
        drawRoboticArmPalletScene(ctx, w, h, task);
        break;
      default:
        drawGenericWarehouseScene(ctx, w, h, task);
        break;
    }

    // Render the physical ground-truth objects precisely into the scene!
    task.objects.forEach(obj => {
      drawPhysicalFulfillmentObject(ctx, obj);
    });
  }

  function drawWarehouseFloorAndWall(c, w, h) {
    // Upper wall - concrete slate
    const wallGrad = c.createLinearGradient(0, 0, 0, 220);
    wallGrad.addColorStop(0, '#1e293b');
    wallGrad.addColorStop(1, '#334155');
    c.fillStyle = wallGrad;
    c.fillRect(0, 0, w, 220);

    // Hazard yellow safety line stripe
    c.fillStyle = '#eab308';
    c.fillRect(0, 218, w, 4);

    // Epoxy warehouse floor with safety guidelines
    const floorGrad = c.createLinearGradient(0, 222, 0, h);
    floorGrad.addColorStop(0, '#475569');
    floorGrad.addColorStop(1, '#1e293b');
    c.fillStyle = floorGrad;
    c.fillRect(0, 222, w, h - 222);

    // Floor perspective grid lines
    c.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    c.lineWidth = 1;
    for (let x = -200; x < w + 300; x += 120) {
      c.beginPath();
      c.moveTo(x, 222);
      c.lineTo(x * 1.4 - 150, h);
      c.stroke();
    }
  }

  function drawPackingTableScene(c, w, h) {
    // Heavy duty steel workbench
    c.fillStyle = '#64748b';
    c.fillRect(30, 280, w - 60, 230);
    // Table edge highlight
    c.fillStyle = '#94a3b8';
    c.fillRect(30, 280, w - 60, 10);
    // Table legs
    c.fillStyle = '#334155';
    c.fillRect(60, 390, 24, 120);
    c.fillRect(w - 84, 390, 24, 120);

    // Overhead barcode scanner beam (subtle red light)
    c.save();
    c.globalAlpha = 0.15;
    c.fillStyle = '#ef4444';
    c.beginPath();
    c.moveTo(350, 0);
    c.lineTo(450, 0);
    c.lineTo(550, 320);
    c.lineTo(250, 320);
    c.closePath();
    c.fill();
    c.restore();
  }

  function drawShelfRackScene(c, w, h) {
    // Industrial steel racking frame (Amazon safety yellow/orange)
    c.fillStyle = '#d97706';
    // Vertical columns
    c.fillRect(40, 40, 22, h - 60);
    c.fillRect(w / 2 - 11, 40, 22, h - 60);
    c.fillRect(w - 62, 40, 22, h - 60);
    // Horizontal shelves
    c.fillRect(40, 275, w - 80, 18);
    c.fillRect(40, 485, w - 80, 18);

    // Shelf wire mesh decking
    c.strokeStyle = '#475569';
    c.lineWidth = 2;
    for (let x = 65; x < w - 65; x += 25) {
      c.beginPath();
      c.moveTo(x, 120);
      c.lineTo(x, 275);
      c.stroke();
      c.beginPath();
      c.moveTo(x, 330);
      c.lineTo(x, 485);
      c.stroke();
    }
  }

  function drawPalletStagingScene(c, w, h) {
    // Floor safety staging box (yellow taped perimeter)
    c.strokeStyle = '#eab308';
    c.lineWidth = 6;
    c.setLineDash([20, 12]);
    c.strokeRect(80, 320, w - 160, 200);
    c.setLineDash([]);
  }

  function drawChuteScene(c, w, h) {
    // Stainless steel sortation slide / gravity chute
    const chuteGrad = c.createLinearGradient(0, 50, w, h);
    chuteGrad.addColorStop(0, '#94a3b8');
    chuteGrad.addColorStop(0.5, '#cbd5e1');
    chuteGrad.addColorStop(1, '#64748b');
    c.fillStyle = chuteGrad;

    c.beginPath();
    c.moveTo(60, 40);
    c.lineTo(w - 40, 100);
    c.lineTo(w - 80, h - 40);
    c.lineTo(20, h - 100);
    c.closePath();
    c.fill();

    // Chute metal side rails
    c.strokeStyle = '#475569';
    c.lineWidth = 8;
    c.stroke();
  }

  function drawQAStationScene(c, w, h) {
    // Quality inspection mat (anti-static green / blue)
    c.fillStyle = '#0d9488';
    c.fillRect(60, 110, w - 120, 400);
    c.strokeStyle = '#facc15';
    c.lineWidth = 4;
    c.strokeRect(60, 110, w - 120, 400);

    // Inspection grid
    c.strokeStyle = 'rgba(255,255,255,0.15)';
    c.lineWidth = 1;
    for (let x = 100; x < w - 100; x += 50) {
      c.beginPath();
      c.moveTo(x, 110);
      c.lineTo(x, 510);
      c.stroke();
    }
  }

  function drawConveyorBeltScene(c, w, h) {
    // Industrial motorized roller conveyor
    c.fillStyle = '#1e293b';
    c.fillRect(0, 170, w, 240);

    // Steel rollers
    c.fillStyle = '#94a3b8';
    for (let x = -20; x < w + 30; x += 32) {
      c.fillRect(x, 170, 18, 240);
      c.fillStyle = '#64748b';
      c.fillRect(x + 14, 170, 4, 240);
      c.fillStyle = '#94a3b8';
    }

    // Safety guard rails
    c.fillStyle = '#eab308';
    c.fillRect(0, 160, w, 12);
    c.fillRect(0, 410, w, 12);
  }

  function drawRoboticPodScene(c, w, h) {
    // Amazon Robotics orange / grey drive pod shelving cubicles
    c.fillStyle = '#334155';
    c.fillRect(50, 40, w - 100, 460);

    // Orange structural frame
    c.strokeStyle = '#f97316';
    c.lineWidth = 10;
    c.strokeRect(50, 40, w - 100, 460);

    // Pod dividers
    c.beginPath();
    c.moveTo(50, 240);
    c.lineTo(w - 50, 240);
    c.moveTo(270, 40);
    c.lineTo(270, 500);
    c.moveTo(460, 40);
    c.lineTo(460, 500);
    c.moveTo(630, 40);
    c.lineTo(630, 500);
    c.stroke();
  }

  function drawRoboticArmPalletScene(c, w, h) {
    // Staging floor with robot reach perimeter
    c.strokeStyle = '#eab308';
    c.lineWidth = 3;
    c.setLineDash([8, 8]);
    c.beginPath();
    c.arc(w / 2, 280, 220, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);

    // Robotic end-of-arm mechanical gripper shadow/base in background
    c.fillStyle = '#0f172a';
    c.beginPath();
    c.moveTo(350, 0);
    c.lineTo(450, 0);
    c.lineTo(420, 70);
    c.lineTo(380, 70);
    c.closePath();
    c.fill();
  }

  function drawGenericWarehouseScene(c, w, h) {
    c.fillStyle = '#475569';
    c.fillRect(50, 300, w - 100, 200);
  }

  // -------------------------------------------------------------
  // RENDERING PHYSICAL FULFILLMENT OBJECTS
  // -------------------------------------------------------------
  function drawPhysicalFulfillmentObject(c, obj) {
    const b = obj.box;
    const label = obj.label;
    const isDamaged = Boolean(obj.attributes && obj.attributes.damaged);

    c.save();

    switch (label) {
      case 'Cardboard Box':
        drawRealisticCardboardBox(c, b, isDamaged);
        break;
      case 'Polybag':
        drawRealisticPolybag(c, b, isDamaged);
        break;
      case 'Envelope':
        drawRealisticEnvelope(c, b, isDamaged);
        break;
      case 'Tote':
        drawRealisticTote(c, b);
        break;
      case 'Pallet':
        drawRealisticPallet(c, b);
        break;
      case 'Damaged Package':
        drawRealisticDamagedPackage(c, b);
        break;
      default:
        drawRealisticCardboardBox(c, b, isDamaged);
        break;
    }

    c.restore();
  }

  function drawRealisticCardboardBox(c, b, isDamaged) {
    const { x, y, width: w, height: h } = b;

    // Cardboard drop shadow
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x + 4, y + h - 2, w - 8, 8);

    // Front box face (Kraft brown gradient)
    const boxGrad = c.createLinearGradient(x, y, x + w, y + h);
    boxGrad.addColorStop(0, '#c28b52');
    boxGrad.addColorStop(1, '#9d6837');
    c.fillStyle = boxGrad;
    c.fillRect(x, y, w, h);

    // Corrugation outline
    c.strokeStyle = '#784d23';
    c.lineWidth = 1.5;
    c.strokeRect(x, y, w, h);

    // Brown reinforced paper tape down center
    c.fillStyle = '#b47b42';
    c.fillRect(x, y + h * 0.45, w, h * 0.12);
    // Fiber threads in tape
    c.strokeStyle = 'rgba(0,0,0,0.15)';
    c.lineWidth = 1;
    c.strokeRect(x, y + h * 0.45, w, h * 0.12);

    // Shipping barcode label (White thermal label)
    const labelW = Math.min(65, w * 0.45);
    const labelH = Math.min(45, h * 0.35);
    const labelX = x + w * 0.1;
    const labelY = y + h * 0.15;

    c.fillStyle = '#f8fafc';
    c.fillRect(labelX, labelY, labelW, labelH);
    c.strokeStyle = '#cbd5e1';
    c.strokeRect(labelX, labelY, labelW, labelH);

    // Barcode bars
    c.fillStyle = '#0f172a';
    for (let bx = labelX + 4; bx < labelX + labelW - 6; bx += 4) {
      c.fillRect(bx, labelY + 6, (bx % 3 === 0 ? 3 : 1.5), labelH - 16);
    }
    // Barcode tracking number text simulation
    c.fillRect(labelX + 4, labelY + labelH - 6, labelW - 8, 2);

    // Smile print simulation
    c.strokeStyle = '#0f172a';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x + w * 0.7, y + h * 0.75, Math.min(20, w * 0.15), 0.2 * Math.PI, 0.8 * Math.PI);
    c.stroke();

    if (isDamaged) {
      drawDamageDeformation(c, b);
    }
  }

  function drawRealisticPolybag(c, b, isDamaged) {
    const { x, y, width: w, height: h } = b;

    // Flexible polybag body with rounded crinkled corners
    c.fillStyle = '#f1f5f9';
    c.beginPath();
    c.roundRect(x, y, w, h, [12, 16, 14, 10]);
    c.fill();

    // Polybag blue Amazon Prime brand chevron / band
    c.fillStyle = '#0284c7';
    c.beginPath();
    c.moveTo(x, y + h * 0.25);
    c.lineTo(x + w, y + h * 0.35);
    c.lineTo(x + w, y + h * 0.55);
    c.lineTo(x, y + h * 0.45);
    c.closePath();
    c.fill();

    // Shipping thermal label
    const labelW = Math.min(60, w * 0.45);
    const labelH = Math.min(40, h * 0.35);
    c.fillStyle = '#ffffff';
    c.fillRect(x + w * 0.3, y + h * 0.58, labelW, labelH);
    c.fillStyle = '#1e293b';
    for (let bx = x + w * 0.3 + 4; bx < x + w * 0.3 + labelW - 5; bx += 4) {
      c.fillRect(bx, y + h * 0.58 + 4, 2, labelH - 12);
    }

    // Flexible plastic wrinkles / highlights
    c.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 10, y + 10);
    c.bezierCurveTo(x + w * 0.4, y + 25, x + w * 0.6, y + 15, x + w - 15, y + 25);
    c.stroke();

    // Perimeter seal line
    c.strokeStyle = '#cbd5e1';
    c.lineWidth = 1.5;
    c.stroke();

    if (isDamaged) {
      drawDamageDeformation(c, b);
    }
  }

  function drawRealisticEnvelope(c, b, isDamaged) {
    const { x, y, width: w, height: h } = b;

    // Kraft paper golden-brown envelope
    const envGrad = c.createLinearGradient(x, y, x + w, y + h);
    envGrad.addColorStop(0, '#d97706');
    envGrad.addColorStop(1, '#b45309');
    c.fillStyle = envGrad;
    c.beginPath();
    c.roundRect(x, y, w, h, 6);
    c.fill();
    c.strokeStyle = '#92400e';
    c.lineWidth = 1.5;
    c.stroke();

    // Bubble mailer texture (subtle circle pattern)
    c.fillStyle = 'rgba(255,255,255,0.08)';
    for (let px = x + 12; px < x + w - 10; px += 16) {
      for (let py = y + 12; py < y + h - 10; py += 16) {
        c.beginPath();
        c.arc(px, py, 3.5, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Flap fold line
    c.strokeStyle = '#78350f';
    c.beginPath();
    c.moveTo(x, y + 18);
    c.lineTo(x + w / 2, y + 36);
    c.lineTo(x + w, y + 18);
    c.stroke();

    // Address label
    c.fillStyle = '#fff';
    c.fillRect(x + w * 0.25, y + h * 0.4, Math.min(80, w * 0.5), Math.min(50, h * 0.45));
    c.fillStyle = '#0f172a';
    c.fillRect(x + w * 0.25 + 6, y + h * 0.4 + 8, Math.min(68, w * 0.5 - 12), 4);
    c.fillRect(x + w * 0.25 + 6, y + h * 0.4 + 18, Math.min(50, w * 0.5 - 20), 3);
    c.fillRect(x + w * 0.25 + 6, y + h * 0.4 + 26, Math.min(60, w * 0.5 - 16), 3);

    if (isDamaged) {
      drawDamageDeformation(c, b);
    }
  }

  function drawRealisticTote(c, b) {
    const { x, y, width: w, height: h } = b;

    // Amazon Fulfillment yellow tote bin
    const toteGrad = c.createLinearGradient(x, y, x, y + h);
    toteGrad.addColorStop(0, '#facc15');
    toteGrad.addColorStop(1, '#ca8a04');
    c.fillStyle = toteGrad;
    c.beginPath();
    c.roundRect(x, y, w, h, 8);
    c.fill();

    // Molded reinforcement ribs
    c.strokeStyle = '#a16207';
    c.lineWidth = 2.5;
    c.strokeRect(x + 6, y + 6, w - 12, h - 12);

    for (let rx = x + 25; rx < x + w - 20; rx += 25) {
      c.beginPath();
      c.moveTo(rx, y + 20);
      c.lineTo(rx, y + h - 15);
      c.stroke();
    }

    // Molded hand-grip opening
    c.fillStyle = '#713f12';
    c.beginPath();
    c.roundRect(x + w / 2 - 25, y + 12, 50, 14, 7);
    c.fill();

    // Tote barcode plaque
    c.fillStyle = '#ffffff';
    c.fillRect(x + w * 0.2, y + h - 28, w * 0.6, 16);
    c.fillStyle = '#000000';
    c.font = 'bold 9px monospace';
    c.fillText('TOTE-84920', x + w * 0.25, y + h - 16);
  }

  function drawRealisticPallet(c, b) {
    const { x, y, width: w, height: h } = b;

    // GMA 48x40 wooden timber pallet
    // Top deckboards (3 horizontal timber planks)
    const plankH = (h - 24) / 3;
    c.fillStyle = '#854d0e';

    for (let i = 0; i < 3; i++) {
      const py = y + i * (plankH + 3);
      c.fillStyle = (i % 2 === 0 ? '#a16207' : '#854d0e');
      c.fillRect(x, py, w, plankH);
      c.strokeStyle = '#451a03';
      c.lineWidth = 1.5;
      c.strokeRect(x, py, w, plankH);

      // Wood grain lines & nails
      c.fillStyle = '#292524';
      c.beginPath();
      c.arc(x + 15, py + plankH / 2, 2.5, 0, Math.PI * 2);
      c.arc(x + w / 2, py + plankH / 2, 2.5, 0, Math.PI * 2);
      c.arc(x + w - 15, py + plankH / 2, 2.5, 0, Math.PI * 2);
      c.fill();
    }

    // Pallet 3 solid wood stringer blocks underneath
    const stringerY = y + h - 18;
    c.fillStyle = '#451a03';
    c.fillRect(x + 10, stringerY, 35, 18);
    c.fillRect(x + w / 2 - 17, stringerY, 35, 18);
    c.fillRect(x + w - 45, stringerY, 35, 18);

    // Forklift entry slots
    c.fillStyle = '#1c1917';
    c.fillRect(x + 45, stringerY + 4, w / 2 - 62, 14);
    c.fillRect(x + w / 2 + 18, stringerY + 4, w / 2 - 63, 14);
  }

  function drawRealisticDamagedPackage(c, b) {
    const { x, y, width: w, height: h } = b;
    // Draw standard carton first
    drawRealisticCardboardBox(c, b, false);
    // Layer heavy crush, puncture, and caution flag
    drawDamageDeformation(c, b);
  }

  function drawDamageDeformation(c, b) {
    const { x, y, width: w, height: h } = b;

    // 1. Crushed corner (top right or top left)
    c.save();
    c.fillStyle = '#3f2e1e'; // Deep inner cavity shadow
    c.beginPath();
    c.moveTo(x + w * 0.7, y);
    c.lineTo(x + w, y + h * 0.35);
    c.lineTo(x + w * 0.85, y + h * 0.4);
    c.lineTo(x + w * 0.65, y + h * 0.15);
    c.closePath();
    c.fill();

    // Crumpled cardboard tear flaps
    c.fillStyle = '#b47b42';
    c.beginPath();
    c.moveTo(x + w * 0.68, y);
    c.lineTo(x + w * 0.78, y + h * 0.22);
    c.lineTo(x + w * 0.62, y + h * 0.2);
    c.closePath();
    c.fill();
    c.strokeStyle = '#5c3a1d';
    c.stroke();

    // 2. Severe puncture hole with bursting bubble wrap / contents protruding
    const holeX = x + w * 0.35;
    const holeY = y + h * 0.5;
    const holeW = Math.min(45, w * 0.3);
    const holeH = Math.min(35, h * 0.25);

    c.fillStyle = '#1e1b18';
    c.beginPath();
    c.ellipse(holeX, holeY, holeW / 2, holeH / 2, Math.PI / 6, 0, Math.PI * 2);
    c.fill();

    // Protruding clear/white bubble wrap
    c.fillStyle = '#f8fafc';
    c.beginPath();
    c.arc(holeX - 4, holeY - 2, 7, 0, Math.PI * 2);
    c.arc(holeX + 6, holeY + 4, 8, 0, Math.PI * 2);
    c.fill();

    // Torn corrugated jagged fiber edges
    c.strokeStyle = '#451a03';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(holeX - holeW / 2, holeY);
    c.lineTo(holeX - holeW / 2 - 8, holeY - 6);
    c.lineTo(holeX - 5, holeY - holeH / 2 - 6);
    c.lineTo(holeX + holeW / 2 + 6, holeY + 4);
    c.stroke();

    c.restore();
  }

  // -------------------------------------------------------------
  // OVERLAY RENDERING (User boxes, selection handles, review mode)
  // -------------------------------------------------------------
  function renderOverlay() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (reviewMode && reviewData) {
      renderReviewModeOverlay();
      return;
    }

    // Normal Annotation Mode
    boxes.forEach(b => {
      const isSelected = (b.id === selectedBoxId);
      const color = LABEL_COLORS[b.label] || '#3b82f6';
      drawAnnotationBox(overlayCtx, b, color, isSelected);
    });

    // Draw active in-progress drawing box
    if (tempDrawingBox && tempDrawingBox.width > 0 && tempDrawingBox.height > 0) {
      overlayCtx.save();
      overlayCtx.strokeStyle = '#38bdf8';
      overlayCtx.lineWidth = 2;
      overlayCtx.setLineDash([5, 4]);
      overlayCtx.strokeRect(tempDrawingBox.x, tempDrawingBox.y, tempDrawingBox.width, tempDrawingBox.height);
      overlayCtx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      overlayCtx.fillRect(tempDrawingBox.x, tempDrawingBox.y, tempDrawingBox.width, tempDrawingBox.height);
      overlayCtx.restore();
    }
  }

  function drawAnnotationBox(c, item, color, isSelected) {
    const { x, y, width: w, height: h } = item.box;

    c.save();

    // Box stroke
    c.strokeStyle = color;
    c.lineWidth = isSelected ? 3 : 2;
    c.strokeRect(x, y, w, h);

    // Box semi-transparent fill
    c.fillStyle = isSelected ? `${color}28` : `${color}14`;
    c.fillRect(x, y, w, h);

    // Label pill tag on top-left of box
    const tagText = `${item.label}${getAttrBadges(item.attributes)}`;
    c.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textMetrics = c.measureText(tagText);
    const tagW = textMetrics.width + 12;
    const tagH = 18;

    // Position tag above box or inside if near top border
    const tagY = y >= tagH + 2 ? y - tagH - 2 : y + 2;

    c.fillStyle = color;
    c.beginPath();
    c.roundRect(x, tagY, tagW, tagH, 3);
    c.fill();

    c.fillStyle = '#ffffff';
    c.fillText(tagText, x + 6, tagY + 13);

    // Resize handles if selected
    if (isSelected) {
      const handles = getHandleCoordinates(item.box);
      c.fillStyle = '#ffffff';
      c.strokeStyle = color;
      c.lineWidth = 2;

      for (let hKey in handles) {
        const pt = handles[hKey];
        c.fillRect(pt.x - HANDLE_SIZE / 2, pt.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        c.strokeRect(pt.x - HANDLE_SIZE / 2, pt.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      }
    }

    c.restore();
  }

  function getAttrBadges(attrs) {
    if (!attrs) return '';
    const parts = [];
    if (attrs.occluded) parts.push('OCC');
    if (attrs.truncated) parts.push('TRUNC');
    if (attrs.damaged) parts.push('DMG');
    return parts.length > 0 ? ` [${parts.join('|')}]` : '';
  }

  function renderReviewModeOverlay() {
    const { matchedPairs, errors } = reviewData;

    // 1. Render Ground Truth boxes (Green dashed)
    if (showGroundTruth && currentTask && currentTask.objects) {
      currentTask.objects.forEach(gt => {
        const b = gt.box;
        overlayCtx.save();
        overlayCtx.strokeStyle = '#10b981';
        overlayCtx.lineWidth = 2.5;
        overlayCtx.setLineDash([6, 5]);
        overlayCtx.strokeRect(b.x, b.y, b.width, b.height);

        // GT Label Pill
        const tagText = `GT: ${gt.label}${getAttrBadges(gt.attributes)}`;
        overlayCtx.font = 'bold 11px sans-serif';
        const tagW = overlayCtx.measureText(tagText).width + 10;
        overlayCtx.fillStyle = '#10b981';
        overlayCtx.beginPath();
        overlayCtx.roundRect(b.x, Math.max(0, b.y - 20), tagW, 18, 3);
        overlayCtx.fill();
        overlayCtx.fillStyle = '#ffffff';
        overlayCtx.fillText(tagText, b.x + 5, Math.max(13, b.y - 7));
        overlayCtx.restore();
      });
    }

    // 2. Render User boxes (Blue)
    if (showUserBoxes) {
      boxes.forEach(u => {
        const b = u.box;
        overlayCtx.save();
        overlayCtx.strokeStyle = '#3b82f6';
        overlayCtx.lineWidth = 2;
        overlayCtx.strokeRect(b.x, b.y, b.width, b.height);

        const tagText = `User: ${u.label}`;
        overlayCtx.font = 'bold 11px sans-serif';
        const tagW = overlayCtx.measureText(tagText).width + 10;
        overlayCtx.fillStyle = '#3b82f6';
        overlayCtx.beginPath();
        overlayCtx.roundRect(b.x + b.width - tagW, b.y + b.height - 20, tagW, 18, 3);
        overlayCtx.fill();
        overlayCtx.fillStyle = '#ffffff';
        overlayCtx.fillText(tagText, b.x + b.width - tagW + 5, b.y + b.height - 7);
        overlayCtx.restore();
      });
    }

    // 3. Render Error Highlights (Red/Amber warnings)
    if (showErrorHighlights && errors) {
      errors.forEach(err => {
        overlayCtx.save();
        if (err.type === 'missed') {
          // Missed GT item
          const b = err.gtObj.box;
          overlayCtx.strokeStyle = '#ef4444';
          overlayCtx.lineWidth = 3;
          overlayCtx.setLineDash([4, 4]);
          overlayCtx.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);

          // Alert badge
          drawDefectBadge(overlayCtx, b.x, b.y + b.height / 2, 'MISSED OBJECT (FN)', '#ef4444');
        } else if (err.type === 'extra') {
          // Extra FP user box
          const b = err.userBox.box;
          overlayCtx.strokeStyle = '#f59e0b';
          overlayCtx.lineWidth = 3;
          overlayCtx.strokeRect(b.x, b.y, b.width, b.height);
          drawDefectBadge(overlayCtx, b.x, b.y + b.height / 2, 'EXTRA BOX (FP)', '#f59e0b');
        } else if (err.type === 'wrong_label') {
          // Overlaps GT but wrong label
          const b = err.userBox.box;
          overlayCtx.strokeStyle = '#dc2626';
          overlayCtx.lineWidth = 3;
          overlayCtx.strokeRect(b.x, b.y, b.width, b.height);
          drawDefectBadge(overlayCtx, b.x, b.y + 4, `WRONG LABEL (${err.userBox.label} vs ${err.gtObj.label})`, '#dc2626');
        } else if (err.type === 'imperfect_box') {
          // Sub-optimal IoU (0.50 <= IoU < 0.75)
          const b = err.userBox.box;
          drawDefectBadge(overlayCtx, b.x, b.y + 4, `LOOSE/TIGHT (IoU: ${(err.iou * 100).toFixed(0)}%)`, '#d97706');
        }
        overlayCtx.restore();
      });
    }
  }

  function drawDefectBadge(c, x, y, text, bgColor) {
    c.font = 'bold 11px sans-serif';
    const tagW = c.measureText(text).width + 12;
    c.fillStyle = bgColor;
    c.beginPath();
    c.roundRect(x, y, tagW, 20, 4);
    c.fill();
    c.fillStyle = '#ffffff';
    c.fillText(text, x + 6, y + 14);
  }

  function setReviewMode(enabled, evalData) {
    reviewMode = enabled;
    reviewData = evalData;
    renderOverlay();
  }

  function setReviewToggles(gt, user, err) {
    showGroundTruth = gt;
    showUserBoxes = user;
    showErrorHighlights = err;
    renderOverlay();
  }

  function setActiveTool(tool) {
    activeTool = tool;
    renderOverlay();
  }

  return {
    init,
    loadTaskScene,
    loadCustomImage,
    setActiveTool,
    setSelectedBox,
    updateSelectedBoxLabel,
    updateSelectedBoxAttributes,
    deleteSelectedBox,
    clearAllBoxes,
    setBoxes,
    getBoxes,
    undo,
    redo,
    setReviewMode,
    setReviewToggles,
    LABEL_COLORS
  };
})();

// Expose on window
window.CanvasModule = CanvasModule;
