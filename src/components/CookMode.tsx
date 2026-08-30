import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
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

function StepTimerGuide({
  timer,
  now,
  label,
  durationSeconds,
  stepId,
}: {
  timer?: CookingTimer;
  now: number;
  label: string;
  durationSeconds: number;
  stepId: string;
}) {
  const start = usePantryStore((state) => state.startTimer);
  const pause = usePantryStore((state) => state.pauseTimer);
  const resume = usePantryStore((state) => state.resumeTimer);
  const remove = usePantryStore((state) => state.removeTimer);
  const remaining = timer ? remainingMilliseconds(timer, now) : durationSeconds * 1000;
  const elapsedProgress = timer?.durationSeconds
    ? Math.max(0, Math.min(100, 100 - (remaining / (timer.durationSeconds * 1000)) * 100))
    : 0;

  const restart = () => {
    if (timer) remove(timer.id);
    start(label, durationSeconds, stepId);
  };

  if (!timer) {
    return (
      <section className="step-timer-guide step-timer-guide--ready" aria-label={`${label} timer is ready`}>
        <div className="step-timer-guide__icon"><Timer size={23} /></div>
        <div className="step-timer-guide__copy">
          <span>Ready when the pan is ready</span>
          <strong>{formatTimer(durationSeconds * 1000)} · {label}</strong>
          <p>Start it at the beginning of this step. PantryPilot will ring, but never skip ahead without you.</p>
        </div>
        <button className="button button--timer" type="button" onClick={() => start(label, durationSeconds, stepId)}>
          <Play size={16} /> Start timer
        </button>
      </section>
    );
  }

  return (
    <section className={`step-timer-guide step-timer-guide--${timer.status}`} aria-live="polite" aria-label={`${label} timer ${timer.status}`}>
      <div className="step-timer-guide__clock">
        <span>{timer.status === 'completed' ? <BellRing size={20} /> : <Timer size={20} />}</span>
        <strong>{timer.status === 'completed' ? 'Done' : formatTimer(remaining)}</strong>
        <small>{timer.status === 'paused' ? 'paused' : timer.status === 'completed' ? 'timer finished' : 'remaining'}</small>
      </div>
      <div className="step-timer-guide__body">
        <div><span>{timer.status === 'completed' ? 'Ready for the next step' : label}</span><strong>{timer.status === 'completed' ? 'Your timer rang.' : 'Stay on this step.'}</strong></div>
        <div className="step-timer-guide__progress" aria-hidden="true"><i style={{ width: `${timer.status === 'completed' ? 100 : elapsedProgress}%` }} /></div>
        <p>{timer.status === 'completed' ? 'Check the food, then confirm the step below.' : 'The next step waits for your confirmation, even when the timer ends.'}</p>
      </div>
      <div className="step-timer-guide__actions">
        {timer.status === 'running' && <button type="button" onClick={() => pause(timer.id)}><Pause size={15} /> Pause</button>}
        {timer.status === 'paused' && <button type="button" onClick={() => resume(timer.id)}><Play size={15} /> Resume</button>}
        <button type="button" onClick={restart}><RotateCcw size={15} /> Restart</button>
      </div>
    </section>
  );
}

export function CookMode() {
  const session = usePantryStore((state) => state.cookingSession);
  const timers = usePantryStore((state) => state.timers);
  const exitCooking = usePantryStore((state) => state.exitCooking);
  const goToCookingStep = usePantryStore((state) => state.goToCookingStep);
  const advanceCookingStep = usePantryStore((state) => state.advanceCookingStep);
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
  const stepTimer = [...activeTimers].reverse().find((timer) => timer.stepId === step.id);
  const backgroundTimers = activeTimers.filter((timer) => timer.id !== stepTimer?.id);
  const progress = completed ? 100 : (session.currentStepIndex / recipe.steps.length) * 100;
  const timerStageComplete = !step.timerSeconds || stepTimer?.status === 'completed';
  const nextButtonLabel = stepTimer?.status === 'running'
    ? 'Continue while timer runs'
    : stepTimer?.status === 'paused'
      ? 'Continue without timer'
      : stepTimer?.status === 'completed'
        ? 'Timer done — next step'
        : session.currentStepIndex === recipe.steps.length - 1
          ? 'Dinner is ready'
          : 'Done — next step';

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
              const linkedTimer = [...activeTimers].reverse().find((timer) => timer.stepId === recipeStep.id);
              return (
                <li key={recipeStep.id} className={`${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}>
                  <button type="button" onClick={() => goToCookingStep(index)}>
                    <span>{isDone ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <small>{recipeStep.eyebrow}</small>
                      <strong>{recipeStep.title}</strong>
                      {recipeStep.timerSeconds && <em>{linkedTimer ? (linkedTimer.status === 'completed' ? 'timer done' : `${formatTimer(remainingMilliseconds(linkedTimer, now))} ${linkedTimer.status}`) : `${Math.ceil(recipeStep.timerSeconds / 60)} min timer`}</em>}
                    </div>
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

          <div className="step-sequence" aria-label="How to complete this step">
            <span className="is-complete"><Check size={13} /> 1 · Read</span>
            <ArrowRight size={13} />
            <span className={step.timerSeconds ? (stepTimer ? 'is-complete' : 'is-current') : 'is-muted'}>{step.timerSeconds ? `${stepTimer ? '✓' : '2 ·'} Run timer` : '2 · No timer'}</span>
            <ArrowRight size={13} />
            <span className={timerStageComplete ? 'is-current' : ''}>3 · Confirm step</span>
          </div>

          <div className="step-meta">
            <span><Clock3 size={18} /><strong>{step.minutes} min</strong><small>this step</small></span>
            <span><Flame size={18} /><strong>{session.currentStepIndex === 0 ? 'Medium' : 'Low–medium'}</strong><small>heat</small></span>
          </div>

          {step.timerSeconds ? (
            <StepTimerGuide timer={stepTimer} now={now} label={step.timerLabel ?? step.title} durationSeconds={step.timerSeconds} stepId={step.id} />
          ) : (
            <div className="step-no-timer"><Check size={18} /><div><strong>No timer needed</strong><span>Work at your pace, then confirm this step when it looks right.</span></div></div>
          )}

          <div className="step-navigation">
            <button className="button button--ghost" type="button" disabled={session.currentStepIndex === 0} onClick={() => goToCookingStep(session.currentStepIndex - 1)}><ArrowLeft size={17} /> Previous</button>
            <button className="button button--primary button--large" type="button" onClick={() => advanceCookingStep()}>
              {nextButtonLabel} <ArrowRight size={18} />
            </button>
          </div>
        </section>

        <aside className="cook-side">
          <div className="cook-photo"><img src={recipe.image} alt="" /><span>{recipe.totalMinutes} min total</span></div>
          <section className="at-a-glance">
            <div className="panel-heading panel-heading--compact"><div><span className="panel-kicker">Keep close</span><h2>At a glance</h2></div></div>
            <ul>{ingredients.slice(0, 6).map((ingredient) => <li key={ingredient.id}><span>{ingredient.name}</span><strong>{formatAmount(ingredient.amount, ingredient.unit)}</strong></li>)}</ul>
          </section>
          {backgroundTimers.length > 0 && (
            <section className="timer-stack" aria-label="Other timers">
              <span className="panel-kicker">Other timers</span>
              {backgroundTimers.map((timer) => <ActiveTimer key={timer.id} timer={timer} now={now} />)}
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
