<p align="center">
  <img src="public/pantrypilot-logo.svg" alt="PantryPilot" width="360" />
</p>

<p align="center">
  <strong>From pantry to plate, with visible agent actions.</strong>
</p>

<p align="center">
  <a href="https://viniweireal.github.io/PantryPilot/?demo=1">Live demo</a>
  · <a href="#the-golden-demo">Golden demo</a>
  · <a href="#webmcp-tool-belt">WebMCP tools</a>
  · <a href="#run-locally">Run locally</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/WebMCP-10%20tools-356B45?style=flat-square" alt="10 WebMCP tools" />
  <img src="https://img.shields.io/badge/shopping-human%20approval-D94B34?style=flat-square" alt="Human approval required for shopping" />
  <img src="https://img.shields.io/badge/license-MIT-5A2D45?style=flat-square" alt="MIT license" />
</p>

---

PantryPilot turns ingredients already in your kitchen into a cooked dinner — with a WebMCP agent that can plan, adapt and guide every visible step.

## Live demo

**[Open PantryPilot with the jury demo guide](https://viniweireal.github.io/PantryPilot/?demo=1)**

No sign-in is required. In a WebMCP-capable browser, open the guide, choose **Prepare demo**, copy the Golden Prompt and watch each tool call appear in the live Agent Trace. PantryPilot pauses before changing the shopping list and waits for an explicit human decision.

## The golden demo

Start with eggs, tomatoes and rice, then ask:

> Plan a vegetarian dinner for two in under 25 minutes. Use my tomatoes first, replace dairy with a vegan option, add anything missing, then start cooking.

PantryPilot selects **Golden tomato rice**, swaps whole milk for oat milk, prepares a human-reviewed shopping list and opens a persistent step-by-step cooking session. The timer survives reloads. Shopping never crosses the final human-confirmation boundary.

## What is complete

- A responsive pantry → plan → shop → cook product flow
- Six curated, deterministic recipes with ingredient matching and dietary filters
- Portion scaling, safe substitutions and deduplicated missing-ingredient calculation
- Human-in-the-loop shopping review and a deliberately non-transactional checkout boundary
- Full-screen cooking mode with resumable progress and absolute-time timers
- Local persistence for pantry, plan, list, cooking session and timers
- Ten real WebMCP tools registered through `document.modelContext`
- A persistent Agent Trace with exact tool name, input, result, status and duration
- A one-click jury guide and deterministic demo reset (`?demo=1`)
- A manual/in-app agent fallback when WebMCP is not available
- Original food photography and hand-painted culinary decals generated for PantryPilot
- Unit, state and WebMCP contract tests plus a production build

## WebMCP tool belt

| Tool | Purpose | Read-only |
| --- | --- | --- |
| `get_kitchen_state` | Read pantry, preferences, plan, list, cooking progress and timers | Yes |
| `plan_dinner` | Select the best recipe for pantry and constraints | No |
| `select_dinner` | Choose a named recipe | No |
| `adjust_servings` | Scale the active recipe from 1–8 servings | No |
| `replace_ingredient` | Apply a known, visible substitution | No |
| `add_missing_to_shopping_list` | Open the human shopping-review sheet | No |
| `prepare_grocery_checkout` | Open the final local review; never purchases | No |
| `start_cooking_mode` | Start the guided cooking session | No |
| `advance_cooking_step` | Complete the visible cooking step | No |
| `set_cooking_timer` | Start a named, persistent timer | No |

All tools use the same Zustand domain commands as the human UI. Inputs are validated with Zod, outputs are compact JSON-safe objects, and registration is cleaned up with `AbortController`. PantryPilot uses progressive enhancement: the product remains fully usable without WebMCP.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

For local WebMCP testing in a compatible Chrome build:

1. Open `chrome://flags/#enable-webmcp-testing`.
2. Enable the flag and relaunch Chrome.
3. Open PantryPilot on localhost and inspect the **WebMCP live** tool belt.

The current deployed origin-trial requirements and browser support are documented by [Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/) and the [WebMCP specification](https://webmachinelearning.github.io/webmcp/).

## Quality checks

```bash
npm test
npm run build
```

The tests cover ingredient aliases, deterministic recipe ranking, scaling, substitutions-before-shopping, shopping deduplication, cooking snapshots, timer reconciliation, the complete Golden Journey, the human shopping boundary and WebMCP schema/character budgets.

## Submission kit

- [Devpost submission copy](submission/DEVPOST.md)
- [English video script and shot list](submission/VIDEO_SCRIPT.md)
- [Five manual WebMCP evals](submission/EVALS.md)
- [Final release checklist](submission/CHECKLIST.md)

## Architecture

```text
src/
  components/       Product surfaces, dialogs and cooking mode
  data/             Curated recipes, ingredients and substitutions
  domain/           Pure meal matching/scaling/missing-item logic
  store/            Persisted shared Zustand state and commands
  webmcp/           Tool schemas, validation and registration
  test/             Browser-independent test setup
```

No backend, account, external recipe API, retailer integration or payment provider is required for the demo path. That keeps the experience fast, reproducible and safe for judging.

## License

[MIT](LICENSE) © 2026 ViniweiReal.
