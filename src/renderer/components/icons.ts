import { svg, type TemplateResult } from "lit";

/** Stroke icons from the design. Decorative: the button around them carries the label. */
function icon(paths: TemplateResult, size = 14): TemplateResult {
  return svg`<svg aria-hidden="true" width=${size} height=${size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

/** The app's logo: a paper plane (sending a request) with motion lines, in the theme's accent. */
export const logoIcon = (size = 18): TemplateResult =>
  svg`<svg aria-hidden="true" width=${size} height=${size} viewBox="0 0 24 24">
    <g stroke="var(--color-accent)" stroke-width="1.4" stroke-linecap="round" fill="none">
      <path d="M2.6 17.6l2.2-2.2" stroke-opacity="0.55"></path><path d="M4.4 19.8l1.6-1.6" stroke-opacity="0.4"></path>
    </g>
    <path d="M21.4 2.6 16.6 16.9 13.8 10.6 7.6 7.8Z" fill="var(--color-accent)" stroke="var(--color-accent)"
      stroke-width="1.2" stroke-linejoin="round"></path>
    <path d="M21.4 2.6 13.8 10.2" stroke="#000" stroke-opacity="0.3" stroke-width="1.1" stroke-linecap="round"></path>
  </svg>`;
export const plusIcon = (): TemplateResult => icon(svg`<path d="M12 5v14M5 12h14"></path>`);
export const saveIcon = (): TemplateResult =>
  icon(svg`<path d="M5 3h11l3 3v15H5z"></path><path d="M8 3v6h8V3"></path>`, 16);
export const chevronDownIcon = (): TemplateResult => icon(svg`<path d="M6 9l6 6 6-6"></path>`, 12);
export const chevronUpIcon = (): TemplateResult => icon(svg`<path d="M6 15l6-6 6 6"></path>`, 12);
export const searchIcon = (): TemplateResult =>
  icon(svg`<circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path>`, 13);
export const chevronRightIcon = (): TemplateResult => icon(svg`<path d="M9 6l6 6-6 6"></path>`, 12);
export const folderIcon = (): TemplateResult => icon(svg`<path d="M3 6h6l2 2h10v11H3z"></path>`, 16);
export const closeIcon = (): TemplateResult => icon(svg`<path d="M6 6l12 12M18 6L6 18"></path>`, 12);
export const trashIcon = (size = 13): TemplateResult =>
  icon(svg`<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"></path>`, size);
export const pencilIcon = (): TemplateResult => icon(svg`<path d="M4 20h4L20 8l-4-4L4 16z"></path>`, 13);
export const lockIcon = (): TemplateResult =>
  icon(
    svg`<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>`,
    13,
  );
/** A gear (cog) with rounded teeth: Settings. */
export const settingsIcon = (size = 16): TemplateResult =>
  icon(
    svg`<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>`,
    size,
  );
/** An arrow down into a tray: Import. */
export const importIcon = (): TemplateResult =>
  icon(
    svg`<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"></path><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"></path>`,
    15,
  );
/** An arrow up out of a tray: Export. */
export const exportIcon = (): TemplateResult =>
  icon(
    svg`<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"></path><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"></path>`,
    15,
  );
/** A floppy disk: Export workspace (saves the whole workspace to a file). */
export const saveFileIcon = (): TemplateResult =>
  icon(
    svg`<path d="M5 3h11l3 3v15H5z"></path><path d="M8 3v5h7V3"></path><path d="M8 21v-7h8v7"></path>`,
    15,
  );
/** A window with its left column marked: show / hide the left panel. */
export const sidebarIcon = (): TemplateResult =>
  icon(svg`<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"></rect><path d="M9.5 4.5v15"></path>`, 16);
/** A terminal prompt ">_": the scripts' console (Tests tab). */
export const consoleIcon = (): TemplateResult =>
  icon(
    svg`<rect x="3" y="4.5" width="18" height="15" rx="2.5"></rect><path d="M7 10l3 2.5L7 15M12.5 15.5H17"></path>`,
    15,
  );
export const checkIcon = (size = 12): TemplateResult => icon(svg`<path d="M5 12l5 5 9-10"></path>`, size);
export const keyIcon = (): TemplateResult =>
  icon(svg`<circle cx="8" cy="15" r="4"></circle><path d="M11 12l9-9M17 6l3 3M15 8l2 2"></path>`, 13);
export const eyeIcon = (): TemplateResult =>
  icon(
    svg`<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle>`,
    13,
  );
export const copyIcon = (): TemplateResult =>
  icon(
    svg`<rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path>`,
    13,
  );
export const sunIcon = (): TemplateResult =>
  icon(
    svg`<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>`,
    15,
  );
export const moonIcon = (): TemplateResult =>
  icon(svg`<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path>`, 15);
export const monitorIcon = (): TemplateResult =>
  icon(svg`<rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M8 20h8M12 16v4"></path>`, 15);
export const slidersIcon = (): TemplateResult =>
  icon(
    svg`<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"></path><circle cx="16" cy="6" r="2"></circle><circle cx="10" cy="12" r="2"></circle><circle cx="18" cy="18" r="2"></circle>`,
    15,
  );
/** Angle brackets with a slash: "copy as code" (cURL). */
export const codeIcon = (size = 16): TemplateResult =>
  icon(
    svg`<path d="M8 8l-4 4 4 4"></path><path d="M16 8l4 4-4 4"></path><path d="M13.5 5.5l-3 13"></path>`,
    size,
  );
/** A filled, two-tone folder like macOS Finder's (for folders in lists; folderIcon stays the outline action icon). */
export const macFolderIcon = (size = 16): TemplateResult =>
  svg`<svg aria-hidden="true" width=${size} height=${size} viewBox="0 0 24 24">
    <path fill="var(--folder-back)" d="M2 6.2C2 5 3 4 4.2 4h4.7c.6 0 1.2.3 1.6.8l1.2 1.5c.2.3.6.5 1 .5h7.1C21 6.8 22 7.8 22 9v9.3c0 1.2-1 2.2-2.2 2.2H4.2C3 20.5 2 19.5 2 18.3z"></path>
    <path fill="var(--folder-front)" d="M2 9.6c0-1 .8-1.8 1.8-1.8h16.4c1 0 1.8.8 1.8 1.8v8.7c0 1.2-1 2.2-2.2 2.2H4.2C3 20.5 2 19.5 2 18.3z"></path>
    <path fill="none" stroke="var(--folder-shine)" stroke-width="0.9" stroke-linecap="round" d="M3.4 9.1h17.2"></path>
  </svg>`;
/** An arrow pointing up and right: "go to" / open elsewhere. */
export const goToIcon = (): TemplateResult => icon(svg`<path d="M7 17 17 7M9 7h8v8"></path>`, 14);
/** A page with a folded corner: a request. */
export const requestIcon = (): TemplateResult =>
  icon(svg`<path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v4h4"></path>`, 15);
/** Stacked cards: a collection. */
export const collectionIcon = (): TemplateResult =>
  icon(svg`<rect x="4" y="8" width="16" height="12" rx="2"></rect><path d="M7 5h10M9 2h6"></path>`, 15);
export const arrowLeftIcon = (): TemplateResult => icon(svg`<path d="M19 12H5M11 6l-6 6 6 6"></path>`, 16);
export const arrowRightIcon = (): TemplateResult => icon(svg`<path d="M5 12h14M13 6l6 6-6 6"></path>`, 16);
