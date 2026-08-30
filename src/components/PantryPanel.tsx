import { useMemo, useState, type FormEvent } from 'react';
import { Clock3, Minus, Plus, Search, Sparkles, X } from 'lucide-react';
import { INGREDIENTS } from '../data/ingredients';
import { usePantryStore } from '../store/usePantryStore';
import { IngredientPhoto } from './IngredientPhoto';

const SHELF_INGREDIENT_IDS = ['basil', 'chickpea', 'lemon', 'garlic', 'spinach', 'mushroom', 'bell-pepper', 'potato', 'tofu'];

export function PantryPanel() {
  const pantry = usePantryStore((state) => state.pantry);
  const preferences = usePantryStore((state) => state.preferences);
  const addPantryItem = usePantryStore((state) => state.addPantryItem);
  const removePantryItem = usePantryStore((state) => state.removePantryItem);
  const toggleUseSoon = usePantryStore((state) => state.toggleUseSoon);
  const setPreferences = usePantryStore((state) => state.setPreferences);
  const planDinner = usePantryStore((state) => state.planDinner);
  const [ingredient, setIngredient] = useState('');
  const [inlineError, setInlineError] = useState('');

  const suggestions = useMemo(() => SHELF_INGREDIENT_IDS
    .map((id) => INGREDIENTS.find((candidate) => candidate.id === id))
    .filter((candidate) => candidate && !pantry.some((item) => item.ingredientId === candidate.id))
    .slice(0, 6), [pantry]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = addPantryItem(ingredient);
    if (result.ok) {
      setIngredient('');
      setInlineError('');
    } else {
      setInlineError(result.message);
    }
  };

  return (
    <aside className="side-card pantry-card" aria-labelledby="pantry-title">
      <div className="panel-heading">
        <div><span className="panel-kicker">01 · Start here</span><h2 id="pantry-title">Your pantry</h2></div>
        <span className="count-badge">{pantry.length}</span>
      </div>
      <p className="panel-intro">What’s on hand right now?</p>

      <form className="pantry-add" onSubmit={submit}>
        <Search size={17} aria-hidden="true" />
        <input aria-label="Add an ingredient" list="ingredient-options" value={ingredient} onChange={(event) => setIngredient(event.target.value)} placeholder="Add an ingredient" />
        <button type="submit" aria-label="Add ingredient" disabled={!ingredient.trim()}><Plus size={17} /></button>
      </form>
      <datalist id="ingredient-options">
        {INGREDIENTS.map((option) => <option key={option.id} value={option.name} />)}
      </datalist>
      {inlineError && <p className="inline-error" role="alert">{inlineError}</p>}

      <ul className="pantry-list">
        {pantry.map((item) => (
          <li key={item.id} className={item.useSoon ? 'pantry-item pantry-item--soon' : 'pantry-item'}>
            <IngredientPhoto ingredientId={item.ingredientId} />
            <span className="pantry-item__name">{item.name}{item.amount && <small>{item.amount} {item.unit}</small>}</span>
            <button
              className="soon-toggle"
              type="button"
              onClick={() => toggleUseSoon(item.id)}
              aria-label={`${item.useSoon ? 'Remove use soon from' : 'Mark use soon'} ${item.name}`}
              title={item.useSoon ? 'Use soon' : 'Mark use soon'}
            >
              <Clock3 size={15} />{item.useSoon && <span>use soon</span>}
            </button>
            <button className="icon-button icon-button--quiet" type="button" onClick={() => removePantryItem(item.id)} aria-label={`Remove ${item.name}`}><X size={15} /></button>
          </li>
        ))}
      </ul>

      {suggestions.length > 0 && (
        <div className="ingredient-shelf">
          <div className="ingredient-shelf__heading"><span>Quick add</span><small>Tap an ingredient</small></div>
          <div className="ingredient-shelf__grid">
            {suggestions.map((suggestion) => suggestion && (
              <button key={suggestion.id} type="button" onClick={() => addPantryItem(suggestion.name)}>
                <IngredientPhoto ingredientId={suggestion.id} size="shelf" />
                <span>{suggestion.name}</span>
                <Plus size={12} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="divider" />
      <fieldset className="preference-group">
        <legend>For tonight</legend>
        <label className="preference-label">People</label>
        <div className="stepper">
          <button type="button" onClick={() => setPreferences({ servings: preferences.servings - 1 })} aria-label="Decrease people"><Minus size={16} /></button>
          <strong>{preferences.servings}</strong>
          <button type="button" onClick={() => setPreferences({ servings: preferences.servings + 1 })} aria-label="Increase people"><Plus size={16} /></button>
        </div>

        <label className="preference-label" htmlFor="diet-select">Diet</label>
        <select id="diet-select" value={preferences.diet} onChange={(event) => setPreferences({ diet: event.target.value as typeof preferences.diet })}>
          <option value="vegetarian">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="anything">Anything</option>
        </select>

        <label className="preference-label">Maximum time</label>
        <div className="segment-control">
          {[15, 25, 40].map((minutes) => (
            <button key={minutes} className={preferences.maxMinutes === minutes ? 'is-active' : ''} type="button" onClick={() => setPreferences({ maxMinutes: minutes })}>{minutes}m</button>
          ))}
        </div>
      </fieldset>

      <button className="button button--primary button--full" type="button" onClick={() => planDinner()}>
        <Sparkles size={17} /> Find my dinner
      </button>
    </aside>
  );
}
