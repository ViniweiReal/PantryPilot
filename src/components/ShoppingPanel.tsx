import { useEffect, useState } from 'react';
import { Braces, Check, ChevronRight, Circle, CircleAlert, ListChecks, LoaderCircle, ShoppingBag, Sparkles, Trash2, UserRoundCheck } from 'lucide-react';
import { formatAmount } from '../domain/meal-engine';
import { usePantryStore } from '../store/usePantryStore';

function relativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 20) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export function ShoppingPanel() {
  const items = usePantryStore((state) => state.shoppingItems);
  const activity = usePantryStore((state) => state.activity);
  const toolTrace = usePantryStore((state) => state.toolTrace);
  const toggleShoppingItem = usePantryStore((state) => state.toggleShoppingItem);
  const removeShoppingItem = usePantryStore((state) => state.removeShoppingItem);
  const clearCheckedShoppingItems = usePantryStore((state) => state.clearCheckedShoppingItems);
  const proposeShoppingList = usePantryStore((state) => state.proposeShoppingList);
  const prepareCheckout = usePantryStore((state) => state.prepareCheckout);
  const checked = items.filter((item) => item.checked).length;
  const [trailMode, setTrailMode] = useState<'trace' | 'changes'>(toolTrace.length ? 'trace' : 'changes');

  useEffect(() => {
    if (toolTrace[0]?.id) setTrailMode('trace');
  }, [toolTrace[0]?.id]);

  const traceStatus = {
    running: ['Running', <LoaderCircle className="spin" size={13} />],
    success: ['Complete', <Check size={13} />],
    'needs-user': ['Waiting for you', <UserRoundCheck size={13} />],
    error: ['Stopped', <CircleAlert size={13} />],
  } as const;

  return (
    <aside className="right-rail">
      <section className="side-card shopping-card" aria-labelledby="shopping-title">
        <div className="panel-heading">
          <div><span className="panel-kicker">02 · Fill the gaps</span><h2 id="shopping-title">Shopping list</h2></div>
          {items.length > 0 && <span className="count-badge count-badge--tomato">{items.length - checked}</span>}
        </div>

        {items.length === 0 ? (
          <div className="shopping-empty">
            <span><ShoppingBag size={25} /></span>
            <strong>Nothing added yet</strong>
            <p>We’ll calculate only what your chosen dinner is missing.</p>
            <button className="button button--soft button--full" type="button" onClick={() => proposeShoppingList()}>
              <Sparkles size={16} /> Build my list
            </button>
          </div>
        ) : (
          <>
            <div className="shopping-progress"><span><strong>{checked}</strong> of {items.length} packed</span><div><i style={{ width: `${(checked / items.length) * 100}%` }} /></div></div>
            <ul className="shopping-list">
              {items.map((item) => (
                <li key={item.id} className={item.checked ? 'is-checked' : ''}>
                  <button className="shopping-check" type="button" onClick={() => toggleShoppingItem(item.id)} aria-label={`${item.checked ? 'Uncheck' : 'Check'} ${item.name}`}>
                    {item.checked ? <Check size={14} /> : <Circle size={14} />}
                  </button>
                  <span><strong>{item.name}</strong><small>{formatAmount(item.amount, item.unit)}</small></span>
                  <button className="icon-button icon-button--quiet" type="button" onClick={() => removeShoppingItem(item.id)} aria-label={`Remove ${item.name}`}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
            <div className="shopping-actions">
              {checked > 0 && <button type="button" onClick={clearCheckedShoppingItems}>Clear packed</button>}
              <button className="button button--primary button--full" type="button" onClick={() => prepareCheckout()}>
                Review list <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </section>

      <section className="side-card activity-card" aria-labelledby="activity-title">
        <div className="panel-heading panel-heading--compact">
          <div><span className="panel-kicker">Live trail</span><h2 id="activity-title">{trailMode === 'trace' ? 'Agent trace' : 'What changed'}</h2></div>
          {trailMode === 'trace' ? <Braces size={19} /> : <ListChecks size={19} />}
        </div>
        <div className="trail-switch" role="tablist" aria-label="Live trail view">
          <button type="button" role="tab" aria-selected={trailMode === 'trace'} className={trailMode === 'trace' ? 'is-active' : ''} onClick={() => setTrailMode('trace')}>Tool calls <span>{toolTrace.length}</span></button>
          <button type="button" role="tab" aria-selected={trailMode === 'changes'} className={trailMode === 'changes' ? 'is-active' : ''} onClick={() => setTrailMode('changes')}>Changes</button>
        </div>
        {trailMode === 'trace' ? (
          toolTrace.length ? (
            <ol className="tool-trace-list">
              {toolTrace.slice(0, 5).map((event) => (
                <li key={event.id} className={`tool-trace-item tool-trace-item--${event.status}`}>
                  <span className="tool-trace-item__icon">{traceStatus[event.status][1]}</span>
                  <div>
                    <code>{event.toolName}</code>
                    <p><span>in</span>{event.inputSummary}</p>
                    {event.resultSummary && <p><span>out</span>{event.resultSummary}</p>}
                    <small>{traceStatus[event.status][0]}{event.durationMs ? ` · ${event.durationMs}ms` : ''} · {relativeTime(event.startedAt)}</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="tool-trace-empty"><Braces size={20} /><strong>No calls yet</strong><p>Open the demo guide, copy the prompt and watch every WebMCP action appear here.</p></div>
          )
        ) : (
          <ol className="activity-list">
            {activity.slice(0, 5).map((event, index) => (
              <li key={event.id}>
                <span className={`activity-dot activity-dot--${event.source}`}>{event.source === 'agent' ? 'AI' : index === 0 ? <Check size={12} /> : ''}</span>
                <div><strong>{event.message}</strong>{event.detail && <p>{event.detail}</p>}<small>{event.source === 'agent' ? 'Agent' : event.source === 'you' ? 'You' : 'PantryPilot'} · {relativeTime(event.createdAt)}</small></div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <blockquote className="side-quote">
        <Sparkles size={16} />
        <p>“Dinner plans should change as quickly as real life does.”</p>
        <cite>PantryPilot principle no. 01</cite>
      </blockquote>
    </aside>
  );
}
