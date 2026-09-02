function updateBiasHeuristicsWithMaxScores(biasHeuristics, biasInteractions) {
  const updatedHeuristics = {};

  // Auto-symmetrize interactions
  for (const biasA in biasInteractions) {
    for (const biasB in biasInteractions[biasA]) {
      if (!biasInteractions[biasB]) biasInteractions[biasB] = {};
      if (biasInteractions[biasB][biasA] === undefined) {
        biasInteractions[biasB][biasA] = biasInteractions[biasA][biasB];
      }
    }
  }

  for (const bias in biasHeuristics) {
    const base = biasHeuristics[bias].scoreInfluence;
    let max = base;

    for (const other in biasInteractions[bias] || {}) {
      if (!biasHeuristics[other]) continue;
      const adjusted = base * biasInteractions[bias][other];
      if (adjusted > max) max = adjusted;
    }

    updatedHeuristics[bias] = {
      ...biasHeuristics[bias],
      baseScoreInfluence: base,
      maxScoreInfluence: max,
    };

    delete updatedHeuristics[bias].scoreInfluence;
  }

  return updatedHeuristics;
}
