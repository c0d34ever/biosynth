import { initializeGeminiService } from '../src/config.js';
import { 
  generateStoryConcept, 
  suggestNextScene,
  extractCharacters 
} from '../src/geminiService.js';
import type { StoryContext, Scene } from '../src/types.js';

// Initialize the service
initializeGeminiService({
  defaultApiKey: process.env.GEMINI_API_KEY,
  debug: true
});

async function example() {
  try {
    // 1. Generate a story concept
    console.log('Generating story concept...');
    const story = await generateStoryConcept("A time traveler stuck in ancient Rome");
    console.log('Story:', story);

    // 2. Suggest next scene
    const context: StoryContext = {
      id: 'story-1',
      lastUpdated: Date.now(),
      title: story.title || 'Untitled',
      genre: story.genre || 'Sci-Fi',
      plotSummary: story.plotSummary || '',
      characters: story.characters || '',
      initialContext: story.initialContext || ''
    };

    const scenes: Scene[] = [];
    console.log('\nSuggesting next scene...');
    const nextScene = await suggestNextScene(context, scenes);
    console.log('Next scene:', nextScene);

    // 3. Extract characters
    console.log('\nExtracting characters...');
    const characters = await extractCharacters(context, scenes);
    console.log('Characters:', characters);

  } catch (error) {
    console.error('Error:', error);
  }
}

example();

