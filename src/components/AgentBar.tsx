import { useState, type FormEvent } from 'react';
import { ArrowUp, Bot, Check, LoaderCircle, Sparkles } from 'lucide-react';
import { usePantryStore } from '../store/usePantryStore';
import { Decal } from './Brand';

const QUICK_PROMPTS = [
  'Plan dinner in 25 minutes',
  'Make it dairy-free',
  'Cook for 4 people',
];

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function AgentBar() {
  const [prompt, setPrompt] = useState('');
  const isAgentRunning = usePantryStore((state) => state.isAgentRunning);
  const plan = usePantryStore((state) => state.plan);
  const setAgentRunning = usePantryStore((state) => state.setAgentRunning);

  const executePrompt = async (rawPrompt: string) => {
    const normalized = rawPrompt.trim().toLocaleLowerCase();
    if (!normalized || isAgentRunning) return;
    setAgentRunning(true);

    try {
      const store = usePantryStore.getState();
      const servingMatch = normalized.match(/(?:for|für|to)\s+(\d)|(?:cook for|servings?)\s*(\d)/);
      const servings = Number(servingMatch?.[1] ?? servingMatch?.[2]);
      const asksForPlan = /plan|dinner|abendessen|cook|meal|make me/.test(normalized);
      const asksForSwap = /dairy.?free|vegan|oat|hafer|replace|swap|ersetze/.test(normalized);
      const asksForList = /shopping|missing|einkauf|add anything|anything missing/.test(normalized);
      const asksToCook = /start cook|start cooking|kochmodus|cook now|then start/.test(normalized);

      if (asksForPlan) {
        store.planDinner({
          servings: Number.isFinite(servings) ? servings : undefined,
          diet: normalized.includes('vegetarian')
            ? 'vegetarian'
            : normalized.includes('vegan') && !normalized.includes('dairy-free')
              ? 'vegan'
              : undefined,
          maxMinutes: normalized.includes('15') ? 15 : normalized.includes('25') ? 25 : undefined,
          source: 'agent',
        });
        await sleep(650);
      } else if (Number.isFinite(servings)) {
        store.adjustServings(servings, 'agent');
        await sleep(450);
      }

      if (asksForSwap) {
        const result = usePantryStore.getState().replaceIngredient('milk', 'oat milk', 'agent');
        if (!result.ok && plan) usePantryStore.getState().replaceIngredient('feta', 'chickpeas', 'agent');
        await sleep(650);
      }

      if (asksForList || asksToCook) {
        const review = usePantryStore.getState().proposeShoppingList('agent', asksToCook);
        if (review.count > 0) return;
      }

      if (asksToCook) usePantryStore.getState().startCooking('agent');
    } finally {
      setAgentRunning(false);
      setPrompt('');
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void executePrompt(prompt);
  };

  return (
    <section className="agent-hero" aria-labelledby="agent-heading">
      <Decal kind="arrow" className="agent-hero__arrow" />
      <div className="agent-hero__copy">
        <span className="eyebrow"><Sparkles size={14} aria-hidden="true" /> Your kitchen, on autopilot</span>
        <h1 id="agent-heading">What should we make tonight?</h1>
        <p>Tell PantryPilot what you have. Your agent can plan, adapt and guide dinner — every action stays visible.</p>
      </div>

      <div className="agent-console">
        <div className="agent-console__status">
          <span className="agent-avatar"><Bot size={17} aria-hidden="true" /></span>
          <span><strong>Pantry agent</strong><small>{isAgentRunning ? 'Working through your request…' : 'Ready to help'}</small></span>
          <span className="agent-console__secure"><Check size={13} /> You stay in control</span>
        </div>
        <form className="prompt-box" onSubmit={handleSubmit}>
          <textarea
            aria-label="Ask PantryPilot"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="e.g. Plan a vegetarian dinner for two, swap dairy, add anything missing, then start cooking."
            rows={2}
            disabled={isAgentRunning}
          />
          <button className="prompt-box__send" type="submit" aria-label="Send request" disabled={!prompt.trim() || isAgentRunning}>
            {isAgentRunning ? <LoaderCircle className="spin" size={19} /> : <ArrowUp size={20} />}
          </button>
        </form>
        <div className="quick-prompts" aria-label="Suggested prompts">
          <span>Try</span>
          {QUICK_PROMPTS.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => void executePrompt(suggestion)} disabled={isAgentRunning}>
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
