import { Check, ChevronRight, Circle, ListChecks, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';
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
  const toggleShoppingItem = usePantryStore((state) => state.toggleShoppingItem);
  const removeShoppingItem = usePantryStore((state) => state.removeShoppingItem);
  const clearCheckedShoppingItems = usePantryStore((state) => state.clearCheckedShoppingItems);
  const proposeShoppingList = usePantryStore((state) => state.proposeShoppingList);
  const prepareCheckout = usePantryStore((state) => state.prepareCheckout);
  const checked = items.filter((item) => item.checked).length;

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
          <div><span className="panel-kicker">Live trail</span><h2 id="activity-title">What changed</h2></div>
          <ListChecks size={19} />
        </div>
        <ol className="activity-list">
          {activity.slice(0, 5).map((event, index) => (
            <li key={event.id}>
              <span className={`activity-dot activity-dot--${event.source}`}>{event.source === 'agent' ? 'AI' : index === 0 ? <Check size={12} /> : ''}</span>
              <div><strong>{event.message}</strong>{event.detail && <p>{event.detail}</p>}<small>{event.source === 'agent' ? 'Agent' : event.source === 'you' ? 'You' : 'PantryPilot'} · {relativeTime(event.createdAt)}</small></div>
            </li>
          ))}
        </ol>
      </section>

      <blockquote className="side-quote">
        <Sparkles size={16} />
        <p>“Dinner plans should change as quickly as real life does.”</p>
        <cite>PantryPilot principle no. 01</cite>
      </blockquote>
    </aside>
  );
}
