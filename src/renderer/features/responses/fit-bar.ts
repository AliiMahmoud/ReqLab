/** The steps a bar takes to fit, mildest first (their styles are in response-bar-styles.ts). */
const STEPS = ["is-compact", "is-tight"] as const;

/**
 * Keeps a bar's items on one line: tries it as it is, then each step (tighter spacing, shorter
 * labels, fewer details) until everything fits. Measures the real content, so it follows the
 * width, the font size and what the bar shows.
 */
export function fitOnOneLine(bar: HTMLElement): void {
  bar.classList.remove(...STEPS);
  for (const step of STEPS) {
    if (isOnOneLine(bar)) return;
    bar.classList.add(step);
  }
}

/** All visible items start on the same row (the bar wraps when they do not fit). */
function isOnOneLine(bar: HTMLElement): boolean {
  const tops = [...bar.children]
    .map((item) => item.getBoundingClientRect())
    .filter((box) => box.width > 0)
    .map((box) => box.top);
  return tops.length === 0 || Math.max(...tops) - Math.min(...tops) < 4;
}
