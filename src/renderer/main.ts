import "./styles/theme.css";
// The header is the title bar: it leaves room for macOS's traffic lights or the Windows / Linux buttons.
document.documentElement.dataset["platform"] = navigator.userAgent.includes("Mac") ? "mac" : "other";
// Applies the saved theme before the first render, so the wrong theme never flashes.
import "./stores/theme-store";
import "./stores/app-settings-store";
import "./stores/auto-save";
import "./app-shell";
