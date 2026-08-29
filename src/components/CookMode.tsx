import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  ChevronLeft,
  Clock3,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
} from 'lucide-react';
import { getRecipe } from '../data/recipes';
import { effectiveIngredients, formatAmount } from '../domain/meal-engine';
import type { CookingTimer } from '../domain/types';
import { usePantryStore } from '../store/usePantryStore';
import { Brand, Decal } from './Brand';

function remainingMilliseconds(timer: CookingTimer, now: number) {
  if (timer.status === 'completed') return 0;
  if (timer.status === 'paused') return timer.remainingWhenPaused ?? 0;
  return Math.max(0, (timer.endsAt ?? now) - now);
}

function formatTimer(milliseconds: number) {
  const total = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function ActiveTimer({ timer, now }: { timer: CookingTimer; now: number }) {
  const pause = usePantryStore((state) => state.pauseTimer);
  const resume = usePantryStore((state) => state.resumeTimer);
  const remove = usePantryStore((state) => state.removeTimer);
  const remaining = remainingMilliseconds(timer, now);
  const progress = timer.durationSeconds ? Math.max(0, Math.min(100, (remaining / (timer.durationSeconds * 1000)) * 100)) : 0;
  return (
    <div className={`timer-card timer-card--${timer.status}`}>
      <div className="timer-card__ring" style={{ '--timer-progress': `${progress * 3.6}deg` } as React.CSSProperties}><Timer size={17} /></div>
      <div><strong>{timer.label}</strong><span>{timer.status === 'completed' ? 'Done!' : formatTimer(remaining)}</span></div>
      {timer.status === 'running' && <button type="button" onClick={() => pause(timer.id)} aria-label={`Pause ${timer.label}`}><Pause size={15} /></button>}
      {timer.status === 'paused' && <button type="button" onClick={() => resume(timer.id)} aria-label={`Resume ${timer.label}`}><Play size={15} /></button>}
      {timer.status === 'completed' && <button type="button" onClick={() => remove(timer.id)} aria-label={`Dismiss ${timer.label}`}><Check size={15} /></button>}
      <button type="button" onClick={() => remove(timer.id)} aria-label={`Delete ${timer.label}`}><Trash2 size={14} /></button>
    </div>
  );
}

export function CookMode() {
  const session = usePantryStore((state) => state.cookingSession);
  const timers = usePantryStore((state) => state.timers);
  const exitCooking = usePantryStore((state) => state.exitCooking);
  const goToCookingStep = usePantryStore((state) => state.goToCookingStep);
  const advanceCookingStep = usePantryStore((state) => state.advanceCookingStep);
  const startTimer = usePantryStore((state) => state.startTimer);
  const reconcileTimers = usePantryStore((state) => state.reconcileTimers);
  const resetDemo = usePantryStore((state) => state.resetDemo);
  const [now, setNow] = useState(Date.now());
  const recipe = getRecipe(session?.planSnapshot.recipeId);
  const ingredients = useMemo(() => recipe && session ? effectiveIngredients(recipe, session.planSnapshot) : [], [recipe, session]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setNow(Date.now());
      reconcileTimers();
    }, 1000);
    const reconcileVisible = () => !document.hidden && reconcileTimers();
    document.addEventListener('visibilitychange', reconcileVisible);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', reconcileVisible);
    };
  }, [reconcileTimers]);

  if (!session || !recipe) return null;
  const step = recipe.steps[session.currentStepIndex];
  const completed = session.status === 'completed';
  const activeTimers = Object.values(timers);
  const progress = completed ? 100 : (session.currentStepIndex / recipe.steps.length) * 100;

  if (completed) {
    return (
      <main className="dinner-ready">
        <Decal kind="sparkles" className="dinner-ready__sparkles" />
        <Decal kind="basil" className="dinner-ready__basil" />
        <div className="dinner-ready__card">
          <span className="ready-icon"><Trophy size={31} /></span>
          <span className="panel-kicker">Pantry → plate</span>
          <h1>Dinner is ready.</h1>
          <p>You made <strong>{recipe.title}</strong> from what was already at home.</p>
          <img src={recipe.image} alt={recipe.imageAlt} />
          <div className="ready-stats">
            <span><strong>{recipe.totalMinutes}</strong><small>minutes</small></span>
            <span><strong>{session.planSnapshot.servings}</strong><small>happy plates</small></span>
            <span><strong>{session.completedStepIds.length}</strong><small>steps done</small></span>
          </div>
          <div className="ready-actions">
            <button className="button button--ghost" type="button" onClick={exitCooking}><ArrowLeft size={16} /> Back to plan</button>
            <button className="button button--primary" type="button" onClick={resetDemo}><RotateCcw size={16} /> Reset demo</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cook-mode">
      <header className="cook-header">
        <Brand compact />
        <div className="cook-header__title"><span>Cooking now</span><strong>{recipe.title}</strong></div>
        <button className="button button--ghost button--small" type="button" onClick={exitCooking}><ChevronLeft size={16} /> Exit cook mode</button>
      </header>

      <div className="cook-progress" aria-label={`Step ${session.currentStepIndex + 1} of ${recipe.steps.length}`}><i style={{ width: `${progress}%` }} /></div>

      <div className="cook-layout">
        <nav className="step-rail" aria-label="Cooking steps">
          <span className="panel-kicker">Your route</span>
          <ol>
            {recipe.steps.map((recipeStep, index) => {
              const isDone = session.completedStepIds.includes(recipeStep.id);
              const isActive = index === session.currentStepIndex;
              return (
                <li key={recipeStep.id} className={`${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}>
                  <button type="button" onClick={() => goToCookingStep(index)}>
                    <span>{isDone ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</span>
                    <div><small>{recipeStep.eyebrow}</small><strong>{recipeStep.title}</strong></div>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="rail-tip"><ChefHat size={18} /><span><strong>Chef’s note</strong>Trust your senses. Pan sizes and stovetops vary.</span></div>
        </nav>

        <section className="active-step" aria-labelledby="active-step-title">
          <div className="step-number"><span>Step</span><strong>{String(session.currentStepIndex + 1).padStart(2, '0')}</strong><small>of {String(recipe.steps.length).padStart(2, '0')}</small></div>
          <span className="step-eyebrow"><Sparkles size={14} /> {step.eyebrow}</span>
          <h1 id="active-step-title">{step.title}</h1>
          <p>{step.instruction}</p>

          <div className="step-meta">
            <span><Clock3 size={18} /><strong>{step.minutes} min</strong><small>this step</small></span>
            <span><Flame size={18} /><strong>{session.currentStepIndex === 0 ? 'Medium' : 'Low–medium'}</strong><small>heat</small></span>
          </div>

          {step.timerSeconds && (
            <button className="step-timer-button" type="button" onClick={() => startTimer(step.timerLabel ?? step.title, step.timerSeconds!, step.id)}>
              <span><Timer size={20} /></span>
              <div><strong>Start {step.timerLabel}</strong><small>{Math.ceil(step.timerSeconds / 60)} minute guided timer</small></div>
              <Play size={17} />
            </button>
          )}

          <div className="step-navigation">
            <button className="button button--ghost" type="button" disabled={session.currentStepIndex === 0} onClick={() => goToCookingStep(session.currentStepIndex - 1)}><ArrowLeft size={17} /> Previous</button>
            <button className="button button--primary button--large" type="button" onClick={() => advanceCookingStep()}>
              {session.currentStepIndex === recipe.steps.length - 1 ? 'Dinner is ready' : 'Done — next step'} <ArrowRight size={18} />
            </button>
          </div>
        </section>

        <aside className="cook-side">
          <div className="cook-photo"><img src={recipe.image} alt="" /><span>{recipe.totalMinutes} min total</span></div>
          <section className="at-a-glance">
            <div className="panel-heading panel-heading--compact"><div><span className="panel-kicker">Keep close</span><h2>At a glance</h2></div></div>
            <ul>{ingredients.slice(0, 6).map((ingredient) => <li key={ingredient.id}><span>{ingredient.name}</span><strong>{formatAmount(ingredient.amount, ingredient.unit)}</strong></li>)}</ul>
          </section>
          {activeTimers.length > 0 && (
            <section className="timer-stack" aria-label="Active timers">
              <span className="panel-kicker">Timers</span>
              {activeTimers.map((timer) => <ActiveTimer key={timer.id} timer={timer} now={now} />)}
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
