/** The name the search highlight is registered under (styled with ::highlight(script-docs-search)). */
const HIGHLIGHT = "script-docs-search";
const MAX_HIGHLIGHTS = 500;

/**
 * Filters the scripts help to what matches `query`: a section whose title matches shows whole;
 * otherwise only its matching parts (an API entry, a note, an example with its title). Matches are
 * highlighted. Returns false when nothing matches.
 */
export function filterDocs(content: HTMLElement, query: string): boolean {
  for (const hidden of content.querySelectorAll<HTMLElement>("[hidden]")) hidden.hidden = false;
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    clearDocsHighlight();
    return true;
  }
  let isAnyShown = false;
  for (const section of content.querySelectorAll("section")) {
    const isShown = showMatchingParts(section, needle);
    section.hidden = !isShown;
    isAnyShown ||= isShown;
  }
  highlightMatches(content, needle);
  return isAnyShown;
}

export function clearDocsHighlight(): void {
  CSS.highlights.delete(HIGHLIGHT);
}

function showMatchingParts(section: HTMLElement, needle: string): boolean {
  const isTitleMatch = contains(section.querySelector("h3"), needle);
  let isAnyShown = isTitleMatch;
  for (const part of partsOf(section)) {
    const isShown = isTitleMatch || part.some((element) => contains(element, needle));
    for (const element of part) element.hidden = !isShown;
    isAnyShown ||= isShown;
  }
  return isAnyShown;
}

/** The pieces a section shows or hides together: an API entry (term and text), a note, an example. */
function partsOf(section: HTMLElement): HTMLElement[][] {
  return [...section.children].flatMap((child) => (child instanceof HTMLElement ? partsOfChild(child) : []));
}

function partsOfChild(child: HTMLElement): HTMLElement[][] {
  if (child.tagName === "H3") return [];
  if (child.tagName === "DL") return pairs(child);
  if (child.tagName === "UL") return [...child.children].map((item) => [item as HTMLElement]);
  if (child.classList.contains("example-title")) return [withNextCode(child)];
  // An example's code goes with its title (above).
  if (child.previousElementSibling?.classList.contains("example-title") === true) return [];
  return [[child]];
}

function pairs(list: HTMLElement): HTMLElement[][] {
  const items = [...list.children] as HTMLElement[];
  const result: HTMLElement[][] = [];
  for (let index = 0; index < items.length; index += 2) result.push(items.slice(index, index + 2));
  return result;
}

function withNextCode(title: HTMLElement): HTMLElement[] {
  const code = title.nextElementSibling;
  return code instanceof HTMLElement && code.tagName === "PRE" ? [title, code] : [title];
}

function contains(element: Element | null, needle: string): boolean {
  return (element?.textContent ?? "").toLowerCase().includes(needle);
}

/** Marks every match in the visible text (CSS Custom Highlight: no change to the page itself). */
function highlightMatches(content: HTMLElement, needle: string): void {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  for (
    let node = walker.nextNode();
    node !== null && ranges.length < MAX_HIGHLIGHTS;
    node = walker.nextNode()
  ) {
    if (node.parentElement?.closest("[hidden]")) continue;
    const text = (node.textContent ?? "").toLowerCase();
    for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + needle.length)) {
      const range = new Range();
      range.setStart(node, at);
      range.setEnd(node, at + needle.length);
      ranges.push(range);
    }
  }
  CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges));
}
