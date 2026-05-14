
import { DiffChunk, ScoringResult, AIAuditError } from '../types';

/**
 * OFFICIAL CRITERIA - STROKE COUNTING
 */
export const countStrokes = (text: string): number => {
  let count = 0;
  for (const char of text) {
    // Uppercase, punctuation with shift, accents and dieresis count as 2
    if (/[A-ZÁÉÍÓÚÜ]/.test(char) || char === ';' || char === ':' || /[áéíóúü]/.test(char)) {
      count += 2;
    } else {
      count += 1;
    }
  }
  return count;
};

const normalize = (word: string) => {
  return word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\u00A0/g, ' ').trim();
};

const isInversion = (original: string, typed: string): boolean => {
  if (original.length !== typed.length || original.length < 2) return false;
  let diffs = [];
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== typed[i]) diffs.push(i);
  }
  return diffs.length === 2 && 
         original[diffs[0]] === typed[diffs[1]] && 
         original[diffs[1]] === typed[diffs[0]];
};

const getAffectedCharsCount = (original: string, typed: string): number => {
  // Use Levenshtein distance to accurately count the minimum number of single-character edits
  // (insertions, deletions, or substitutions) required to change one word into the other.
  const matrix = Array(typed.length + 1).fill(null).map(() => Array(original.length + 1).fill(null));

  for (let i = 0; i <= original.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= typed.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= typed.length; j++) {
    for (let i = 1; i <= original.length; i++) {
      const indicator = original[i - 1] === typed[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[typed.length][original.length];
};

/**
 * CALCULA PUNTUACIÓN PARA MODO LIBRE USANDO EL INFORME DE LA IA
 */
export const calculateFreeWritingScore = (typed: string, auditErrors: AIAuditError[], timeSeconds: number): ScoringResult => {
  const typedWords = typed.split(/\s+/).filter(w => w !== "");
  
  if (typedWords.length === 0) {
    return { grossStrokes: 0, netStrokes: 0, penalties: 0, errorCount: 0, errorRate: 0, isApt: false, reason: "Prueba en blanco.", timeSpent: timeSeconds, strokesPerMinute: 0, diffMarkup: [] };
  }

  const grossStrokes = countStrokes(typed);
  let totalPenalties = 0;
  const diffMarkup: DiffChunk[] = [];

  // Mapeamos errores por índice para precisión total
  const errorMap = new Map<number, AIAuditError>();
  auditErrors.forEach(err => {
    const errWordLower = err.word.toLowerCase();
    // Validar que el índice coincida con la palabra (ignorando puntuación)
    if (typedWords[err.index] && typedWords[err.index].toLowerCase().includes(errWordLower)) {
      errorMap.set(err.index, err);
    } else {
      // Buscar la palabra en un radio cercano
      let found = false;
      for (let offset = 1; offset <= 5; offset++) {
        if (typedWords[err.index - offset] && typedWords[err.index - offset].toLowerCase().includes(errWordLower)) {
          errorMap.set(err.index - offset, err);
          found = true;
          break;
        }
        if (typedWords[err.index + offset] && typedWords[err.index + offset].toLowerCase().includes(errWordLower)) {
          errorMap.set(err.index + offset, err);
          found = true;
          break;
        }
      }
      if (!found) {
        // Fallback to exact match anywhere if not found nearby
        const exactIdx = typedWords.findIndex(w => w.toLowerCase().includes(errWordLower));
        if (exactIdx !== -1 && !errorMap.has(exactIdx)) {
          errorMap.set(exactIdx, err);
        } else {
          errorMap.set(err.index, err); // just put it where it said, even if wrong
        }
      }
    }
  });

  typedWords.forEach((word, idx) => {
    const error = errorMap.get(idx);
    
    if (error) {
      // Aplicar penalizaciones oficiales Cortes Generales
      let penalty = 0;
      if (error.type === 'inversion') {
        penalty = 1;
      } else if (error.type === 'simple') {
        penalty = 5;
      } else {
        // Error múltiple o palabra completa: se restan todas sus pulsaciones
        penalty = countStrokes(error.correction || word);
      }
      totalPenalties += penalty;
      
      diffMarkup.push({
        type: 'spelling',
        original: error.correction,
        typed: word,
        reason: error.reason,
        penalty
      });
    } else {
      diffMarkup.push({
        type: 'match',
        original: word,
        typed: word,
        penalty: 0
      });
    }
  });

  const netStrokes = Math.max(0, grossStrokes - totalPenalties);
  const errorRate = grossStrokes > 0 ? (totalPenalties / grossStrokes) * 100 : 0;
  const isApt = netStrokes >= 2500 && errorRate <= 3;
  
  let reason = undefined;
  if (!isApt) {
    if (netStrokes < 2500 && errorRate > 3) {
      reason = "No alcanza el mínimo de 2.500 pulsaciones netas y supera el 3% de errores.";
    } else if (netStrokes < 2500) {
      reason = "No alcanza el mínimo requerido de 2.500 pulsaciones netas.";
    } else if (errorRate > 3) {
      reason = "Supera el máximo permitido del 3% de errores.";
    }
  }
  
  return {
    grossStrokes,
    netStrokes,
    penalties: totalPenalties,
    errorCount: auditErrors.length,
    errorRate,
    isApt,
    reason,
    timeSpent: timeSeconds,
    strokesPerMinute: (netStrokes / (timeSeconds / 60)),
    diffMarkup
  };
};

/**
 * ADVANCED SCORING ENGINE WITH ROBUST ALIGNMENT (For Reference Mode)
 */
export const calculateFinalScore = (original: string, typed: string, timeSeconds: number): ScoringResult => {
  const grossStrokes = countStrokes(typed);
  const origWords = original.split(/\s+/).filter(w => w !== "");
  const typedWords = typed.split(/\s+/).filter(w => w !== "");
  
  let totalPenalties = 0;
  let totalErrors = 0;
  const diffMarkup: DiffChunk[] = [];

  if (typedWords.length === 0) {
    return { grossStrokes: 0, netStrokes: 0, penalties: 0, errorCount: 0, errorRate: 0, isApt: false, reason: "Prueba en blanco.", timeSpent: timeSeconds, strokesPerMinute: 0, diffMarkup: [] };
  }

  let oIdx = 0;
  let tIdx = 0;
  const syncWindow = 12;

  while (tIdx < typedWords.length) {
    const tWord = typedWords[tIdx];
    const oWord = origWords[oIdx] || "";

    // 1. Coincidencia exacta o por normalización
    if (oWord && (tWord === oWord || normalize(tWord) === normalize(oWord))) {
      if (tWord !== oWord) {
        if (isInversion(oWord, tWord)) {
          totalPenalties += 1;
          totalErrors++;
          diffMarkup.push({ type: 'inversion', original: oWord, typed: tWord, penalty: 1 });
        } else {
          const affected = getAffectedCharsCount(oWord, tWord);
          let penalty = 0;
          if (affected === 1) {
            penalty = 5;
          } else {
            penalty = countStrokes(oWord);
          }
          totalPenalties += penalty;
          totalErrors++;
          diffMarkup.push({ type: 'substitution', original: oWord, typed: tWord, penalty });
        }
      } else {
        diffMarkup.push({ type: 'match', original: oWord, typed: tWord, penalty: 0 });
      }
      oIdx++;
      tIdx++;
      continue;
    }

    // 1b. Detectar palabras divididas (ej: "de la" -> "d ela")
    if (oIdx + 1 < origWords.length && tIdx + 1 < typedWords.length) {
      const nextT = typedWords[tIdx + 1];
      const nextO = origWords[oIdx + 1];
      
      // Caso: "de la" -> "d ela" (espacio movido)
      if (normalize(oWord + nextO) === normalize(tWord + nextT)) {
        // Es un error de espacio/inversión leve. Penalizamos como errata simple (5 pts)
        totalPenalties += 5;
        totalErrors++;
        diffMarkup.push({ type: 'substitution', original: oWord, typed: tWord, penalty: 5 });
        diffMarkup.push({ type: 'substitution', original: nextO, typed: nextT, penalty: 0 }); // Ya penalizado en el anterior
        oIdx += 2;
        tIdx += 2;
        continue;
      }
    }

    // 2. Buscar punto de sincronización en ventana
    let bestI = -1;
    let bestJ = -1;
    let minWeight = Infinity;

    // Aumentamos ventana y añadimos peso por distancia para evitar saltos falsos en palabras cortas
    for (let i = 0; i < syncWindow; i++) {
      for (let j = 0; j < syncWindow; j++) {
        if (i === 0 && j === 0) continue;
        if (oIdx + i < origWords.length && tIdx + j < typedWords.length) {
          const oW = origWords[oIdx + i];
          const tW = typedWords[tIdx + j];
          
          if (normalize(oW) === normalize(tW)) {
            // Peso: penalizamos saltos largos, especialmente si la palabra es corta (más probable que sea coincidencia falsa)
            const wordWeight = oW.length <= 3 ? 10 : 0;
            const weight = (i * 1.5) + (j * 1.5) + wordWeight;
            
            if (weight < minWeight) {
              minWeight = weight;
              bestI = i;
              bestJ = j;
            }
          }
        }
      }
      // Si encontramos una coincidencia muy buena (palabra larga y cerca), paramos búsqueda
      if (bestI !== -1 && minWeight < 5) break;
    }

    if (bestI !== -1) {
      // Sincronización encontrada. Procesamos el hueco.
      const numSubs = Math.min(bestI, bestJ);
      
      // Procesar sustituciones en el hueco
      for (let k = 0; k < numSubs; k++) {
        const subO = origWords[oIdx + k];
        const subT = typedWords[tIdx + k];
        
        if (subO === subT) {
          diffMarkup.push({ type: 'match', original: subO, typed: subT, penalty: 0 });
        } else if (isInversion(subO, subT)) {
          totalPenalties += 1;
          totalErrors++;
          diffMarkup.push({ type: 'inversion', original: subO, typed: subT, penalty: 1 });
        } else {
          const affected = getAffectedCharsCount(subO, subT);
          let penalty = 0;
          if (affected === 0) {
            diffMarkup.push({ type: 'match', original: subO, typed: subT, penalty: 0 });
          } else if (affected === 1) {
            penalty = 5;
            totalPenalties += penalty;
            totalErrors++;
            diffMarkup.push({ type: 'substitution', original: subO, typed: subT, penalty });
          } else {
            penalty = countStrokes(subO);
            totalPenalties += penalty;
            totalErrors++;
            diffMarkup.push({ type: 'substitution', original: subO, typed: subT, penalty });
          }
        }
      }

      // Procesar omisiones restantes
      if (bestI > bestJ) {
        for (let k = numSubs; k < bestI; k++) {
          const skipped = origWords[oIdx + k];
          const penalty = countStrokes(skipped);
          totalPenalties += penalty;
          totalErrors++;
          diffMarkup.push({ type: 'omission', original: skipped, typed: '[OMITIDA]', penalty });
        }
      } 
      // Procesar inclusiones restantes
      else if (bestJ > bestI) {
        for (let k = numSubs; k < bestJ; k++) {
          const extra = typedWords[tIdx + k];
          const penalty = countStrokes(extra);
          totalPenalties += penalty;
          totalErrors++;
          diffMarkup.push({ type: 'inclusion', original: '[EXTRA]', typed: extra, penalty });
        }
      }

      oIdx += bestI;
      tIdx += bestJ;
    } else {
      // No hay sincronización: asumimos que la palabra actual es una sustitución (errata)
      if (oWord) {
        if (oWord === tWord) {
          diffMarkup.push({ type: 'match', original: oWord, typed: tWord, penalty: 0 });
        } else if (isInversion(oWord, tWord)) {
          totalPenalties += 1;
          totalErrors++;
          diffMarkup.push({ type: 'inversion', original: oWord, typed: tWord, penalty: 1 });
        } else {
          const affected = getAffectedCharsCount(oWord, tWord);
          let penalty = 0;
          if (affected === 0) {
            diffMarkup.push({ type: 'match', original: oWord, typed: tWord, penalty: 0 });
          } else if (affected === 1) {
            penalty = 5;
            totalPenalties += penalty;
            totalErrors++;
            diffMarkup.push({ type: 'substitution', original: oWord, typed: tWord, penalty });
          } else {
            penalty = countStrokes(oWord);
            totalPenalties += penalty;
            totalErrors++;
            diffMarkup.push({ type: 'substitution', original: oWord, typed: tWord, penalty });
          }
        }
        oIdx++;
        tIdx++;
      } else {
        // Texto extra al final
        const penalty = countStrokes(tWord);
        totalPenalties += penalty;
        totalErrors++;
        diffMarkup.push({ type: 'inclusion', original: '[EXTRA]', typed: tWord, penalty });
        tIdx++;
      }
    }
  }

  const netStrokes = Math.max(0, grossStrokes - totalPenalties);
  const actualErrorRate = grossStrokes > 0 ? (totalPenalties / grossStrokes) * 100 : 0;
  const isApt = netStrokes >= 2500 && actualErrorRate <= 3;

  let reason = undefined;
  if (!isApt) {
    if (netStrokes < 2500 && actualErrorRate > 3) {
      reason = "No alcanza el mínimo de 2.500 pulsaciones netas y supera el 3% de errores.";
    } else if (netStrokes < 2500) {
      reason = "No alcanza el mínimo requerido de 2.500 pulsaciones netas.";
    } else if (actualErrorRate > 3) {
      reason = "Supera el máximo permitido del 3% de errores.";
    }
  }
  
  return {
    grossStrokes,
    netStrokes,
    penalties: totalPenalties,
    errorCount: totalErrors,
    errorRate: actualErrorRate,
    isApt,
    reason,
    timeSpent: timeSeconds,
    strokesPerMinute: (netStrokes / (timeSeconds / 60)),
    diffMarkup
  };
};
