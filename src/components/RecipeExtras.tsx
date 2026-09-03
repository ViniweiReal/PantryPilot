import { useMemo, useState } from 'react';
import { ArrowRight, ChefHat, ChevronLeft, ChevronRight, CircleGauge, Clock3, Shuffle } from 'lucide-react';
import { getRecipe } from '../data/recipes';
import { rankRecipes } from '../domain/meal-engine';
import { usePantryStore } from '../store/usePantryStore';

export function RecipeExtras() {
  const plan = usePantryStore((state) => state.plan);
  const pantry = usePantryStore((state) => state.pantry);
  const preferences = usePantryStore((state) => state.preferences);
  const selectRecipe = usePantryStore((state) => state.selectRecipe);
  const [ideaOffset, setIdeaOffset] = useState(0);
  const recipe = getRecipe(plan?.recipeId);
  const alternativeMatches = useMemo(() => rankRecipes(pantry, {
    ...preferences,
    diet: 'anything',
    maxMinutes: 60,
  }).filter((match) => match.recipe.id !== recipe?.id), [pantry, preferences, recipe?.id]);
  const safeIdeaOffset = alternativeMatches.length ? ideaOffset % alternativeMatches.length : 0;
  const visibleIdeas = Array.from({ length: Math.min(2, alternativeMatches.length) }, (_, index) =>
    alternativeMatches[(safeIdeaOffset + index) % alternativeMatches.length],
  );
  const rotateIdeas = (direction: 1 | -1) => setIdeaOffset((offset) => {
    if (!alternativeMatches.length) return 0;
    return (offset + direction * 2 + alternativeMatches.length) % alternativeMatches.length;
  });

  if (!recipe || !plan) return null;

  return (
    <div className="recipe-extras">
      <section className="alternatives" aria-labelledby="alternatives-title">
        <div className="section-heading-inline">
          <div>
            <span className="panel-kicker">Ranked live · not a fixed list</span>
            <h3 id="alternatives-title">Also from your pantry</h3>
            <span className="ideas-status"><Shuffle size={12} /> {alternativeMatches.length} more recipes ranked from what you have</span>
          </div>
          <div className="carousel-controls">
            <button type="button" aria-label="Previous recipe ideas" onClick={() => rotateIdeas(-1)}><ChevronLeft size={16} /></button>
            <button type="button" aria-label="Shuffle recipe ideas" onClick={() => rotateIdeas(1)}><Shuffle size={15} /></button>
            <button type="button" aria-label="Next recipe ideas" onClick={() => rotateIdeas(1)}><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="alternative-grid">
          {visibleIdeas.map((alternative) => (
            <button className="alternative-card" type="button" key={alternative.recipe.id} onClick={() => { selectRecipe(alternative.recipe.id); setIdeaOffset(0); }}>
              <img src={alternative.recipe.image} alt="" />
              <span className="alternative-card__shade" />
              <span className="alternative-card__fit">{alternative.matchedCount} pantry match{alternative.matchedCount === 1 ? '' : 'es'}</span>
              <span className="alternative-card__content">
                <small><Clock3 size={13} /> {alternative.recipe.totalMinutes} min · {alternative.recipe.diets[0]}</small>
                <strong>{alternative.recipe.title}</strong>
                <span>{alternative.recipe.subtitle}</span>
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
    </div>
  );
}
