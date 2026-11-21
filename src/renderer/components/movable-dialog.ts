interface Offset {
  x: number;
  y: number;
}

/**
 * Lets a modal <dialog> be dragged by its title bar (`handle`), kept inside the window. Each time
 * the dialog opens it starts centred again. Buttons inside the handle still work as buttons.
 * The offset is set through the CSSOM (`style.translate`), which the Content Security Policy allows.
 */
export function makeDialogMovable(dialog: HTMLDialogElement, handle: HTMLElement): void {
  if (handle.dataset["movable"] === "true") return;
  handle.dataset["movable"] = "true";
  const offset: Offset = { x: 0, y: 0 };
  dialog.addEventListener("close", () => {
    offset.x = 0;
    offset.y = 0;
    dialog.style.translate = "";
  });
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || (event.target as Element).closest("button, input, select, a") !== null) return;
    event.preventDefault();
    startDrag({ dialog, handle, offset }, event);
  });
}

function startDrag(
  { dialog, handle, offset }: { dialog: HTMLDialogElement; handle: HTMLElement; offset: Offset },
  down: PointerEvent,
): void {
  handle.setPointerCapture(down.pointerId);
  const from = { ...offset };
  const box = dialog.getBoundingClientRect();
  // Where the dialog sits with no offset, so its edges never pass the window's.
  const left = box.left - from.x;
  const top = box.top - from.y;
  const move = (event: PointerEvent): void => {
    offset.x = clamp(from.x + event.clientX - down.clientX, -left, window.innerWidth - left - box.width);
    offset.y = clamp(from.y + event.clientY - down.clientY, -top, window.innerHeight - top - box.height);
    dialog.style.translate = `${String(offset.x)}px ${String(offset.y)}px`;
  };
  const stop = (): void => {
    handle.removeEventListener("pointermove", move);
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", stop, { once: true });
  handle.addEventListener("pointercancel", stop, { once: true });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
