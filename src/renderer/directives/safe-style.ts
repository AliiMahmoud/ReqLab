import { noChange } from "lit";
import { Directive, directive, PartType, type AttributePart, type PartInfo } from "lit/directive.js";

type Styles = Readonly<Record<string, string | undefined>>;

/**
 * Sets inline styles through the CSSOM (element.style), never as a style="…" attribute, which the
 * production CSP blocks. (Lit's styleMap writes the attribute on its first render.) Use as
 * style=${safeStyle({ paddingLeft: "8px" })}; an undefined value removes that property.
 */
class SafeStyleDirective extends Directive {
  #previous = new Set<string>();

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ATTRIBUTE || partInfo.name !== "style") {
      throw new Error("safeStyle can only be used in the style attribute.");
    }
  }

  /**
   * Rendering never produces an attribute value; update() does the work through the CSSOM.
   * The parameter is unused here but defines the directive's argument type for callers.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Lit infers safeStyle()'s arguments from render()
  render(_styles: Styles): typeof noChange {
    return noChange;
  }

  override update(part: AttributePart, [styles]: [Styles]): typeof noChange {
    const { style } = part.element;
    const current = new Set<string>();
    for (const [name, value] of Object.entries(styles)) {
      const property = toCssProperty(name);
      if (value === undefined) continue;
      style.setProperty(property, value);
      current.add(property);
    }
    for (const property of this.#previous) if (!current.has(property)) style.removeProperty(property);
    this.#previous = current;
    return noChange;
  }
}

/** paddingLeft → padding-left; custom properties (--x) stay as they are. */
function toCssProperty(name: string): string {
  return name.startsWith("--") ? name : name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export const safeStyle = directive(SafeStyleDirective);
