<p align="center">
  <img src="resources/icon.png" alt="ReqLab" width="128" height="128">
</p>

<h1 align="center">ReqLab</h1>

<p align="center">
  A local-first, encrypted API client.<br>
  No account, no telemetry, no cloud. Every workspace is an encrypted file on your machine.
</p>

<p align="center">macOS · Windows · Linux</p>

---

## Why ReqLab

- **Private by design.** The app sends nothing except the requests you send. There are no accounts, no sync and no analytics.
- **Encrypted at rest.** Each workspace is its own AES-256 database. Its key is protected by your operating system's keychain, and optionally by a master password.
- **Bring your collections.** Import collections in the common v2.0 / v2.1 JSON format, with environments, globals and scripts, and export them back in the same format.
- **Hardened.** The UI has no access to Node or the network, every message to the core is validated, and scripts run in a sealed sandbox.

## Features

**Requests**

- Any HTTP method, query and path parameters, headers, and bodies: JSON (with live error highlighting), raw, form-data, x-www-form-urlencoded and GraphQL.
- Paste a cURL command into the URL bar to fill in the whole request, or copy any request as cURL.
- Responses: pretty and raw views, collapse / expand for large JSON, an HTML preview, images with a hex view, headers, a timing breakdown, and cookies.
- Tabs that come back as you left them, with drag to reorder, close others, and Cmd/Ctrl+Enter to send or cancel.

**Organisation**

- Workspaces, collections and folders, with drag and drop, multi-select, duplicate and rename.
- Environments (with colour tags), collection variables and globals; `{{variables}}` are highlighted and editable on hover.
- History of sent requests.

**Auth**

- Basic, Digest, Bearer token, API key, AWS Signature v4, JWT bearer, and OAuth 2.0 (authorization code, client credentials, password).
- Set auth once on a collection or folder; every request inside inherits it.

**Scripts and tests**

- Pre-request and post-response scripts on requests, folders and collections, with the widely used `pm` script API: variables, `pm.request`, `pm.response`, `pm.test`, `pm.expect` and `console.log`.
- `pm.execution.runRequest(id)` runs another saved request (for example, a login) from a script.
- `pm.cookies` reads the cookies that go with the request (`get`, `has`, `toObject` …), and `pm.cookies.jar()` reads and changes the cookie jar for any URL (`get`, `getAll`, `set`, `unset`, `clear`).
- An editor with JavaScript highlighting and autocomplete, a built-in API reference, and a Tests tab with results and console output.
- Scripts run in QuickJS, a separate JavaScript engine, on a worker thread: no files, no network, and limits of 64 MB and 10 seconds per run.

**Import and export**

- Import collections in the v2.0 / v2.1 JSON format, environments, globals and full data dumps.
- Export a collection, a folder or a selection as a v2.1 collection file, or a whole workspace as a ReqLab bundle.

**Network**

- Per-request timeout (or none), response size limit, cookie handling, and SSL certificate verification.
- Proxy (or follow the system proxy), custom CA certificates, and client certificates (mTLS).

**Comfort**

- Light and dark modes with 15 colour themes, and adjustable fonts and app size.
- Auto-save, auto-closing brackets and quotes, and a choice of where your data is stored.

## Getting ReqLab

