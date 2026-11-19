import type { ReactiveController, ReactiveControllerHost } from "lit";

/** Closes the host's open <details> menus when the user clicks anywhere outside them. */
class OutsideClickCloser implements ReactiveController {
  constructor(private readonly host: ReactiveControllerHost & HTMLElement) {
    host.addController(this);
  }

  hostConnected(): void {
    document.addEventListener("pointerdown", this.closeMenus);
  }

  hostDisconnected(): void {
    document.removeEventListener("pointerdown", this.closeMenus);
  }

  private readonly closeMenus = (event: PointerEvent): void => {
    const path = event.composedPath();
    for (const menu of this.host.shadowRoot?.querySelectorAll("details[open]") ?? []) {
      if (!path.includes(menu)) menu.removeAttribute("open");
    }
  };
}

export function closeMenusOnOutsideClick(host: ReactiveControllerHost & HTMLElement): void {
  new OutsideClickCloser(host);
}
