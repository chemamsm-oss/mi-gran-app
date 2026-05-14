const getAffectedCharsCount = (original, typed) => {
  const matrix = Array(typed.length + 1).fill(null).map(() => Array(original.length + 1).fill(null));
  for (let i = 0; i <= original.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= typed.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= typed.length; j++) {
    for (let i = 1; i <= original.length; i++) {
      const indicator = original[i - 1] === typed[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[typed.length][original.length];
};

console.log("infranqueable vs infranqueble:", getAffectedCharsCount("infranqueable", "infranqueble"));
console.log("graduación vs graducación:", getAffectedCharsCount("graduación", "graducación"));
