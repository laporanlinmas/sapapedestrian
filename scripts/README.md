# System checks and debugging

Node.js 22.6 or newer is required. Install the browser once before running UI
tests:

```bash
npm install
npx playwright install chromium
```

## Checks

```bash
npm run check          # TypeScript lint, unit tests, and unused-code audit
npm run build          # Typecheck and production bundle
npm run test:ui        # Browser flows, responsive layouts, and screenshots
npm run check:all      # All of the above in sequence
```

`test:ui` starts the Vite development server itself. It does not submit real
complaints, ratings, or gallery requests: those feature tests use mock API
responses so they are safe to repeat without Firebase, Cloudinary, or Google
credentials.

The browser suite checks:

- 320, 360, and 390 px mobile layouts; 768 px tablet; 1280 and 1920 px desktop.
- Horizontal overflow, initial page rendering, mobile navigation, and theme toggle.
- Complaint submission and ticket tracking, rating submission, and gallery lightbox.
- Uncaught browser JavaScript errors.

## Smoke-test a running deployment

Start `npm run dev` or `npm run preview` in another terminal, then run:

```bash
npm run check:smoke
npm run check:smoke -- --base-url https://your-deployment.example
```

The smoke check verifies SPA routes, JavaScript/CSS entry assets, and safe API
validation responses. It does not create data or read credentials. Set
`CHECK_BASE_URL` instead of passing `--base-url` to use a different server.

## Failure artifacts

On browser test failure, Playwright records screenshots, video, and a trace
under `test-results/`. Open the detailed HTML report with:

```bash
npx playwright show-report playwright-report
npx playwright show-trace test-results/<test-folder>/trace.zip
```

Artifacts contain rendered page data. Review them before sharing or attaching
them to an external issue.
