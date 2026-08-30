import { useEffect, useRef } from 'react';
import {
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  LockKeyhole,
  PlugZap,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { formatAmount } from '../domain/meal-engine';
import { TOOL_CATALOG } from '../webmcp/tools';
import { usePantryStore } from '../store/usePantryStore';

export function OverlayShell({ titleId, onClose, children, className = '' }: { titleId: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button ref={closeButton} className="dialog__close" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        {children}
      </section>
    </div>
  );
}

export function ShoppingReviewDialog() {
  const review = usePantryStore((state) => state.pendingShoppingReview);
  const confirm = usePantryStore((state) => state.confirmShoppingList);
  const cancel = usePantryStore((state) => state.cancelShoppingReview);

  if (!review) return null;
  return (
    <OverlayShell titleId="shopping-review-title" onClose={cancel} className="dialog--review">
      <div className="dialog-icon dialog-icon--tomato"><ShoppingBag size={23} /></div>
      <span className="panel-kicker">Human check required</span>
      <h2 id="shopping-review-title">Review what’s missing</h2>
      <p>PantryPilot prepared these items for your dinner. Nothing is added until you approve it.</p>
      <ul className="review-list">
        {review.items.map((item) => (
          <li key={item.id}><span><Check size={14} /></span><strong>{item.name}</strong><small>{formatAmount(item.amount, item.unit)}</small></li>
        ))}
      </ul>
      <div className="approval-note"><ShieldCheck size={18} /><span><strong>You’re in control.</strong> This updates only the local shopping list — no order or payment.</span></div>
      <div className="dialog-actions">
        <button className="button button--ghost" type="button" onClick={cancel}>Not now</button>
        <button className="button button--primary" type="button" onClick={confirm}>
          Add {review.items.length} items{review.continueToCooking ? ' & start cooking' : ''} <ChevronRight size={16} />
        </button>
      </div>
    </OverlayShell>
  );
}

export function CheckoutDialog() {
  const open = usePantryStore((state) => state.checkoutOpen);
  const items = usePantryStore((state) => state.shoppingItems);
  const close = usePantryStore((state) => state.closeCheckout);
  const confirm = usePantryStore((state) => state.confirmCheckout);
  if (!open) return null;

  return (
    <OverlayShell titleId="checkout-title" onClose={close} className="dialog--checkout">
      <div className="checkout-header">
        <div className="dialog-icon dialog-icon--basil"><LockKeyhole size={22} /></div>
        <div><span className="panel-kicker">Final review</span><h2 id="checkout-title">Your list is ready</h2></div>
      </div>
      <p>Check the plan before you head out. PantryPilot deliberately stops here for your approval.</p>
      <div className="checkout-summary">
        <span><ShoppingBag size={18} /><strong>{items.length} ingredients</strong></span>
        <span><Sparkles size={18} /><strong>1 dinner covered</strong></span>
      </div>
      <ul className="checkout-list">
        {items.map((item) => <li key={item.id}><span>{item.name}</span><small>{formatAmount(item.amount, item.unit)}</small></li>)}
      </ul>
      <div className="approval-note approval-note--warning"><CircleAlert size={18} /><span><strong>Demo boundary.</strong> No retailer, checkout, payment or personal data is connected.</span></div>
      <div className="dialog-actions">
        <button className="button button--ghost" type="button" onClick={close}>Keep editing</button>
        <button className="button button--primary" type="button" onClick={confirm}>Mark list ready <Check size={16} /></button>
      </div>
    </OverlayShell>
  );
}

export function ToolDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const status = usePantryStore((state) => state.webMcpStatus);
  if (!open) return null;

  const statusCopy = {
    checking: ['Checking browser support', 'PantryPilot is looking for document.modelContext.'],
    connected: ['WebMCP connected', `${TOOL_CATALOG.length} tools are registered with this page.`],
    unavailable: ['Manual mode is active', 'The full app works normally. Enable Chrome’s WebMCP testing flag or origin trial to expose tools to an agent.'],
    error: ['Tool registration needs attention', 'The browser supports WebMCP, but one or more tools could not be registered. Reload after checking permissions.'],
  }[status];

  return (
    <div className="drawer-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="tool-drawer" role="dialog" aria-modal="true" aria-labelledby="tools-title">
        <div className="tool-drawer__top">
          <div className="dialog-icon dialog-icon--aubergine"><PlugZap size={21} /></div>
          <button className="dialog__close" type="button" onClick={onClose} aria-label="Close tools"><X size={18} /></button>
        </div>
        <span className="panel-kicker">Agent interface</span>
        <h2 id="tools-title">WebMCP tool belt</h2>
        <p>These tools change the same state you see on screen. There is no hidden agent-only version of PantryPilot.</p>
        <div className={`tool-status-card tool-status-card--${status}`}>
          {status === 'connected' ? <Check size={18} /> : <Bot size={18} />}
          <span><strong>{statusCopy[0]}</strong><small>{statusCopy[1]}</small></span>
        </div>
        <ol className="tool-list">
          {TOOL_CATALOG.map((tool, index) => (
            <li key={tool.name}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><strong>{tool.title}</strong><code>{tool.name}</code><p>{tool.short}</p></div>
              {tool.readOnly && <small>read only</small>}
            </li>
          ))}
        </ol>
        <div className="tool-drawer__footer"><ShieldCheck size={17} /><span>Shopping approval remains human-only by design.</span></div>
      </aside>
    </div>
  );
}

export function Toast() {
  const message = usePantryStore((state) => state.toast);
  const dismiss = usePantryStore((state) => state.dismissToast);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(dismiss, 4300);
    return () => window.clearTimeout(timeout);
  }, [message, dismiss]);

  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <span><Check size={15} /></span>
      <div><strong>{message.title}</strong>{message.detail && <small>{message.detail}</small>}</div>
      <button type="button" onClick={dismiss} aria-label="Dismiss notification"><X size={14} /></button>
    </div>
  );
}
