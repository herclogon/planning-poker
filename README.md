# Simple and free planning poker

A lightweight, real-time [planning poker](https://en.wikipedia.org/wiki/Planning_poker)
tool for agile estimation. No sign-up, no database, no tracking — just share a
link and start estimating together.

![Planning poker screenshot](https://user-images.githubusercontent.com/884844/153072383-05f552d5-4d98-4fca-aa6c-eb316af26a9b.png)

- **Live demo:** https://poker.hsdesign.ru/
- **Source:** https://git.dev.hsdesign.ru/public/planning-poker
- **GitHub mirror:** https://github.com/herclogon/planning-poker

Inspired by [planningpokeronline.com](https://planningpokeronline.com/).

## Features

- **Shared sessions** — open the app to get a unique room URL, share it, and
  everyone who opens the link joins the same table.
- **Real-time voting** over WebSocket — votes, joins, and disconnects appear
  instantly for everyone.
- **Hidden until revealed** — cards stay face-down until someone reveals them,
  with a short countdown before they flip.
- **Two estimation modes** — a numeric scale (Fibonacci-like) or text-based
  time estimates.
- **Instant results** — the average is calculated on reveal and can be copied
  to the clipboard.
- **Persistent identity** — your name and preferences are remembered in the
  browser via `localStorage`.
- **Connection indicator** with automatic keep-alive pings.
- **Installable PWA** — works on desktop and mobile, installable to the home
  screen.

## Tech stack

- **Backend:** Node.js — a small HTTP server for static files plus a
  [`ws`](https://github.com/websockets/ws) WebSocket server that broadcasts
  messages between clients in the same session. State lives in memory only; no
  database required.
- **Frontend:** a single-page [Vue.js](https://vuejs.org/) app served as static
  assets. No build step — Vue and other libraries are bundled locally.
- **Tests:** end-to-end tests with [Playwright](https://playwright.dev/).

## Getting started

### With Docker

```bash
docker run -e HTTP_PORT=8080 -p 8080:8080 herclogon/poker:latest
```

Then open http://localhost:8080.

### From source

Requires Node.js (see `Dockerfile` for the tested version).

```bash
npm ci
npm start
```

Or use the `Makefile` helpers:

```bash
make run                 # install dependencies and start the server
make run HTTP_PORT=3000  # start on a custom port
make help                # list available commands
```

The server listens on `HTTP_PORT` (default `8080`).

## Testing

```bash
npm run test:e2e         # run Playwright end-to-end tests
npm run test:e2e:headed  # run them with a visible browser
```

## Configuration

| Variable    | Default | Description                          |
| ----------- | ------- | ------------------------------------ |
| `HTTP_PORT` | `8080`  | Port for the HTTP/WebSocket server.  |

## Deployment

- **Docker** — build with `docker build -t poker .` and run the image above.
- **systemd** — see [`systemctl.service.example`](systemctl.service.example)
  for a sample service unit to run the app from source.

## Project structure

```
src/
  server.js         HTTP + WebSocket server
  index.html        Single-page app markup
  app.js            Vue application logic
  styles.css        Styles
  manifest.json     PWA manifest
  service-worker.js Service worker for offline/PWA support
  assets/           Bundled frontend libraries and icons
tests/              Playwright end-to-end tests
```

## Contributing

Issues and pull requests are welcome. Please read the
[Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Helpful resources

- [Planning poker solutions comparison](https://pmclub-pro.translate.goog/articles/kak-my-iskali-nash-idealnyj-instrument-dlya-poker-planirovaniya?_x_tr_sl=ru&_x_tr_tl=en&_x_tr_hl=en-US&_x_tr_pto=wapp)

## License

[MIT](LICENSE) © Dmitry A. Golubkov
