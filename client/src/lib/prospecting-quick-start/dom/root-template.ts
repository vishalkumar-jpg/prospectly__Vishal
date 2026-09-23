export const ROOT_TEMPLATE = `<button id="qsLauncher">🚀 Quick Start <span class="qs-pct" id="qsPct">0%</span></button>
<div id="qsPanel">
  <div class="qs-head">
    <button class="qs-close" id="qsClose" aria-label="Close quick start panel">✕</button>
    <h3>Quick Start Walkthrough</h3>
    <p>Start an interactive tour of prospecting</p>
    <div class="qs-progress"><span class="pctnum" id="qsPctBig">0%</span><div class="qs-bar"><i id="qsBarFill"></i></div></div>
  </div>
  <div class="qs-crumb-wrap" id="qsCrumb" hidden></div>
  <div class="qs-list" id="qsList"></div>
  <div class="qs-foot"><button id="qsReset">↺ Reset progress</button><span style="font-size:11px;color:#7E948A;font-weight:600">Prospectly Guide</span></div>
</div>
<div id="qsdBack"></div>
<div id="qsdWin">
  <div class="qsd-tab" id="qsdTab">Find a Prospect</div>
  <div class="qsd-frame">
    <div class="qsd-stage" id="qsdStage"></div>
    <div class="qsd-bar">
      <span class="gnum" id="qsdStep">1/6</span>
      <div class="gtxt"><h5 id="qsdT"></h5><p id="qsdD"></p></div>
      <button class="gback" id="qsdPrev">← Back</button>
      <button class="gnext" id="qsdNext">Next →</button>
      <button class="gskip" id="qsdSkip">Skip</button>
    </div>
  </div>
  <button class="qsd-x" id="qsdX" aria-label="Close walkthrough">✕</button>
</div>`;
