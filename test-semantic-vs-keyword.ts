import { compareKeywordVsSemanticAnalysis } from './server/src/services/sentiment/sentimentService';

// Sample text from Dunkey's TLOU2 review that contains clear bias patterns
const dunkeySnippet = `
Then the internet decided that this game was no good. People are canceling their pre-orders left and right. 
I wasn't going to buy Last of Us 2. These spoilers basically show you that the game is not worth buying.
This game is shaping up to be a complete dumpster fire.

But then I actually played the game for myself. And this is why you have to actually play a video game 
before you can review it. The Last of Us Part II is actually a pretty good game. 
I think it's flawed but I enjoyed my experience with it.
`;

async function testSemanticVsKeyword() {
  console.log('🧪 TESTING: Keyword vs Semantic Bias Detection\n');
  console.log('Text sample:', dunkeySnippet.slice(0, 200) + '...\n');

  try {
    const result = await compareKeywordVsSemanticAnalysis(dunkeySnippet);

    console.log('📊 RESULTS:');
    console.log('═'.repeat(50));
    console.log(result.comparison);
    console.log('═'.repeat(50));

    console.log('\n🔍 ANALYSIS:');
    console.log('Keyword method:', result.keywordBased.method);
    console.log('Semantic method:', result.semanticBased.method);

    // Expected: Semantic should catch "Bandwagon Bias" and "Pre-formed Opinion"
    // even without exact keyword matches
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSemanticVsKeyword();
