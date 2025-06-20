import {
  analyzeText,
  UNIFIED_LLM_PROMPT,
  SEMANTIC_REASONING_PROMPT,
} from './server/src/services/sentiment/sentimentService';

// Dunkey's TLOU2 review snippet (the key parts showing bias patterns)
const dunkeyTLOU2 = `
All good things come in twos. Jaws 2, Garfield 2, Knack 2. So obviously, Last of Us 2 was destined to be a masterpiece until the plot got leaked. Then the internet decided that this game was no good. These spoilers basically show you that the game is not worth buying. This game is shaping up to be a complete dumpster fire, dude. Like, people are canceling their pre-orders left and right. I won't be buying Last of Us 2. You have betrayed the fanbase. I don't even want to fucking play it anymore.

And this is why you have to actually play a video game before you start talking all that shit. Of course, these guys are small potatoes. Now me, I'm the dude off of Ratatouille. You can get past these guys, but the only way to get past me is to put Donkey Kong in the game.

What sucks about always putting out great stuff is that people come to expect the impossible from you. The original Last of Us was a very good game and one that has been very influential on this generation of story-driven games. However, compared to this game, it is like a dog's chew toy.

The truth is, I don't know why people are mad at this game because they don't know why they're mad. Fans are obviously very attached to Joel as a character and that's why killing him off is such a powerful way to ignite a revenge story. I don't know anything about this Abby person but you fucking kill Joel with golf of all sports? No way! I am coming to shoot this big dumb muscle bitch!

So I give this game a 4 out of 5. Shut the fuck up, Leafy.
`;

async function testDunkeySemanticVsKeyword() {
  console.log('🎮 TESTING: Dunkey TLOU2 - Semantic vs Keyword Detection\n');
  console.log('Expected: Dunkey gives 4/5 (≈6.5-7.0 score), mentions internet backlash\n');

  try {
    console.log('🔄 Running Keyword Analysis (Current System)...');
    const keywordResult = await analyzeText(
      dunkeyTLOU2,
      'gpt-4o',
      UNIFIED_LLM_PROMPT,
      'The Last of Us Part II',
      'Dunkey',
    );

    console.log('🔄 Running Semantic Analysis (New System)...');
    const semanticResult = await analyzeText(
      dunkeyTLOU2,
      'gpt-4o',
      SEMANTIC_REASONING_PROMPT,
      'The Last of Us Part II',
      'Dunkey',
    );

    console.log('📊 RESULTS COMPARISON:');
    console.log('═'.repeat(60));

    console.log(`🎯 SENTIMENT SCORES:`);
    console.log(`   Keyword:  ${keywordResult.sentimentScore} (Current)`);
    console.log(`   Semantic: ${semanticResult.sentimentScore} (New)`);
    console.log(`   Expected: ~6.5-7.0 (Dunkey's 4/5)`);

    console.log(`\n🧠 BIAS DETECTION:`);
    console.log(`   Keyword:  [${keywordResult.biasIndicators?.join(', ') || 'none'}]`);
    console.log(`   Semantic: [${semanticResult.biasIndicators?.join(', ') || 'none'}]`);

    console.log(`\n📝 SATIRICAL DETECTION:`);
    console.log(`   Keyword:  ${keywordResult.satirical}`);
    console.log(`   Semantic: ${semanticResult.satirical}`);

    console.log(`\n💭 SENTIMENT SUMMARIES:`);
    console.log(`   Keyword:  "${keywordResult.sentimentSummary}"`);
    console.log(`   Semantic: "${semanticResult.sentimentSummary}"`);

    console.log('\n═'.repeat(60));

    // Analysis
    const keywordCloser = Math.abs((keywordResult.sentimentScore || 0) - 6.75);
    const semanticCloser = Math.abs((semanticResult.sentimentScore || 0) - 6.75);

    console.log('🎯 ACCURACY ANALYSIS:');
    console.log(`   Keyword distance from expected (6.75): ${keywordCloser.toFixed(2)}`);
    console.log(`   Semantic distance from expected (6.75): ${semanticCloser.toFixed(2)}`);
    console.log(
      `   ${semanticCloser < keywordCloser ? '✅ Semantic is more accurate' : '❌ Keyword is more accurate'}`,
    );

    console.log('\n🧠 BIAS DETECTION ANALYSIS:');
    const keywordBiasCount = keywordResult.biasIndicators?.length || 0;
    const semanticBiasCount = semanticResult.biasIndicators?.length || 0;
    console.log(`   Keyword detected: ${keywordBiasCount} biases`);
    console.log(`   Semantic detected: ${semanticBiasCount} biases`);

    // Expected biases: bandwagon ("internet decided"), expectation bias, maybe reviewer fatigue
    const expectedBiases = ['bandwagon', 'expectation', 'internet', 'crowd'];
    const keywordFoundExpected = expectedBiases.some((bias) =>
      keywordResult.biasIndicators?.some((indicator) => indicator.toLowerCase().includes(bias)),
    );
    const semanticFoundExpected = expectedBiases.some((bias) =>
      semanticResult.biasIndicators?.some((indicator) => indicator.toLowerCase().includes(bias)),
    );

    console.log(
      `   Expected biases found - Keyword: ${keywordFoundExpected ? '✅' : '❌'}, Semantic: ${semanticFoundExpected ? '✅' : '❌'}`,
    );
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDunkeySemanticVsKeyword();
