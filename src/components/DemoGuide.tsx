import { useState } from 'react';
import { Bot, Check, Copy, PlugZap, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { TOOL_CATALOG } from '../webmcp/tools';
import { usePantryStore } from '../store/usePantryStore';
import { OverlayShell } from './Overlays';

export const GOLDEN_DEMO_PROMPT = 'Plan a vegetarian dinner for two in under 25 minutes. Use my tomatoes first, replace dairy with a vegan option, add anything missing, then start cooking.';

export function DemoGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const status = usePantryStore((state) => state.webMcpStatus);
  const resetDemo = usePantryStore((state) => state.resetDemo);
  const [copied, setCopied] = useState(false);
  const [prepared, setPrepared] = useState(false);

  if (!open) return null;

  const statusCopy = {
    connected: [`${TOOL_CATALOG.length} tools connected`, 'Ready for ChatGPT or another WebMCP-capable agent.'],
    checking: ['Checking WebMCP', 'The page is confirming browser support.'],
    unavailable: ['Manual fallback ready', 'The same visible workflow can still be demonstrated in the page.'],
    error: ['Tools need a reload', 'The product remains usable while WebMCP reconnects.'],
  }[status];

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(GOLDEN_DEMO_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const prepare = () => {
    resetDemo();
    setPrepared(true);
  };

  return (
    <OverlayShell titleId="demo-guide-title" onClose={onClose} className="dialog--demo-guide">
      <div className="demo-guide__masthead">
        <div className="dialog-icon dialog-icon--aubergine"><Sparkles size={22} /></div>
        <span className="demo-guide__badge">Judge-ready walkthrough</span>
      </div>
      <span className="panel-kicker">Golden demo</span>
      <h2 id="demo-guide-title">See human + agent collaboration in one minute.</h2>
      <p>Start from three pantry staples, let an agent plan and adapt dinner, then keep the final shopping decision human.</p>

      <div className={`demo-readiness demo-readiness--${status}`}>
        {status === 'connected' ? <Check size={18} /> : <PlugZap size={18} />}
        <span><strong>{statusCopy[0]}</strong><small>{statusCopy[1]}</small></span>
      </div>

      <ol className="demo-guide__steps">
        <li><span>01</span><div><strong>Prepare the kitchen</strong><p>Reset to eggs, tomatoes and rice with an empty trace.</p></div></li>
        <li><span>02</span><div><strong>Give your agent one goal</strong><p>Paste the prompt below into the browser agent.</p></div></li>
        <li><span>03</span><div><strong>Watch, then approve</strong><p>Tool calls stay visible. Shopping pauses for your click.</p></div></li>
      </ol>

      <div className="demo-prompt">
        <div><Bot size={16} /><span>Judge prompt</span></div>
        <blockquote>{GOLDEN_DEMO_PROMPT}</blockquote>
        <button type="button" onClick={() => void copyPrompt()}>
          {copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy prompt'}
        </button>
      </div>

      <div className="demo-safety"><ShieldCheck size={17} /><span>The agent can prepare a list, but it cannot approve or purchase anything.</span></div>
      <div className="dialog-actions">
        <button className="button button--ghost" type="button" onClick={onClose}>Close guide</button>
        <button className="button button--primary" type="button" onClick={prepare}>
          {prepared ? <Check size={16} /> : <RotateCcw size={16} />}{prepared ? 'Demo prepared' : 'Prepare golden demo'}
        </button>
      </div>
    </OverlayShell>
  );
}
