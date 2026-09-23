const POSITION_KEY = "prospectly:quick-start-launcher-pos";
const DRAG_THRESHOLD_PX = 6;
const PANEL_MIN_HEIGHT = 160;
const PANEL_GAP_PX = 8;

function getPanelHeightCap(): number {
  return Math.max(
    PANEL_MIN_HEIGHT,
    getViewportHeight() - getViewportMargin() * 2
  );
}

type SavedPosition = { x: number; y: number };

/** Last known on-screen rect of the launcher (captured while visible). */
let lastLauncherAnchor: DOMRect | null = null;

function readSavedPosition(): SavedPosition | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedPosition;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function savePosition(x: number, y: number): void {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ x, y }));
  } catch {
    /* ignore */
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function applyCustomPosition(el: HTMLElement, x: number, y: number): void {
  el.classList.add("qs-custom-pos");
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.right = "auto";
  el.style.bottom = "auto";
}

function clearPanelCornerStyles(panel: HTMLElement): void {
  panel.style.right = "";
  panel.style.bottom = "";
  panel.style.maxHeight = "";
}

function resetPanelPosition(panel: HTMLElement): void {
  panel.classList.remove("qs-custom-pos");
  panel.style.left = "";
  panel.style.top = "";
  clearPanelCornerStyles(panel);
}

function applyPanelPositionTop(
  panel: HTMLElement,
  x: number,
  y: number,
  maxHeight: number
): void {
  panel.classList.add("qs-custom-pos");
  panel.style.left = `${x}px`;
  panel.style.top = `${y}px`;
  panel.style.bottom = "auto";
  panel.style.right = "auto";
  panel.style.maxHeight = `${maxHeight}px`;
}

function applyPanelPositionBottom(
  panel: HTMLElement,
  x: number,
  bottom: number,
  maxHeight: number
): void {
  panel.classList.add("qs-custom-pos");
  panel.style.left = `${x}px`;
  panel.style.bottom = `${bottom}px`;
  panel.style.top = "auto";
  panel.style.right = "auto";
  panel.style.maxHeight = `${maxHeight}px`;
}

function measurePanelNaturalHeight(panel: HTMLElement): number {
  const wasShown = panel.classList.contains("show");
  const prevVisibility = panel.style.visibility;
  const prevPointerEvents = panel.style.pointerEvents;
  const prevMaxHeight = panel.style.maxHeight;

  if (!wasShown) {
    panel.style.visibility = "hidden";
    panel.style.pointerEvents = "none";
    panel.style.maxHeight = "none";
    panel.classList.add("show");
  }

  const height = panel.scrollHeight;

  if (!wasShown) {
    panel.classList.remove("show");
    panel.style.visibility = prevVisibility;
    panel.style.pointerEvents = prevPointerEvents;
    panel.style.maxHeight = prevMaxHeight;
  }

  return height > 0 ? height : PANEL_MIN_HEIGHT;
}

function resolvePanelHorizontalX(
  rect: DOMRect,
  panelWidth: number,
  margin: number
): number {
  const maxX = Math.max(margin, window.innerWidth - panelWidth - margin);
  const alignRight = rect.left + rect.width / 2 > window.innerWidth / 2;
  if (alignRight) {
    return clamp(rect.right - panelWidth, margin, maxX);
  }
  return clamp(rect.left, margin, maxX);
}

function getViewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getViewportMargin(): number {
  return window.innerWidth <= 700 ? 12 : 22;
}

function getSpaceBelow(rect: DOMRect, margin: number): number {
  return getViewportHeight() - margin - (rect.bottom + PANEL_GAP_PX);
}

function getSpaceAbove(rect: DOMRect, margin: number): number {
  return rect.top - margin - PANEL_GAP_PX;
}

/** Open below only when there is enough room for the full panel. */
function shouldOpenPanelBelow(
  spaceBelow: number,
  naturalHeight: number
): boolean {
  return spaceBelow >= Math.max(naturalHeight, PANEL_MIN_HEIGHT);
}

function isRectVisible(rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0;
}

/** Capture launcher screen position while it is visible. */
function captureLauncherAnchor(launcher: HTMLElement): DOMRect {
  const rect = launcher.getBoundingClientRect();
  if (isRectVisible(rect)) {
    lastLauncherAnchor = rect;
  }
  return lastLauncherAnchor ?? rect;
}

/** Rect to use for panel placement (works when launcher is display:none). */
function getLauncherRect(launcher: HTMLElement): DOMRect {
  const live = launcher.getBoundingClientRect();
  if (isRectVisible(live)) {
    return captureLauncherAnchor(launcher);
  }
  return lastLauncherAnchor ?? live;
}

function restoreLauncherAtAnchor(launcher: HTMLElement): void {
  const rect = lastLauncherAnchor;
  if (!rect || !isRectVisible(rect)) return;
  applyCustomPosition(launcher, rect.left, rect.top);
  savePosition(rect.left, rect.top);
}

/** Position the checklist panel beside the launcher rect (dynamic above/below). */
export function positionQuickStartPanel(
  launcher: HTMLElement,
  panel: HTMLElement
): void {
  const margin = getViewportMargin();
  const gap = PANEL_GAP_PX;
  const rect = getLauncherRect(launcher);
  const panelWidth = panel.offsetWidth || 380;
  const panelX = resolvePanelHorizontalX(rect, panelWidth, margin);

  clearPanelCornerStyles(panel);

  const naturalHeight = measurePanelNaturalHeight(panel);
  const heightCap = getPanelHeightCap();
  const spaceBelow = getSpaceBelow(rect, margin);
  const spaceAbove = getSpaceAbove(rect, margin);
  const openBelow =
    shouldOpenPanelBelow(spaceBelow, naturalHeight) || spaceBelow > spaceAbove;
  const available = Math.max(
    0,
    Math.min(openBelow ? spaceBelow : spaceAbove, heightCap)
  );
  const panelHeight = Math.min(naturalHeight, available);

  if (openBelow) {
    applyPanelPositionTop(panel, panelX, rect.bottom + gap, panelHeight);
    return;
  }

  const panelBottom = getViewportHeight() - (rect.top - gap);
  applyPanelPositionBottom(panel, panelX, panelBottom, panelHeight);
}

/** Open the panel anchored to wherever the launcher currently sits. */
export function openQuickStartPanel(
  launcher: HTMLElement,
  panel: HTMLElement
): void {
  captureLauncherAnchor(launcher);
  positionQuickStartPanel(launcher, panel);
  panel.classList.add("show");
  launcher.style.display = "none";
  requestAnimationFrame(() => {
    if (!panel.classList.contains("show")) return;
    positionQuickStartPanel(launcher, panel);
  });
}

/** Re-run panel placement after list content changes while open. */
export function repositionQuickStartPanelIfOpen(
  root?: ParentNode | null
): void {
  const quickStartRoot =
    root ??
    document.getElementById("recruiting-quick-start-root") ??
    document.getElementById("prospecting-quick-start-root");
  if (!quickStartRoot) return;

  const launcher = quickStartRoot.querySelector<HTMLElement>("#qsLauncher");
  const panel = quickStartRoot.querySelector<HTMLElement>("#qsPanel");
  if (!launcher || !panel || !panel.classList.contains("show")) return;

  positionQuickStartPanel(launcher, panel);
}

/** Close the panel and restore the launcher to its pre-open position. */
export function closeQuickStartPanel(
  launcher: HTMLElement,
  panel: HTMLElement
): void {
  panel.classList.remove("show");
  resetPanelPosition(panel);
  restoreLauncherAtAnchor(launcher);
  launcher.style.display = "flex";
}

function restoreLauncherPosition(launcher: HTMLElement): void {
  const saved = readSavedPosition();
  if (!saved) return;

  const maxX = Math.max(8, window.innerWidth - launcher.offsetWidth - 8);
  const maxY = Math.max(8, window.innerHeight - launcher.offsetHeight - 8);
  const x = clamp(saved.x, 8, maxX);
  const y = clamp(saved.y, 8, maxY);
  applyCustomPosition(launcher, x, y);
  lastLauncherAnchor = new DOMRect(
    x,
    y,
    launcher.offsetWidth,
    launcher.offsetHeight
  );
}

function enableLauncherDrag(launcher: HTMLElement, panel: HTMLElement): void {
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    dragging = true;
    moved = false;
    const rect = launcher.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    originX = rect.left;
    originY = rect.top;
    launcher.classList.add("qs-dragging");
    launcher.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

    moved = true;
    const maxX = Math.max(8, window.innerWidth - launcher.offsetWidth - 8);
    const maxY = Math.max(8, window.innerHeight - launcher.offsetHeight - 8);
    const x = clamp(originX + dx, 8, maxX);
    const y = clamp(originY + dy, 8, maxY);
    applyCustomPosition(launcher, x, y);
    lastLauncherAnchor = new DOMRect(
      x,
      y,
      launcher.offsetWidth,
      launcher.offsetHeight
    );

    if (panel.classList.contains("show")) {
      positionQuickStartPanel(launcher, panel);
    }
  };

  const finishDrag = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    launcher.classList.remove("qs-dragging");
    if (launcher.hasPointerCapture(event.pointerId)) {
      launcher.releasePointerCapture(event.pointerId);
    }

    if (moved) {
      const x = parseFloat(launcher.style.left);
      const y = parseFloat(launcher.style.top);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        savePosition(x, y);
        lastLauncherAnchor = new DOMRect(
          x,
          y,
          launcher.offsetWidth,
          launcher.offsetHeight
        );
      }
      launcher.dataset.suppressClick = "1";
      window.setTimeout(() => {
        delete launcher.dataset.suppressClick;
      }, 0);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  launcher.addEventListener("pointerdown", onPointerDown);
  launcher.addEventListener("pointermove", onPointerMove);
  launcher.addEventListener("pointerup", finishDrag);
  launcher.addEventListener("pointercancel", finishDrag);

  launcher.addEventListener(
    "click",
    (event) => {
      if (launcher.dataset.suppressClick) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

function clampStoredLauncherAnchor(launcher: HTMLElement): void {
  if (!lastLauncherAnchor) return;
  // Launcher is display:none while the panel is open — use cached dimensions.
  const launcherWidth = launcher.offsetWidth || lastLauncherAnchor.width;
  const launcherHeight = launcher.offsetHeight || lastLauncherAnchor.height;
  const maxX = Math.max(8, window.innerWidth - launcherWidth - 8);
  const maxY = Math.max(8, window.innerHeight - launcherHeight - 8);
  const x = clamp(lastLauncherAnchor.left, 8, maxX);
  const y = clamp(lastLauncherAnchor.top, 8, maxY);
  lastLauncherAnchor = new DOMRect(x, y, launcherWidth, launcherHeight);
}

/** Keep launcher above modals/drawers and draggable anywhere on screen. */
export function setupQuickStartLauncher(root: HTMLElement): () => void {
  root.classList.add("quick-start-root");

  const launcher = root.querySelector<HTMLElement>("#qsLauncher");
  const panel = root.querySelector<HTMLElement>("#qsPanel");
  if (!launcher || !panel) return () => {};

  restoreLauncherPosition(launcher);
  if (!lastLauncherAnchor) {
    captureLauncherAnchor(launcher);
  }
  enableLauncherDrag(launcher, panel);

  const onResize = () => {
    const panelOpen = panel.classList.contains("show");
    if (launcher.style.display !== "none") {
      captureLauncherAnchor(launcher);
      const x = parseFloat(launcher.style.left);
      const y = parseFloat(launcher.style.top);
      if (
        launcher.classList.contains("qs-custom-pos") &&
        Number.isFinite(x) &&
        Number.isFinite(y)
      ) {
        const maxX = Math.max(8, window.innerWidth - launcher.offsetWidth - 8);
        const maxY = Math.max(
          8,
          window.innerHeight - launcher.offsetHeight - 8
        );
        applyCustomPosition(launcher, clamp(x, 8, maxX), clamp(y, 8, maxY));
      }
    }
    if (panelOpen) {
      // Re-clamp cached anchor while launcher is hidden so close restores on-screen.
      clampStoredLauncherAnchor(launcher);
      positionQuickStartPanel(launcher, panel);
    }
  };

  window.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("scroll", onResize);
  return () => {
    window.removeEventListener("resize", onResize);
    window.visualViewport?.removeEventListener("resize", onResize);
    window.visualViewport?.removeEventListener("scroll", onResize);
  };
}
