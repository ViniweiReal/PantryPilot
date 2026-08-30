# PantryPilot — Devpost submission

## Tagline

From the ingredients you already have to a cooked dinner, through visible and human-approved WebMCP actions.

## Links

- Live app: https://viniweireal.github.io/PantryPilot/?demo=1
- Public source: https://github.com/ViniweiReal/PantryPilot
- Video: add the public YouTube URL before submission

## Inspiration

Dinner is rarely blocked by a lack of recipes. It is blocked by fragmented decisions: what is already at home, what fits the time and diet, what can be substituted, what is missing, and what to do next. Conventional recipe chatbots can suggest a meal, but the user still has to translate that text into actions across the page.

PantryPilot explores a more useful relationship: the agent can operate the cooking product directly while every change remains visible and reversible.

## What it does

A user tells PantryPilot what they have and asks for a dinner under real constraints. The agent can inspect the current kitchen, select a matching meal, scale portions, replace ingredients, prepare missing groceries, start the cooking view, advance steps and set persistent timers.

The Golden Demo starts with eggs, tomatoes and rice. The agent plans a vegetarian dinner for two, prioritizes the tomatoes, replaces dairy with oat milk, pauses for human approval before adding missing groceries, then starts cooking and sets a timer. An on-screen Agent Trace records the exact tool name, compact input, result, status and duration for every action.

## Why WebMCP

PantryPilot is built around ten structured tools exposed through `document.modelContext`. They operate the same state and commands as the visible interface, so agent actions and human actions never diverge. The website supplies precise, current product context instead of asking the model to infer controls from pixels or DOM text.

This is progressive enhancement: without WebMCP, PantryPilot remains a complete responsive cooking app. With WebMCP, it becomes directly operable by an agent.

## Human–agent collaboration and safety

The agent is useful because it can coordinate several small decisions. The human remains in control where intent matters most. `add_missing_to_shopping_list` only opens a review sheet and remains `needs-user` in the trace until the user approves or cancels. `prepare_grocery_checkout` is deliberately non-transactional. No exposed tool can approve a purchase, submit payment or place an order.

## How we built it

The app uses React, TypeScript, Vite, Zustand, Zod and the WebMCP imperative API. Curated local recipe data makes judging fast and reproducible. Pure domain functions handle ingredient aliases, recipe ranking, serving calculations and substitutions. Zustand owns one persisted state shared by UI and tools. Tool inputs are schema-validated, and a central wrapper records trace lifecycle events without changing any public tool contract.

GitHub Actions runs the test suite and production build. A separate least-privilege workflow deploys the generated site to GitHub Pages.

## Challenges

The hardest part was drawing the right boundary between agent convenience and human authority. We also had to keep tool outputs compact while exposing enough state for good planning, make timers correct across reloads, and make a deterministic multi-step demo feel like a polished consumer product rather than a tool inspector.

## Accomplishments

- Ten real WebMCP tools connected to visible product state
- A deterministic pantry-to-cooking Golden Journey
- Explicit human approval for shopping changes
- A persistent, jury-readable tool trace
- Reload-safe plans, cooking progress, timers and trace
- Responsive desktop and mobile UI
- Automated contract, budget, state and integration tests

## Impact

PantryPilot shows how agentic browsing can reduce everyday coordination work without hiding decisions from people. The same pattern—structured action, visible state and explicit confirmation at consequential boundaries—can extend beyond cooking to travel, support, healthcare preparation and public services.

## What is next

After the hackathon, PantryPilot could add opt-in retailer integrations, richer dietary profiles, seasonal recipe packs and household collaboration. Any transactional integration would preserve the same human-confirmation boundary demonstrated here.
