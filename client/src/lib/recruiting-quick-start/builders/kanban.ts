export function mc(av: string, name: string, btn?: string): string {
  return (
    '<div class="m-kcd"><div class="nm"><span class="av">' +
    av +
    "</span>" +
    name +
    "</div>" +
    (btn ? '<div class="ac">' + btn + "</div>" : "") +
    "</div>"
  );
}

export function stageBoard(
  stages: [string, string][],
  cells: (string | undefined)[]
): string {
  const many = stages.length > 7;
  const cls = many ? "m-kanflow m-kanscroll" : "m-kanflow";
  const sty = many
    ? ""
    : ' style="grid-template-columns:repeat(' + stages.length + ',1fr)"';
  return (
    '<div class="' +
    cls +
    '"' +
    sty +
    ">" +
    stages
      .map(
        (s, i) =>
          '<div class="m-kcol"><h6><span class="m-kdot" style="background:' +
          s[1] +
          '"></span>' +
          s[0] +
          "</h6>" +
          (cells[i] || '<div class="m-kempty">\u2014</div>') +
          "</div>"
      )
      .join("") +
    "</div>"
  );
}
