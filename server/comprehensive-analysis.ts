import {
  analyzeText,
  UNIFIED_LLM_PROMPT,
  SEMANTIC_REASONING_PROMPT,
} from './src/services/sentiment/sentimentService';

// Environment variables should already be loaded by the system
console.log(
  '🔧 Environment check:',
  process.env.OPENAI_API_KEY ? '✅ OPENAI_API_KEY found' : '❌ OPENAI_API_KEY missing',
);

// Test cases with expected results
const testCases = [
  {
    name: 'Dunkey TLOU2 (Genuine Review)',
    creator: 'Dunkey',
    gameTitle: 'The Last of Us Part II',
    expectedScore: 6.5, // 4/5 = 6.5-7.0
    expectedSatirical: false, // Genuine analysis despite comedic style
    expectedBiases: ['bandwagon bias', 'expectation bias'],
    text: `All good things come in twos. Jaws 2, Garfield 2, Knack 2. So obviously, Last of Us 2 was destined to be a masterpiece until the plot got leaked. Then the internet decided that this game was no good. These spoilers basically show you that the game is not worth buying. This game is shaping up to be a complete dumpster fire, dude. Like, people are canceling their pre-orders left and right. I won't be buying Last of Us 2. You have betrayed the fanbase. I don't even want to fucking play it anymore. And this is why you have to actually play a video game before you start talking all that shit. What sucks about always putting out great stuff is that people come to expect the impossible from you. The original Last of Us was a very good game and one that has been very influential on this generation of story-driven games. However, compared to this game, it is like a dog's chew toy. So I give this game a 4 out of 5. Shut the fuck up, Leafy.`,
  },
  {
    name: 'IGN Dragon Age Veilguard',
    creator: 'IGN',
    gameTitle: 'Dragon Age: The Veilguard',
    expectedScore: 8.5, // Very positive review
    expectedSatirical: false,
    expectedBiases: ['identity bias', 'nostalgia bias', 'franchise loyalty'],
    text: `As I excitedly slashed, blasted, wooed, looted, and delved my way through the stunning and enthralling world of Dragon Age The Veilguard, I kept having one thought. Wait, Bioware made this? 2024 Bioware? As a non-binary person myself, Valeguard includes some of the most authentic representation of coming to terms with general gender stuff and having to navigate your family's reaction to it I've yet to see in a game. It doesn't feel like an after-school special or like I'm being pandered to. Dragon Age The Veilguard refreshes and reinvigorates a storied series that stumbled through its middle years and leaves no doubt in my mind that it deserves its place in the RPG pantheon.`,
  },
  {
    name: 'IGN Hogwarts Legacy',
    creator: 'IGN',
    gameTitle: 'Hogwarts Legacy',
    expectedScore: 8.0, // Very positive
    expectedSatirical: false,
    expectedBiases: ['nostalgia bias', 'franchise attachment'],
    text: `Like many, I've been waiting for a truly excellent Harry Potter game since I was in the third grade. There have been some decent attempts, but none that come close to truly fulfilling the fantasy of receiving your own Hogwarts admission letter. With Hogwarts Legacy, I'm happy to say that magic has finally been captured. In nearly every way, Hogwarts Legacy is the Harry Potter RPG I've always wanted to play.`,
  },
  {
    name: 'Dunkey Zelda OOT (Satirical)',
    creator: 'VideoGameDunkey',
    gameTitle: 'The Legend of Zelda: Ocarina of Time',
    expectedScore: 9.0, // Should recognize satirical praise of classic
    expectedSatirical: true, // Clearly satirical performance
    expectedBiases: ['sarcasm'],
    text: `Legend of Zelda, Ocarina of Time is the worst game I have ever played in my life. Every aspect of the game was developed by monkeys, and it shows. As a follow-up to the NES hit Zelda II Link's Adventure, Nintendo wanted to approach this game with a more minimalist mentality. So on a shoestring budget of $14, Tengu Miyazaki got drunk and made this game in a weekend. But accidentally, Nintendo shipped the game into stores, forcing Nintendo into bankruptcy.`,
  },
  {
    name: 'Dunkey Dragon Quest XI',
    creator: 'VideoGameDunkey',
    gameTitle: 'Dragon Quest XI',
    expectedScore: 6.0, // 3/5 = 6.0
    expectedSatirical: false, // Genuine review
    expectedBiases: ['genre bias', 'expectation bias'],
    text: `Everybody in the entire world hates RPGs. This is a universally accepted fact. So why would I ever subject myself to a game that nobody enjoys? Dragon Quest XI is toothless and charming. I wanted more beautiful music, more wacky characters and less filler combat. It's 25 hours worth of game stretched out to 40. I love it and I hate it, so I guess I'll just barely give this one a 3 out of 5.`,
  },
];

