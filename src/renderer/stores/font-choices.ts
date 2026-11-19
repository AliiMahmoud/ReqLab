/**
 * Font choices for Settings › Theme (app font) and General › Editor (code font). The CSP forbids
 * loading web fonts, so each must be installed on this computer; each falls back to the system's.
 */
const SANS_FALLBACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO_FALLBACK = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const sans = (label: string, family = label) => ({ label, family, stack: `"${family}", ${SANS_FALLBACK}` });
const mono = (label: string, family = label) => ({ label, family, stack: `"${family}", ${MONO_FALLBACK}` });

export const APP_FONTS = {
  system: { label: "System default", family: "", stack: SANS_FALLBACK },
  plex: sans("IBM Plex Sans"),
  inter: sans("Inter"),
  sfpro: sans("SF Pro", "SF Pro Text"),
  helvetica: sans("Helvetica Neue"),
  segoe: sans("Segoe UI"),
  roboto: sans("Roboto"),
  opensans: sans("Open Sans"),
  sourcesans: sans("Source Sans 3"),
  noto: sans("Noto Sans"),
  lato: sans("Lato"),
  ubuntu: sans("Ubuntu"),
  avenir: sans("Avenir Next"),
  verdana: sans("Verdana"),
  arial: sans("Arial"),
  georgia: { label: "Georgia (serif)", family: "Georgia", stack: "Georgia, serif" },
} as const;

export const EDITOR_FONTS = {
  system: { label: "System monospace", family: "", stack: MONO_FALLBACK },
  jetbrains: mono("JetBrains Mono"),
  sfmono: mono("SF Mono"),
  menlo: mono("Menlo"),
  monaco: mono("Monaco"),
  fira: mono("Fira Code"),
  cascadia: mono("Cascadia Code"),
  consolas: mono("Consolas"),
  sourcecode: mono("Source Code Pro"),
  plexmono: mono("IBM Plex Mono"),
  roboto: mono("Roboto Mono"),
  ubuntu: mono("Ubuntu Mono"),
  hack: mono("Hack"),
  iosevka: mono("Iosevka"),
  dejavu: mono("DejaVu Sans Mono"),
  courier: mono("Courier New"),
} as const;

const installed = new Map<string, boolean>();

/**
 * Whether a font is installed: text drawn in it, with a generic fallback behind it, differs in
 * width from the fallback alone (for at least one of two fallbacks). Results are cached.
 */
export function isFontInstalled(family: string): boolean {
  if (family === "") return true;
  const known = installed.get(family);
  if (known !== undefined) return known;
  const context = document.createElement("canvas").getContext("2d");
  if (context === null) return true;
  const widthIn = (font: string): number => {
    context.font = `32px ${font}`;
    return context.measureText("mmmmmmmmmmlli 0O@#WwQq").width;
  };
  const result = ["monospace", "serif"].some(
    (generic) => widthIn(`"${family}", ${generic}`) !== widthIn(generic),
  );
  installed.set(family, result);
  return result;
}
