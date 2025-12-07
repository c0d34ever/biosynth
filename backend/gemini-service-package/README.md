# Gemini Service - Portable Package

A portable Gemini AI service extracted from CineFlow AI for story generation, scene suggestions, character analysis, and content creation.

## Features

- **Story Generation**: Generate complete story concepts from seed ideas
- **Scene Suggestions**: AI-powered next scene recommendations
- **Director Settings**: Automatic technical camera/lighting/sound suggestions
- **Scene Enhancement**: Transform simple ideas into detailed production prompts
- **Character Extraction**: Extract and analyze characters from stories
- **Location Extraction**: Identify all locations in a story
- **Story Analysis**: Comprehensive analysis of pacing, structure, plot holes, and dialogue
- **Episode Content**: Generate hashtags and captions for episodes
- **Comic Generation**: Convert scenes into comic book format

## Installation

```bash
npm install @google/genai dotenv
# or
yarn add @google/genai dotenv
```

## Setup

1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. Set your API key in environment variables:
```bash
export GEMINI_API_KEY=your_api_key_here
```

Or create a `.env` file:
```
GEMINI_API_KEY=your_api_key_here
```

## Basic Usage

```typescript
import { initializeGeminiService } from './src/config.js';
import { generateStoryConcept } from './src/geminiService.js';

// Initialize (optional - for user-specific API keys)
initializeGeminiService({
  defaultApiKey: process.env.GEMINI_API_KEY,
  debug: true
});

// Generate a story concept
const story = await generateStoryConcept("A superhero discovering their origins");
console.log(story);
```

## Advanced Usage with User-Specific API Keys

If you want to support user-specific API keys from your database:

```typescript
import { initializeGeminiService } from './src/config.js';
import { generateStoryConcept } from './src/geminiService.js';

// Initialize with database callback
initializeGeminiService({
  getUserApiKey: async (userId: number) => {
    // Fetch user's API key from your database
    const user = await db.query('SELECT gemini_api_key FROM users WHERE id = ?', [userId]);
    return user?.gemini_api_key || null;
  },
  defaultApiKey: process.env.GEMINI_API_KEY,
  debug: false
});

// Use with userId (will use user's key if available, fallback to default)
const story = await generateStoryConcept("A sci-fi thriller", userId);
```

## Available Functions

### Story Generation
- `generateStoryConcept(seed: string, userId?: number)` - Generate complete story from seed idea

### Scene Operations
- `suggestNextScene(context: StoryContext, recentScenes: Scene[], userId?: number)` - Suggest next scene
- `suggestDirectorSettings(rawIdea: string, context: StoryContext, prevSceneSummary: string | null, currentSettings: DirectorSettings, userId?: number)` - Get technical settings
- `enhanceScenePrompt(rawIdea: string, context: StoryContext, prevSceneSummary: string | null, settings: DirectorSettings, userId?: number)` - Enhance scene description

### Analysis
- `extractCharacters(context: StoryContext, scenes: Scene[], userId?: number)` - Extract all characters
- `extractLocations(context: StoryContext, scenes: Scene[], userId?: number)` - Extract all locations
- `analyzeCharacterRelationships(characters: Array<{ name: string }>, scenes: Scene[], context: StoryContext, userId?: number)` - Analyze relationships
- `analyzeStory(context: StoryContext, scenes: Scene[], userId?: number)` - Comprehensive story analysis

### Content Generation
- `suggestScenes(storyContext: StoryContext, scenes: Scene[], prompt: string, suggestionType: 'next' | 'improve' | 'transition', selectedSceneId?: string, userId?: number)` - Get scene suggestions
- `generateEpisodeContent(episodeTitle: string, episodeDescription: string, projectContext: StoryContext, userId?: number)` - Generate hashtags and captions
- `generateComicContent(projectContext: StoryContext, scenes: Scene[], userId?: number, coverImageId?: string)` - Generate comic book format

## Types

All types are exported from `src/types.ts`:
- `StoryContext`
- `Scene`
- `DirectorSettings`
- `TechnicalStyle`

## Configuration

The service can be configured via `initializeGeminiService()`:

```typescript
interface GeminiServiceConfig {
  getUserApiKey?: (userId: number) => Promise<string | null>;
  defaultApiKey?: string;
  debug?: boolean;
}
```

## Notes

- The comic HTML generation is simplified in this portable version (no database image fetching)
- For full image support in comics, implement your own HTML generator using your database
- All functions support optional `userId` parameter for user-specific API keys
- If `userId` is provided and `getUserApiKey` is configured, it will use the user's key
- Falls back to `defaultApiKey` or `GEMINI_API_KEY` environment variable

## License

MIT

