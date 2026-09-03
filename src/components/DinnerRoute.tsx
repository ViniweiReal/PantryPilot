import { ArrowRight, Check, ChefHat, ListChecks, ShoppingBasket, Sparkles } from 'lucide-react';
import { getRecipe } from '../data/recipes';
import { missingIngredients } from '../domain/meal-engine';
import { usePantryStore } from '../store/usePantryStore';

export function DinnerRoute() {
  const plan = usePantryStore((state) => state.plan);
  const pantry = usePantryStore((state) => state.pantry);
  const shoppingItems = usePantryStore((state) => state.shoppingItems);
  const proposeShoppingList = usePantryStore((state) => state.proposeShoppingList);
  const startCooking = usePantryStore((state) => state.startCooking);
  const recipe = getRecipe(plan?.recipeId);
  const missing = recipe && plan ? missingIngredients(recipe, plan, pantry) : [];
  const listed = missing.filter((ingredient) => shoppingItems.some((item) => item.ingredientId === ingredient.ingredientId)).length;
  const listIsComplete = missing.length === 0 || listed === missing.length;
  const shouldReview = missing.length > 0 && !listIsComplete;

  if (!recipe || !plan) return null;

  return (
    <section className="dinner-route" id="next-step" aria-labelledby="route-title">
      <div className="dinner-route__intro">
        <span className="panel-kicker"><Sparkles size={14} /> Your next move</span>
        <h2 id="route-title">Your dinner has a clear finish line.</h2>
        <p>PantryPilot has planned <strong>{recipe.title}</strong>. Review the gaps, then move into a calm, full-screen cooking flow.</p>
      </div>

      <ol className="dinner-route__steps" aria-label="Dinner journey">
        <li className="is-complete"><span><Check size={15} /></span><div><small>01 · Plan</small><strong>{recipe.title}</strong></div></li>
        <li className={listIsComplete ? 'is-complete' : 'is-current'}><span>{listIsComplete ? <Check size={15} /> : <ShoppingBasket size={15} />}</span><div><small>02 · Shop</small><strong>{missing.length === 0 ? 'Everything is covered' : `${listed} of ${missing.length} gaps reviewed`}</strong></div></li>
        <li><span><ChefHat size={15} /></span><div><small>03 · Cook</small><strong>Guided mode is ready</strong></div></li>
      </ol>

      <div className="dinner-route__action">
        <div><ListChecks size={18} /><span><strong>{shouldReview ? `${missing.length - listed} ingredients need your review` : 'You’re ready for the stove'}</strong><small>{shouldReview ? 'The agent suggests; you approve what joins the list.' : 'Cooking stays focused, step by step and at your pace.'}</small></span></div>
        {shouldReview ? (
          <button className="button button--primary" type="button" onClick={() => proposeShoppingList()}>
            Review ingredients <ArrowRight size={16} />
          </button>
        ) : (
          <button className="button button--primary" type="button" onClick={() => startCooking()}>
            Enter cook mode <ArrowRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}
