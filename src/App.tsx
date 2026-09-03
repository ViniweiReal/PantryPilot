import { useEffect, useRef, useState } from 'react';
import { Bot, Check, Clapperboard, PlugZap, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { AgentBar } from './components/AgentBar';
import { Brand, Decal } from './components/Brand';
import { CookMode } from './components/CookMode';
import { DemoGuide } from './components/DemoGuide';
import { DinnerRoute } from './components/DinnerRoute';
import { CheckoutDialog, ShoppingReviewDialog, Toast, ToolDrawer } from './components/Overlays';
import { PantryPanel } from './components/PantryPanel';
import { RecipePanel } from './components/RecipePanel';
import { RecipeExtras } from './components/RecipeExtras';
import { ShoppingPanel } from './components/ShoppingPanel';
import { TOOL_CATALOG, registerWebMcpTools } from './webmcp/tools';
import { usePantryStore } from './store/usePantryStore';

function PlannerApp() {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [demoGuideOpen, setDemoGuideOpen] = useState(() => new URLSearchParams(window.location.search).get('demo') === '1');
  const status = usePantryStore((state) => state.webMcpStatus);
  const resetDemo = usePantryStore((state) => state.resetDemo);

  const statusLabel = status === 'connected' ? 'WebMCP live' : status === 'checking' ? 'Checking WebMCP' : 'Tools ready';

  return (
    <div className="app-shell" id="top">
      <header className="topbar">
        <Brand />
        <nav aria-label="Main navigation">
          <a className="is-active" href="#plan">Plan</a>
          <a href="#recipe-title">Recipe</a>
          <a href="#shopping-title">Shop</a>
          <a href="#next-step">Cook</a>
        </nav>
        <div className="topbar__actions">
          <button className="demo-guide-button" type="button" aria-label="Demo guide" onClick={() => setDemoGuideOpen(true)}>
            <Clapperboard size={15} /><span>Demo guide</span>
          </button>
          <button className={`webmcp-pill webmcp-pill--${status}`} type="button" onClick={() => setToolsOpen(true)}>
            <span>{status === 'connected' ? <Check size={12} /> : <PlugZap size={12} />}</span>
            {statusLabel}
            <small>{TOOL_CATALOG.length}</small>
          </button>
          <button className="reset-button" type="button" onClick={() => resetDemo()} title="Reset the golden demo"><RotateCcw size={16} /><span>Reset demo</span></button>
          <span className="profile-dot" aria-label="PantryPilot demo kitchen" title="PantryPilot demo kitchen"><Bot size={16} aria-hidden="true" /></span>
        </div>
      </header>

      <AgentBar />

      <section className="workflow-label" id="plan">
        <span>Tonight’s workspace</span>
        <p><Bot size={15} /> Human choices and agent actions share one live kitchen state.</p>
      </section>

      <div className="workspace-grid">
        <PantryPanel />
        <RecipePanel />
        <ShoppingPanel />
        <RecipeExtras />
      </div>

      <DinnerRoute />

      <section className="trust-strip" aria-label="PantryPilot product principles">
        <div><Sparkles size={18} /><span><strong>Built around what you have</strong><small>Less waste, fewer decisions.</small></span></div>
        <div><ShieldCheck size={18} /><span><strong>Visible agent actions</strong><small>Every change leaves a trail.</small></span></div>
        <div><Check size={18} /><span><strong>Human approval by design</strong><small>Purchasing always stops with you.</small></span></div>
      </section>

      <footer>
        <Brand compact />
        <p>From “what’s left?” to dinner on the table.</p>
        <div><a href="https://webmachinelearning.github.io/webmcp/" target="_blank" rel="noreferrer">WebMCP</a><a href="https://github.com/ViniweiReal/PantryPilot" target="_blank" rel="noreferrer">GitHub</a><span>MIT · 2026</span></div>
      </footer>

      <Decal kind="tomato" className="page-decal page-decal--tomato" />
      <Decal kind="basil" className="page-decal page-decal--basil" />
      <DemoGuide open={demoGuideOpen} onClose={() => setDemoGuideOpen(false)} />
      <ToolDrawer open={toolsOpen} onClose={() => setToolsOpen(false)} />
      <ShoppingReviewDialog />
      <CheckoutDialog />
      <Toast />
    </div>
  );
}

export default function App() {
  const view = usePantryStore((state) => state.view);
  const setStatus = usePantryStore((state) => state.setWebMcpStatus);
  const reconcileTimers = usePantryStore((state) => state.reconcileTimers);
  const resetDemo = usePantryStore((state) => state.resetDemo);
  const demoWasSeeded = useRef(false);

  useEffect(() => {
    if (demoWasSeeded.current || new URLSearchParams(window.location.search).get('demo') !== '1') return;
    demoWasSeeded.current = true;
    const seedKey = 'pantrypilot:golden-demo-seeded:v1';
    try {
      if (window.sessionStorage.getItem(seedKey)) return;
    } catch {
      // Continue with a clean demo if session storage is unavailable.
    }
    resetDemo({ silent: true });
    try {
      window.sessionStorage.setItem(seedKey, '1');
    } catch {
      // The app remains fully usable without session storage.
    }
  }, [resetDemo]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void registerWebMcpTools(setStatus).then((registeredCleanup) => { cleanup = registeredCleanup; });
    return () => cleanup?.();
  }, [setStatus]);

  useEffect(() => {
    reconcileTimers();
    const onVisibility = () => !document.hidden && reconcileTimers();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [reconcileTimers]);

  return view === 'cooking' ? <><CookMode /><ShoppingReviewDialog /><CheckoutDialog /><Toast /></> : <PlannerApp />;
}
