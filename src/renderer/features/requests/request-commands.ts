/** The window event the menu's Send (Cmd/Ctrl+Enter) and Save (Cmd/Ctrl+S) commands arrive as. */
export const REQUEST_COMMAND_EVENT = "reqlab:request-command";

export function isRequestCommand(event: Event): event is CustomEvent<"send" | "save"> {
  return event instanceof CustomEvent && (event.detail === "send" || event.detail === "save");
}
