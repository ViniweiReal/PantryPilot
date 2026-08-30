import type { CSSProperties } from 'react';

const atlasPositions: Record<string, string> = {
  egg: '0% 0%',
  tomato: '33.333% 0%',
  rice: '66.667% 0%',
  basil: '100% 0%',
  chickpea: '0% 50%',
  lemon: '33.333% 50%',
  garlic: '66.667% 50%',
  spinach: '100% 50%',
  mushroom: '0% 100%',
  'bell-pepper': '33.333% 100%',
  potato: '66.667% 100%',
  tofu: '100% 100%',
};

interface IngredientPhotoProps {
  ingredientId: string;
  size?: 'compact' | 'shelf';
}

export function IngredientPhoto({ ingredientId, size = 'compact' }: IngredientPhotoProps) {
  const position = atlasPositions[ingredientId];
  const style = position ? ({ '--ingredient-position': position } as CSSProperties) : undefined;

  return (
    <span
      className={`ingredient-photo ingredient-photo--${size}${position ? '' : ' ingredient-photo--fallback'}`}
      style={style}
      aria-hidden="true"
    >
      {!position && ingredientId.slice(0, 1).toLocaleUpperCase()}
    </span>
  );
}