Builds for macOS (Apple silicon and Intel, `.dmg`) and Windows (installer, plus a portable `.zip`) are produced with `./build.sh`; see [Building releases](#building-releases).

The builds are not yet signed with a developer certificate:

- **macOS:** right-click the app and choose **Open** the first time.
- **Windows:** SmartScreen will warn on the first launch.

## Development

**Requirements**

- Node.js 22.12 or newer.
- pnpm 10.28, through Corepack: `corepack enable`.

No compilers are needed: the database module ships prebuilt binaries for every platform.

```sh
pnpm install
pnpm dev        # the app with hot reload
```

> **VS Code and Cursor terminals** set `ELECTRON_RUN_AS_NODE=1`, which makes Electron start as plain Node ("electron does not provide an export named 'BrowserWindow'"). Run `unset ELECTRON_RUN_AS_NODE` first.

| Command                                        | What it does                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`                                     | Run the app with hot reload                                            |
| `pnpm build`                                   | Compile main, preload and renderer into `out/`                         |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | Code checks                                                            |
| `pnpm audit:deps`                              | Fail on any known vulnerability in dependencies (npm advisories + OSV) |
| `./build.sh`                                   | Build all release packages into `release/`                             |

Before committing: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm audit`.

### Building releases

`./build.sh` uses Node 22 (an installed one if present, through nvm), starts from a clean slate and produces:

| File                             | Platform                                                          |
| -------------------------------- | ----------------------------------------------------------------- |
| `ReqLab-<version>-mac-arm64.dmg` | macOS, Apple silicon                                              |
| `ReqLab-<version>-mac-x64.dmg`   | macOS, Intel                                                      |
| `ReqLab Setup <version>.exe`     | Windows installer (x64)                                           |
| `ReqLab-<version>-win.zip`       | Windows portable (x64): unzip and run; data stays next to the app |

The app icon is drawn from `resources/icon.svg`; run `scripts/make-icons.sh` after changing it.

## Where your data lives

| Platform         | Folder                                 |
| ---------------- | -------------------------------------- |
| macOS            | `~/Library/Application Support/ReqLab` |
| Windows          | `%APPDATA%\ReqLab`                     |
| Linux            | `~/.config/ReqLab`                     |
| Windows portable | `ReqLab Data` next to `ReqLab.exe`     |

You can move it anywhere from **Settings › General › Data folder**: ReqLab moves everything and keeps working.

## Security model

- **Workspaces:**
  - Each one is a SQLCipher (AES-256) file with its own random 256-bit key.
  - That key is wrapped by the OS keychain (macOS Keychain, Windows DPAPI, Linux libsecret / KWallet) and, if you set one, by a master password (Argon2id or scrypt, then AES-256-GCM).
- **Locking** a workspace closes its database and wipes its key from memory; quitting the app locks every workspace.
- **The UI is sandboxed:**
  - Context isolation, no Node.
  - A strict Content Security Policy: it cannot open any network connection.
  - Trusted Types; no permissions, downloads or navigation.
- **Every IPC message** is checked against its sender and validated with zod, in both directions.
- **Scripts:** they run in QuickJS on a worker thread, with only plain data crossing in and out. They cannot reach your files or open network connections; the only way out is `pm.execution.runRequest`, which sends a request already saved in the workspace.
- **Electron Fuses** are set at package time: no `RUN_AS_NODE`, no `NODE_OPTIONS`, no inspector flags, ASAR integrity on.
- **Supply chain:**
  - Exact versions with a frozen lockfile.
  - A 7-day minimum release age for new versions; install scripts blocked.
  - CI fails on any known vulnerability.

## Project layout

```
src/
  main/        Electron main process: owns data, keys and the network
    http/        sending requests (TLS, proxies, redirects, body limits)
    pipeline/    the steps every request goes through (auth, variables, scripts, cookies, history)
    scripts/     the QuickJS sandbox and the pm API
    auth/        one file per auth type, OAuth 2.0
    interop/     collection and cURL import / export, workspace bundles
    storage/     encrypted SQLite, migrations, keys, data folder
    security/    window hardening, app:// protocol, CSP, portable mode
    ipc/         the router that validates every message from the UI
  preload/     the only bridge from the UI to main (window.reqlab)
  renderer/    Lit web components and signal stores (no Node, no network)
  shared/      types and zod schemas shared by both sides, including the IPC contract
```

Import boundaries are enforced by ESLint: the renderer can never import Electron, Node or main-process code.

## Roadmap

- A collection runner (iterations, data files, reports).
- Importers for OpenAPI 3, Swagger 2, HAR and Insomnia; code snippets for other languages.
- A secret scanner before export.
- WebSocket, Server-Sent Events, GraphQL introspection and gRPC.
- Automated tests.

## License

All rights reserved (no open-source license has been chosen yet).
