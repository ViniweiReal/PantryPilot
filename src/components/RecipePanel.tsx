import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Clock3,
  Flame,
  Leaf,
  Minus,
  Plus,
  ShoppingBasket,
  Sparkles,
  Users,
} from 'lucide-react';
import { FEATURED_RECIPE_IDS, getRecipe } from '../data/recipes';
import { effectiveIngredients, formatAmount, missingIngredients, pantryContains } from '../domain/meal-engine';
import { usePantryStore } from '../store/usePantryStore';
import { Decal } from './Brand';

type Tab = 'ingredients' | 'method';

export function RecipePanel() {
  const plan = usePantryStore((state) => state.plan);
  const pantry = usePantryStore((state) => state.pantry);
  const preferences = usePantryStore((state) => state.preferences);
  const selectRecipe = usePantryStore((state) => state.selectRecipe);
  const adjustServings = usePantryStore((state) => state.adjustServings);
  const replaceIngredient = usePantryStore((state) => state.replaceIngredient);
  const proposeShoppingList = usePantryStore((state) => state.proposeShoppingList);
  const startCooking = usePantryStore((state) => state.startCooking);
  const [tab, setTab] = useState<Tab>('ingredients');
  const recipe = getRecipe(plan?.recipeId);

  const ingredients = useMemo(() => recipe && plan ? effectiveIngredients(recipe, plan) : [], [recipe, plan]);
  const missing = useMemo(() => recipe && plan ? missingIngredients(recipe, plan, pantry) : [], [recipe, plan, pantry]);
  const matchedCount = ingredients.filter((ingredient) => pantryContains(pantry, ingredient.ingredientId)).length;
  const alternatives = FEATURED_RECIPE_IDS.filter((id) => id !== recipe?.id).map(getRecipe).filter(Boolean);

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
      <article className="recipe-card">
        <div className="recipe-visual">
          <img src={recipe.image} alt={recipe.imageAlt} />
          <div className="recipe-visual__veil" />
          <div className="recipe-visual__badges">
            <span className="image-badge image-badge--match"><Sparkles size={14} /> Best match</span>
            <span className="image-badge"><Clock3 size={14} /> {recipe.totalMinutes} min</span>
          </div>
          <span className="match-stamp" aria-label={`${matchedCount} pantry matches`}>
            <strong>{Math.min(98, 78 + matchedCount * 5)}%</strong><small>pantry match</small>
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
            <span><Check size={14} /> Uses {matchedCount} pantry items</span>
            {pantry.some((item) => item.ingredientId === 'tomato' && item.useSoon) && <span><Leaf size={14} /> Saves your tomatoes</span>}
            <span><Flame size={14} /> {recipe.tags[0]}</span>
          </div>

          <div className="recipe-tabs" role="tablist" aria-label="Recipe details">
            <button type="button" role="tab" aria-selected={tab === 'ingredients'} className={tab === 'ingredients' ? 'is-active' : ''} onClick={() => setTab('ingredients')}>
              Ingredients <span>{ingredients.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={tab === 'method'} className={tab === 'method' ? 'is-active' : ''} onClick={() => setTab('method')}>
              Method <span>{recipe.steps.length}</span>
            </button>
          </div>

          {tab === 'ingredients' ? (
            <ul className="ingredient-list">
              {ingredients.map((ingredient) => {
                const inPantry = pantryContains(pantry, ingredient.ingredientId);
                return (
                  <li key={ingredient.id} className={ingredient.isSubstitution ? 'ingredient-line ingredient-line--swap' : 'ingredient-line'}>
                    <span className={`ingredient-dot ingredient-dot--${inPantry ? 'have' : 'missing'}`}>{inPantry ? <Check size={13} /> : null}</span>
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
                    {!ingredient.isSubstitution && <span className={`availability availability--${inPantry ? 'have' : 'need'}`}>{inPantry ? 'in pantry' : ingredient.optional ? 'optional' : 'need'}</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <ol className="method-preview">
              {recipe.steps.map((step, index) => (
                <li key={step.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.title}</strong><p>{step.instruction}</p></div><small>{step.minutes} min</small></li>
              ))}
            </ol>
          )}

          <div className="recipe-actions">
            <button className="button button--secondary" type="button" onClick={() => proposeShoppingList()}>
              <ShoppingBasket size={17} /> Review {missing.length} missing
            </button>
            <button className="button button--primary" type="button" onClick={() => startCooking()}>
              Start cooking <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </article>

      <section className="alternatives" aria-labelledby="alternatives-title">
        <div className="section-heading-inline">
          <div><span className="panel-kicker">More good ideas</span><h3 id="alternatives-title">Also from your pantry</h3></div>
          <div className="carousel-controls" aria-hidden="true"><button type="button"><ChevronLeft size={16} /></button><button type="button"><ChevronRight size={16} /></button></div>
        </div>
        <div className="alternative-grid">
          {alternatives.slice(0, 2).map((alternative) => alternative && (
            <button className="alternative-card" type="button" key={alternative.id} onClick={() => selectRecipe(alternative.id)}>
              <img src={alternative.image} alt="" />
              <span className="alternative-card__shade" />
              <span className="alternative-card__content">
                <small><Clock3 size={13} /> {alternative.totalMinutes} min · {alternative.difficulty}</small>
                <strong>{alternative.title}</strong>
                <span>{alternative.subtitle}</span>
              </span>
              <span className="alternative-card__go"><ArrowRight size={16} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="nutrition-note">
        <CircleGauge size={20} />
        <div><strong>Balanced by design</strong><span>Protein, whole grains and vegetables in one pan. PantryPilot is meal inspiration, not medical advice.</span></div>
        <ChefHat size={22} aria-hidden="true" />
      </section>
    </main>
  );
}