interface AnalysisResult {
  sentimentScore: number;
  satirical: boolean;
  biasCount: number;
  biasTypes: string[];
  approach: 'keyword' | 'semantic';
}

interface ComparisonRow {
  name: string;
  expected: {
    score: number;
    satirical: boolean;
    biases: string[];
  };
  keyword: AnalysisResult;
  semantic: AnalysisResult;
  winner: {
    scoreAccuracy: 'keyword' | 'semantic' | 'tie';
    satiricalAccuracy: 'keyword' | 'semantic' | 'tie';
    biasDetection: 'keyword' | 'semantic' | 'tie';
    overall: 'keyword' | 'semantic' | 'tie';
  };
}

async function runComprehensiveAnalysis() {
  console.log('🧪 COMPREHENSIVE ANALYSIS: Keyword vs Semantic Bias Detection');
  console.log('Testing on', testCases.length, 'real review transcripts\n');

  const results: ComparisonRow[] = [];

  for (const testCase of testCases) {
    console.log(`🔄 Analyzing: ${testCase.name}...`);

    try {
      // Run both analyses
      const keywordResult = await analyzeText(
        testCase.text,
        'gpt-4o',
        UNIFIED_LLM_PROMPT,
        testCase.gameTitle,
        testCase.creator,
      );
      const semanticResult = await analyzeText(
        testCase.text,
        'gpt-4o',
        SEMANTIC_REASONING_PROMPT,
        testCase.gameTitle,
        testCase.creator,
      );

      // Format results
      const keywordAnalysis: AnalysisResult = {
        sentimentScore: keywordResult.sentimentScore || 0,
        satirical: keywordResult.satirical || false,
        biasCount: keywordResult.biasIndicators?.length || 0,
        biasTypes: keywordResult.biasIndicators || [],
        approach: 'keyword',
      };

      const semanticAnalysis: AnalysisResult = {
        sentimentScore: semanticResult.sentimentScore || 0,
        satirical: semanticResult.satirical || false,
        biasCount: semanticResult.biasIndicators?.length || 0,
        biasTypes: semanticResult.biasIndicators || [],
        approach: 'semantic',
      };

      // Determine winners
      const scoreAccuracyKeyword = Math.abs(
        keywordAnalysis.sentimentScore - testCase.expectedScore,
      );
      const scoreAccuracySemantic = Math.abs(
        semanticAnalysis.sentimentScore - testCase.expectedScore,
      );

      const scoreWinner =
        scoreAccuracySemantic < scoreAccuracyKeyword
          ? 'semantic'
          : scoreAccuracyKeyword < scoreAccuracySemantic
            ? 'keyword'
            : 'tie';

      const satiricalWinner =
        (keywordAnalysis.satirical === testCase.expectedSatirical) ===
        (semanticAnalysis.satirical === testCase.expectedSatirical)
          ? 'tie'
          : keywordAnalysis.satirical === testCase.expectedSatirical
            ? 'keyword'
            : 'semantic';

      const biasWinner =
        semanticAnalysis.biasCount > keywordAnalysis.biasCount
          ? 'semantic'
          : keywordAnalysis.biasCount > semanticAnalysis.biasCount
            ? 'keyword'
            : 'tie';

      // Overall winner (score accuracy weighted highest)
      let overallPoints = { keyword: 0, semantic: 0 };
      if (scoreWinner === 'keyword') overallPoints.keyword += 3;
      else if (scoreWinner === 'semantic') overallPoints.semantic += 3;

      if (satiricalWinner === 'keyword') overallPoints.keyword += 2;
      else if (satiricalWinner === 'semantic') overallPoints.semantic += 2;

      if (biasWinner === 'keyword') overallPoints.keyword += 1;
      else if (biasWinner === 'semantic') overallPoints.semantic += 1;

      const overallWinner =
        overallPoints.semantic > overallPoints.keyword
          ? 'semantic'
          : overallPoints.keyword > overallPoints.semantic
            ? 'keyword'
            : 'tie';

      results.push({
        name: testCase.name,
        expected: {
          score: testCase.expectedScore,
          satirical: testCase.expectedSatirical,
          biases: testCase.expectedBiases,
        },
        keyword: keywordAnalysis,
        semantic: semanticAnalysis,
        winner: {
          scoreAccuracy: scoreWinner,
          satiricalAccuracy: satiricalWinner,
          biasDetection: biasWinner,
          overall: overallWinner,
        },
      });

      console.log(`   ✅ Completed ${testCase.name}`);
    } catch (error) {
      console.error(`❌ Failed to analyze ${testCase.name}:`, error);
    }
  }

  // Generate comprehensive report
  console.log('\n📊 COMPREHENSIVE RESULTS TABLE');
  console.log('═'.repeat(120));

  console.log(
    '│ Review                    │ Expected │ Keyword Result        │ Semantic Result       │ Winner        │',
  );
  console.log(
    '├───────────────────────────┼──────────┼───────────────────────┼───────────────────────┼───────────────┤',
  );

  for (const result of results) {
    const name = result.name.padEnd(25);
    const expected =
      `${result.expected.score}/Sat:${result.expected.satirical}/B:${result.expected.biases.length}`.padEnd(
        8,
      );
    const keyword =
      `${result.keyword.sentimentScore}/Sat:${result.keyword.satirical}/B:${result.keyword.biasCount}`.padEnd(
        21,
      );
    const semantic =
      `${result.semantic.sentimentScore}/Sat:${result.semantic.satirical}/B:${result.semantic.biasCount}`.padEnd(
        21,
      );
    const winner = result.winner.overall.padEnd(13);

    console.log(`│ ${name} │ ${expected} │ ${keyword} │ ${semantic} │ ${winner} │`);
  }

  console.log('═'.repeat(120));

  // Summary statistics
  const keywordWins = results.filter((r) => r.winner.overall === 'keyword').length;
  const semanticWins = results.filter((r) => r.winner.overall === 'semantic').length;
  const ties = results.filter((r) => r.winner.overall === 'tie').length;

  console.log('\n📈 SUMMARY STATISTICS:');
  console.log(
    `   Keyword Wins:  ${keywordWins}/${results.length} (${((keywordWins / results.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Semantic Wins: ${semanticWins}/${results.length} (${((semanticWins / results.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Ties:          ${ties}/${results.length} (${((ties / results.length) * 100).toFixed(1)}%)`,
  );

  // Detailed analysis
  console.log('\n🔍 DETAILED ANALYSIS:');

  for (const result of results) {
    console.log(`\n▶ ${result.name}:`);
    console.log(
      `   Expected: Score ${result.expected.score}, Satirical: ${result.expected.satirical}, Biases: [${result.expected.biases.join(', ')}]`,
    );
    console.log(
      `   Keyword:  Score ${result.keyword.sentimentScore} (Δ${Math.abs(result.keyword.sentimentScore - result.expected.score).toFixed(1)}), Satirical: ${result.keyword.satirical}, Biases: [${result.keyword.biasTypes.join(', ')}]`,
    );
    console.log(
      `   Semantic: Score ${result.semantic.sentimentScore} (Δ${Math.abs(result.semantic.sentimentScore - result.expected.score).toFixed(1)}), Satirical: ${result.semantic.satirical}, Biases: [${result.semantic.biasTypes.join(', ')}]`,
    );
    console.log(
      `   Winner: ${result.winner.overall} (Score: ${result.winner.scoreAccuracy}, Satirical: ${result.winner.satiricalAccuracy}, Bias: ${result.winner.biasDetection})`,
    );
  }

  // Recommendation
  console.log('\n🎯 RECOMMENDATION:');
  if (semanticWins > keywordWins) {
    console.log(`   ✅ MIGRATE TO SEMANTIC APPROACH`);
    console.log(
      `   - Semantic wins ${semanticWins}/${results.length} cases (${((semanticWins / results.length) * 100).toFixed(1)}%)`,
    );
    console.log(`   - Better overall accuracy and bias detection`);
    console.log(`   - Semantic reasoning catches patterns keyword matching misses`);
  } else if (keywordWins > semanticWins) {
    console.log(`   ✅ KEEP KEYWORD APPROACH (Enhanced)`);
    console.log(
      `   - Keyword wins ${keywordWins}/${results.length} cases (${((keywordWins / results.length) * 100).toFixed(1)}%)`,
    );
    console.log(`   - Current system with enhancements is performing well`);
  } else {
    console.log(`   ⚖️ CONSIDER HYBRID APPROACH`);
    console.log(`   - Results are very close (${keywordWins} vs ${semanticWins})`);
    console.log(`   - Combine both approaches for maximum coverage`);
  }

  // Generate results file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `analysis-results-${timestamp}.json`;

  const fs = require('fs');
  fs.writeFileSync(
    filename,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        summary: {
          keywordWins,
          semanticWins,
          ties,
          totalTests: results.length,
        },
        results,
      },
      null,
      2,
    ),
  );

  console.log(`\n💾 Results saved to: ${filename}`);
}

// Run the analysis
runComprehensiveAnalysis();
