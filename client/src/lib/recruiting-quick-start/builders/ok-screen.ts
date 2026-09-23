export function okScreen(title: string, msg: string): string {
  return (
    '<div class="qsd-screen" style="background:#fff"><div class="m-ok"><div class="inner">' +
    '<div class="big">✓</div><h3>' +
    title +
    "</h3><p>" +
    msg +
    "</p>" +
    '<div style="margin-top:14px"><span class="m-btn pri qsd-hot" data-callout="Click Done" data-co-side="left">Done</span></div>' +
    "</div></div></div>"
  );
}
