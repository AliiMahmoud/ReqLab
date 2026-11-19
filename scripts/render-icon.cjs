// Run by scripts/make-icons.sh with Electron: draws resources/icon.svg into a 1024 px PNG
// with a transparent background (offscreen, so nothing shows on screen).
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const [source, target] = process.argv.slice(-2);

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: { offscreen: true, javascript: false },
  });
  window.webContents.setZoomFactor(1);
  const svg = fs.readFileSync(path.resolve(source), "utf8");
  const page = `<html><body style="margin:0;background:transparent">${svg}</body></html>`;
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page)}`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const image = await window.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
  fs.writeFileSync(path.resolve(target), image.resize({ width: 1024, height: 1024 }).toPNG());
  app.quit();
});
