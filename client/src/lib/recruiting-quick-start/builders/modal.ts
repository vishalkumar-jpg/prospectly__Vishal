export function modalHead(ic: string, title: string, sub?: string): string {
  return (
    '<div class="m-modal-head"><div class="mh-ic">' +
    ic +
    "</div><div><h5>" +
    title +
    "</h5>" +
    (sub ? "<p>" + sub + "</p>" : "") +
    "</div></div>"
  );
}
