/** Gives an empty range (the caret) a box to measure, without taking any room. */
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

/** A field that can hold {{variables}}: a one-line input, or a text box that may wrap. */
export type TextField = HTMLInputElement | HTMLTextAreaElement;

/** The styles that decide where text lands in a field; copied onto the invisible measuring copy. */
const LAYOUT_PROPERTIES = [
  "box-sizing",
  "width",
  "height",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-style",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "font-stretch",
  "font-variant",
  "letter-spacing",
  "word-spacing",
  "line-height",
  "text-indent",
  "text-transform",
  "tab-size",
  "white-space",
  "overflow-wrap",
  "word-break",
  "scrollbar-gutter",
] as const;

/**
 * Where text ranges of a field are on screen (viewport rectangles, one per line a range spans).
 * Measured on an invisible copy laid out exactly like the field, with its wrapping and scroll,
 * so it works for one-line inputs and wrapping text boxes alike. An empty range gives the caret.
 */
export function measureRanges(
  field: TextField,
  ranges: readonly { start: number; end: number }[],
): DOMRect[][] {
  const mirror = createMirror(field);
  const spans: HTMLSpanElement[] = [];
  let at = 0;
  for (const range of ranges) {
    mirror.append(field.value.slice(at, range.start));
    const span = document.createElement("span");
    span.textContent = range.end > range.start ? field.value.slice(range.start, range.end) : ZERO_WIDTH_SPACE;
    mirror.append(span);
    spans.push(span);
    at = range.end;
  }
  mirror.append(field.value.slice(at));
  document.body.append(mirror);
  mirror.scrollTop = field.scrollTop;
  mirror.scrollLeft = field.scrollLeft;
  const rects = spans.map((span) => [...span.getClientRects()]);
  mirror.remove();
  return rects;
}

/** Where the caret would be at `index`: its left edge and the bottom of its line. */
export function caretPoint(field: TextField, index: number): { left: number; bottom: number } {
  const rect = measureRanges(field, [{ start: index, end: index }])[0]?.[0];
  const box = field.getBoundingClientRect();
  return { left: rect?.left ?? box.left, bottom: rect?.bottom ?? box.bottom };
}

/** Where a popover opens under a spot in the field: below a one-line input, or below the line. */
export function popoverTop(field: TextField, lineBottom: number): number {
  return (field instanceof HTMLInputElement ? field.getBoundingClientRect().bottom : lineBottom) + 4;
}

function createMirror(field: TextField): HTMLDivElement {
  const style = getComputedStyle(field);
  const box = field.getBoundingClientRect();
  const mirror = document.createElement("div");
  for (const property of LAYOUT_PROPERTIES) {
    mirror.style.setProperty(property, style.getPropertyValue(property));
  }
  // A one-line input never wraps, whatever its white-space says.
  if (field instanceof HTMLInputElement) mirror.style.whiteSpace = "pre";
  Object.assign(mirror.style, {
    position: "fixed",
    left: `${String(box.left)}px`,
    top: `${String(box.top)}px`,
    overflow: "hidden",
    visibility: "hidden",
    pointerEvents: "none",
    borderColor: "transparent",
  });
  return mirror;
}
