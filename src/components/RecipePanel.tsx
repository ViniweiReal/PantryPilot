import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock3,
  Flame,
  Leaf,
  Minus,
  Plus,
  ShoppingBasket,
  Sparkles,
  Users,
} from 'lucide-react';
import { getRecipe } from '../data/recipes';
import { effectiveIngredients, formatAmount, ingredientAvailability, missingIngredients, recipeCoverage } from '../domain/meal-engine';
import { usePantryStore } from '../store/usePantryStore';
import { Decal } from './Brand';

type Tab = 'ingredients' | 'method';

export function RecipePanel() {
  const plan = usePantryStore((state) => state.plan);
  const pantry = usePantryStore((state) => state.pantry);
  const shoppingItems = usePantryStore((state) => state.shoppingItems);
  const adjustServings = usePantryStore((state) => state.adjustServings);
  const replaceIngredient = usePantryStore((state) => state.replaceIngredient);
  const proposeShoppingList = usePantryStore((state) => state.proposeShoppingList);
  const startCooking = usePantryStore((state) => state.startCooking);
  const [tab, setTab] = useState<Tab>('ingredients');

  const recipe = getRecipe(plan?.recipeId);

  const ingredients = useMemo(() => recipe && plan ? effectiveIngredients(recipe, plan) : [], [recipe, plan]);
  const missing = useMemo(() => recipe && plan ? missingIngredients(recipe, plan, pantry) : [], [recipe, plan, pantry]);
  const coverage = recipe && plan ? recipeCoverage(recipe, plan, pantry) : { matchedCount: 0, requiredCount: 0, percent: 100 };
  const listedMissingCount = missing.filter((ingredient) => shoppingItems.some((item) => item.ingredientId === ingredient.ingredientId)).length;
  const newMissingCount = missing.length - listedMissingCount;
  if (!recipe || !plan) {
    return (
      <main className="recipe-empty">
        <Sparkles size={28} />
        <h2>Your best dinner will appear here</h2>
        <p>Add what you have and let PantryPilot connect the dots.</p>
      </main>
    );
  }

  return (
    <main className="recipe-column" aria-labelledby="recipe-title">
      <article className="recipe-card" key={recipe.id}>
        <div className="recipe-visual">
          <img src={recipe.image} alt={recipe.imageAlt} />
          <div className="recipe-visual__veil" />
          <div className="recipe-visual__badges">
            <span className="image-badge image-badge--match"><Sparkles size={14} /> Best match</span>
            <span className="image-badge"><Clock3 size={14} /> {recipe.totalMinutes} min</span>
          </div>
          <span className="match-stamp" aria-label={`${coverage.percent}% of required ingredients in pantry`}>
            <strong>{coverage.percent}%</strong><small>required covered</small>
          </span>
          <Decal kind="sparkles" className="recipe-visual__decal" />
        </div>

        <div className="recipe-body">
          <div className="recipe-heading-row">
            <div>
              <span className="panel-kicker">Tonight’s pick</span>
              <h2 id="recipe-title">{recipe.title}</h2>
              <p className="recipe-subtitle">{recipe.subtitle}</p>
            </div>
            <div className="recipe-servings" aria-label="Recipe servings">
              <span><Users size={15} /> Serves</span>
              <div className="mini-stepper">
                <button type="button" aria-label="Decrease servings" onClick={() => adjustServings(plan.servings - 1)}><Minus size={14} /></button>
                <strong>{plan.servings}</strong>
                <button type="button" aria-label="Increase servings" onClick={() => adjustServings(plan.servings + 1)}><Plus size={14} /></button>
              </div>
            </div>
          </div>

          <p className="recipe-description">{recipe.description}</p>

          <div className="why-row">
            <span><Check size={14} /> Uses {coverage.matchedCount}/{coverage.requiredCount} required</span>
            {pantry.some((item) => item.ingredientId === 'tomato' && item.useSoon) && <span><Leaf size={14} /> Saves your tomatoes</span>}
            <span><Flame size={14} /> {recipe.tags[0]}</span>
          </div>

          <div className="recipe-tabs" role="tablist" aria-label="Recipe details">
            <button id="ingredients-tab" type="button" role="tab" aria-selected={tab === 'ingredients'} aria-controls="ingredients-panel" className={tab === 'ingredients' ? 'is-active' : ''} onClick={() => setTab('ingredients')}>
              Ingredients <span>{ingredients.length}</span>
            </button>
            <button id="method-tab" type="button" role="tab" aria-selected={tab === 'method'} aria-controls="method-panel" className={tab === 'method' ? 'is-active' : ''} onClick={() => setTab('method')}>
              Method <span>{recipe.steps.length}</span>
            </button>
          </div>

          {tab === 'ingredients' ? (
            <ul id="ingredients-panel" role="tabpanel" aria-labelledby="ingredients-tab" className="ingredient-list">
              {ingredients.map((ingredient) => {
                const availability = ingredientAvailability(ingredient, pantry);
                const covered = availability !== 'need';
                return (
                  <li key={ingredient.id} className={ingredient.isSubstitution ? 'ingredient-line ingredient-line--swap' : 'ingredient-line'}>
                    <span className={`ingredient-dot ingredient-dot--${covered ? 'have' : 'missing'}`}>{covered ? <Check size={13} /> : null}</span>
                    <span className="ingredient-line__amount">{formatAmount(ingredient.amount, ingredient.unit)}</span>
                    <span className="ingredient-line__name">
                      {ingredient.name}
                      {ingredient.isSubstitution && <small><Sparkles size={12} /> vegan swap · was {ingredient.originalName}</small>}
                    </span>
                    {ingredient.ingredientId === 'whole-milk' && (
                      <button className="swap-button" type="button" onClick={() => replaceIngredient('milk', 'oat milk')}>
                        Swap dairy <ArrowRight size={13} />
                      </button>
                    )}
                    {!ingredient.isSubstitution && <span className={`availability availability--${availability.replace(' ', '-')}`}>{availability}</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <ol id="method-panel" role="tabpanel" aria-labelledby="method-tab" className="method-preview">
              {recipe.steps.map((step, index) => (
                <li key={step.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.title}</strong><p>{step.instruction}</p></div><small>{step.minutes} min</small></li>
              ))}
            </ol>
          )}

          <div className="recipe-actions">
            <button className="button button--secondary" type="button" disabled={!missing.length || !newMissingCount} onClick={() => proposeShoppingList()}>
              <ShoppingBasket size={17} />
              {!missing.length ? 'Everything covered' : !newMissingCount ? `${listedMissingCount} on your list` : `Review ${newMissingCount} missing${listedMissingCount ? ` · ${listedMissingCount} on your list` : ''}`}
            </button>
            <button className="button button--primary" type="button" onClick={() => startCooking()}>
              Start cooking <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </article>

    </main>
  );
}
