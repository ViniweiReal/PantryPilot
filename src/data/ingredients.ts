import type { IngredientDefinition, Substitution } from '../domain/types';

export const INGREDIENTS: IngredientDefinition[] = [
  { id: 'egg', name: 'Eggs', aliases: ['egg', 'eggs', 'ei', 'eier'], category: 'protein', vegan: false },
  { id: 'tomato', name: 'Tomatoes', aliases: ['tomato', 'tomatoes', 'tomate', 'tomaten'], category: 'produce', vegan: true },
  { id: 'rice', name: 'Rice', aliases: ['rice', 'reis'], category: 'grain', vegan: true },
  { id: 'basil', name: 'Basil', aliases: ['basil', 'basilikum'], category: 'produce', vegan: true },
  { id: 'chickpea', name: 'Chickpeas', aliases: ['chickpea', 'chickpeas', 'kichererbse', 'kichererbsen'], category: 'protein', vegan: true },
  { id: 'whole-milk', name: 'Whole milk', aliases: ['milk', 'whole milk', 'milch', 'vollmilch'], category: 'dairy', vegan: false },
  { id: 'oat-milk', name: 'Oat milk', aliases: ['oat milk', 'oat drink', 'hafermilch', 'haferdrink'], category: 'dairy', vegan: true },
  { id: 'red-onion', name: 'Red onion', aliases: ['red onion', 'onion', 'rote zwiebel', 'zwiebel'], category: 'produce', vegan: true },
  { id: 'vegetable-stock', name: 'Vegetable stock', aliases: ['vegetable stock', 'stock', 'gemüsebrühe', 'brühe'], category: 'pantry', vegan: true },
  { id: 'smoked-paprika', name: 'Smoked paprika', aliases: ['smoked paprika', 'paprika', 'paprikapulver'], category: 'pantry', vegan: true },
  { id: 'olive-oil', name: 'Olive oil', aliases: ['olive oil', 'oil', 'olivenöl', 'öl'], category: 'pantry', vegan: true },
  { id: 'scallion', name: 'Scallions', aliases: ['scallion', 'scallions', 'spring onion', 'frühlingszwiebel'], category: 'produce', vegan: true },
  { id: 'soy-sauce', name: 'Soy sauce', aliases: ['soy sauce', 'sojasauce'], category: 'pantry', vegan: true },
  { id: 'sesame', name: 'Sesame seeds', aliases: ['sesame', 'sesame seeds', 'sesam'], category: 'pantry', vegan: true },
  { id: 'chili-crisp', name: 'Chili crisp', aliases: ['chili crisp', 'chili oil', 'chiliöl'], category: 'pantry', vegan: true },
  { id: 'coconut-milk', name: 'Coconut milk', aliases: ['coconut milk', 'kokosmilch'], category: 'pantry', vegan: true },
  { id: 'lemon', name: 'Lemon', aliases: ['lemon', 'zitrone'], category: 'produce', vegan: true },
  { id: 'flatbread', name: 'Flatbread', aliases: ['flatbread', 'bread', 'fladenbrot', 'brot'], category: 'grain', vegan: true },
  { id: 'feta', name: 'Feta', aliases: ['feta', 'cheese', 'käse'], category: 'dairy', vegan: false },
  { id: 'garlic', name: 'Garlic', aliases: ['garlic', 'garlic clove', 'knoblauch', 'knoblauchzehe'], category: 'produce', vegan: true },
  { id: 'spinach', name: 'Spinach', aliases: ['spinach', 'baby spinach', 'spinat', 'babyspinat'], category: 'produce', vegan: true },
  { id: 'mushroom', name: 'Mushrooms', aliases: ['mushroom', 'mushrooms', 'champignon', 'champignons', 'pilz', 'pilze'], category: 'produce', vegan: true },
  { id: 'bell-pepper', name: 'Bell pepper', aliases: ['bell pepper', 'red pepper', 'paprika', 'rote paprika'], category: 'produce', vegan: true },
  { id: 'potato', name: 'Potatoes', aliases: ['potato', 'potatoes', 'kartoffel', 'kartoffeln'], category: 'produce', vegan: true },
  { id: 'tofu', name: 'Tofu', aliases: ['tofu', 'firm tofu', 'naturtofu'], category: 'protein', vegan: true },
];

export const SUBSTITUTIONS: Record<string, Substitution[]> = {
  'whole-milk': [
    { ingredientId: 'oat-milk', name: 'Oat milk', ratio: 1, note: 'Same creaminess, fully dairy-free.' },
    { ingredientId: 'coconut-milk', name: 'Coconut milk', ratio: 1, note: 'Richer and slightly sweeter.' },
  ],
  feta: [
    { ingredientId: 'chickpea', name: 'Crispy chickpeas', ratio: 1.5, note: 'Adds salty crunch without dairy.' },
  ],
  egg: [
    { ingredientId: 'chickpea', name: 'Seasoned chickpeas', ratio: 0.75, note: 'Plant-based protein with a firm bite.' },
  ],
};

export function findIngredient(query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return INGREDIENTS.find((ingredient) =>
    ingredient.id === normalized ||
    ingredient.name.toLocaleLowerCase() === normalized ||
    ingredient.aliases.includes(normalized),
  );
}
