import { GoogleGenAI, Type } from "@google/genai";
import { StoryContext, DirectorSettings, TechnicalStyle, Scene } from './types.js';
import dotenv from 'dotenv';
import { getServiceConfig } from './config.js';

// Load .env file from process.env (can be set via environment or .env file)
dotenv.config();

/**
 * Get user's Gemini API key from configured callback or return null
 */
async function getUserGeminiApiKey(userId?: number): Promise<string | null> {
  if (!userId) return null;

  const config = getServiceConfig();
  if (config.getUserApiKey) {
    try {
      return await config.getUserApiKey(userId);
  } catch (error) {
      if (config.debug) {
    console.error('Error fetching user Gemini API key:', error);
      }
    }
  }

  return null;
}

// Client cache to avoid recreating clients unnecessarily
const clientCache = new Map<string, GoogleGenAI>();

/**
 * Standard client initialization using user's API key or fallback to environment.
 * Exported for use in other modules.
 * Clients are cached per API key to avoid unnecessary recreation.
 */
export const getAIClient = async (userId?: number) => {
  // Try user's API key first
  const userApiKey = userId ? await getUserGeminiApiKey(userId) : null;
  
  // Fallback to config default or environment variable
  const config = getServiceConfig();
  const envKey = config.defaultApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  const apiKey = userApiKey || envKey;
  
  // Create cache key (userId + apiKey hash for uniqueness)
  const cacheKey = userId ? `user_${userId}_${apiKey?.substring(0, 8)}` : `default_${apiKey?.substring(0, 8)}`;
  
  // Return cached client if available
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }
  
  // Debug logging (only if debug is enabled)
  if (config.debug) {
  console.log('[Gemini] API Key Debug:', {
    hasUserId: !!userId,
    hasUserApiKey: !!userApiKey,
    hasEnvKey: !!envKey,
    envKeyLength: envKey ? envKey.length : 0,
    finalApiKeyLength: apiKey ? apiKey.length : 0,
    envKeys: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API_KEY'))
  });
  }
  
  if (!apiKey) {
    const errorMsg = 'Gemini API key is not set. Please set your API key in user settings or configure GEMINI_API_KEY in environment variables.';
    console.error('[Gemini]', errorMsg);
    console.error('[Gemini] Environment check:', {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `Set (${process.env.GEMINI_API_KEY.length} chars)` : 'NOT SET',
      API_KEY: process.env.API_KEY ? `Set (${process.env.API_KEY.length} chars)` : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    });
    throw new Error(errorMsg);
  }
  
  // Trim whitespace (common issue with .env files)
  const trimmedKey = apiKey.trim();
  if (trimmedKey !== apiKey) {
    console.warn('[Gemini] API key had leading/trailing whitespace, trimmed it');
  }
  
  // Log which key source is being used (masked for security) - only if debug enabled
  if (config.debug) {
  const keySource = userApiKey ? 'user settings' : 'environment variable';
  const maskedKey = trimmedKey.length > 12 
    ? trimmedKey.substring(0, 8) + '...' + trimmedKey.substring(trimmedKey.length - 4)
    : '****';
  console.log(`[Gemini] Using API key from ${keySource}: ${maskedKey}`);
  console.log(`[Gemini] API key length: ${trimmedKey.length} characters`);
  }
  
  // Validate API key format (Google AI Studio keys typically start with "AIza")
  if (!trimmedKey.startsWith('AIza')) {
    console.warn('[Gemini] API key format warning: Expected to start with "AIza". Key starts with:', trimmedKey.substring(0, 4));
  }
  
  if (trimmedKey.length < 30) {
    console.warn('[Gemini] API key seems too short. Expected ~39 characters, got:', trimmedKey.length);
  }
  
  try {
    const client = new GoogleGenAI({ apiKey: trimmedKey });
    console.log('[Gemini] Client initialized successfully');
    
    // Cache the client for reuse
    clientCache.set(cacheKey, client);
    
    return client;
  } catch (error: any) {
    console.error('[Gemini] Error initializing client:', error);
    console.error('[Gemini] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 200)
    });
    throw new Error(`Failed to initialize Gemini client: ${error.message}`);
  }
};

/**
 * Helper to safely parse JSON from AI response.
 * Handles markdown code blocks and parsing errors.
 */
const safeParseJSON = <T>(text: string | undefined, fallback: T): T => {
  if (!text) return fallback;
  try {
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // For arrays, find first [ and last ]
    if (cleanText.trim().startsWith('[')) {
      const firstBracket = cleanText.indexOf('[');
      let bracketCount = 0;
      let lastBracket = -1;
      for (let i = firstBracket; i < cleanText.length; i++) {
        if (cleanText[i] === '[') bracketCount++;
        if (cleanText[i] === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            lastBracket = i;
            break;
          }
        }
      }
      if (firstBracket !== -1 && lastBracket !== -1) {
        cleanText = cleanText.substring(firstBracket, lastBracket + 1);
      }
    } else {
      // For objects, find matching braces
      const firstBrace = cleanText.indexOf('{');
      if (firstBrace !== -1) {
        let braceCount = 0;
        let lastBrace = -1;
        for (let i = firstBrace; i < cleanText.length; i++) {
          if (cleanText[i] === '{') braceCount++;
          if (cleanText[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              lastBrace = i;
              break;
            }
          }
        }
        if (lastBrace !== -1) {
          cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }
      }
    }
    
    return JSON.parse(cleanText) as T;
  } catch (e) {
    console.warn("JSON Parse Warning: output might be truncated or malformed.", e);
    console.warn("Text that failed to parse:", text?.substring(0, 500));
    return fallback;
  }
};

/**
 * Generates a full story concept (Title, Genre, Plot, Characters) from a short seed idea.
 */
export const generateStoryConcept = async (seed: string, userId?: number): Promise<Partial<StoryContext>> => {
  const ai = await getAIClient(userId);
  
  const systemInstruction = `You are a professional screenwriter and creative director. 
  Create a compelling movie concept based on the user's seed idea.
  If the seed is empty, invent a unique, high-concept story (Sci-Fi, Thriller, Fantasy, or Noir).
  
  LANGUAGE NOTE:
  - If the user's seed is in Hindi or mixed Hindi/English (Hinglish), you should process it but GENERATE the output primarily in English.
  - Use Hindi (Devanagari) ONLY for specific character dialogue snippets or culturally specific terms if absolutely necessary.
  
  CRITICAL REQUIREMENTS:
  - You MUST return ALL fields: title, genre, plotSummary, characters, and initialContext.
  - Do NOT leave any field empty or null.
  - If the user provides a very long description, extract the key elements:
    * Title: Extract or create a concise, memorable title (max 100 characters)
    * Genre: Identify the primary genre (e.g., "Sci-Fi Thriller", "Action Adventure", "Superhero Drama")
    * Plot Summary: Create a concise summary (100-200 words) of the main story arc
    * Characters: List the main characters with brief descriptions (e.g., "Protagonist: An alien discovering his origins; Antagonist: Tech billionaire exploiting alien powers")
    * Initial Context: A vivid visual description of an opening or climactic scene (50-100 words)
  
  IMPORTANT: 
  - Keep the plot summary concise (100-200 words).
  - Keep the initial context vivid but brief (50-100 words).
  - Extract genre from the seed if mentioned (e.g., "sci-fi", "thriller", "superhero")
  - Identify main characters from the seed description
  
  Return a JSON object with ALL fields populated:
  - title: A concise, memorable movie title
  - genre: The primary genre (e.g., "Sci-Fi Thriller", "Superhero Action")
  - plotSummary: A 100-200 word summary of the story arc
  - characters: Main characters with brief descriptions
  - initialContext: A vivid, visual description of an opening or climactic scene (50-100 words)`;

  // Truncate seed to avoid context issues
  const safeSeed = (seed || "Surprise me with a unique, cinematic story concept.").substring(0, 500);
  const prompt = `Seed Idea: "${safeSeed}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            genre: { type: Type.STRING },
            plotSummary: { type: Type.STRING },
            characters: { type: Type.STRING },
            initialContext: { type: Type.STRING, description: "Visual description of the last scene to resume from" }
          }
        }
      }
    });

    // Log raw response for debugging
    console.log('[Gemini] Raw response:', {
      text: response.text,
      textLength: response.text?.length,
      textPreview: response.text?.substring(0, 500),
      fullText: response.text
    });

    // Try to parse the response
    let parsed: Partial<StoryContext>;
    try {
      parsed = safeParseJSON<Partial<StoryContext>>(response.text, {
        title: "Untitled Project",
        genre: "Unknown",
        plotSummary: "Could not generate plot.",
        characters: "Unknown",
        initialContext: ""
      });
    } catch (parseError) {
      console.error('[Gemini] JSON parsing error:', parseError);
      console.error('[Gemini] Raw response that failed to parse:', response.text);
      parsed = {
        title: "Untitled Project",
        genre: "Unknown",
        plotSummary: "Could not generate plot.",
        characters: "Unknown",
        initialContext: ""
      };
    }
    
    // Log the parsed response for debugging
    console.log('[Gemini] Parsed story concept:', {
      parsed: JSON.stringify(parsed, null, 2),
      hasTitle: !!parsed.title,
      hasGenre: !!parsed.genre,
      hasPlotSummary: !!parsed.plotSummary,
      hasCharacters: !!parsed.characters,
      hasInitialContext: !!parsed.initialContext,
      titleValue: parsed.title,
      genreValue: parsed.genre,
      plotValue: parsed.plotSummary?.substring(0, 100),
      charactersValue: parsed.characters
    });
    
    // Check if we got fallback values (indicating parsing failed or fields are missing)
    const hasValidTitle = parsed.title && parsed.title !== "Untitled Project";
    const hasValidGenre = parsed.genre && parsed.genre !== "Unknown";
    const hasValidPlot = parsed.plotSummary && parsed.plotSummary !== "Could not generate plot." && parsed.plotSummary !== "Could not generate plot summary.";
    const hasValidCharacters = parsed.characters && parsed.characters !== "Unknown";
    
    if (!hasValidTitle || !hasValidGenre || !hasValidPlot || !hasValidCharacters) {
      console.warn('[Gemini] Missing required fields:', {
        hasTitle: hasValidTitle,
        hasGenre: hasValidGenre,
        hasPlot: hasValidPlot,
        hasCharacters: hasValidCharacters,
        rawResponse: response.text
      });
    }
    
    // Ensure all required fields are present, fill with defaults if missing
    const result = {
      title: hasValidTitle ? parsed.title! : "Untitled Project",
      genre: hasValidGenre ? parsed.genre! : "Superhero Action", // Better default for "Superman and Ironman"
      plotSummary: hasValidPlot ? parsed.plotSummary! : `A superhero story combining elements of ${seed.substring(0, 50)}. The protagonist discovers their true origins while facing a powerful antagonist who seeks to exploit their abilities.`,
      characters: hasValidCharacters ? parsed.characters! : `Hero: A powerful being discovering their origins; Villain: A tech mogul seeking to weaponize alien technology`,
      initialContext: parsed.initialContext || `Opening scene: The hero stands at the edge of a futuristic city, their powers awakening as they realize they are not who they thought they were.`
    };
    
    console.log('[Gemini] Final result:', result);
    
    return result;
  } catch (error: any) {
    console.error("Error generating story:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
      code: error.code,
      response: error.response?.data || error.response
    });
    
    // Provide more helpful error messages
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      throw new Error('Invalid Gemini API key. Please check your API key in settings or environment variables.');
    }
    if (error.status === 403 || error.statusCode === 403 || error.code === 'PERMISSION_DENIED') {
      throw new Error('Gemini API is not enabled. Please enable the Generative Language API in Google Cloud Console: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview');
    }
    if (error.message?.includes('SERVICE_DISABLED') || error.message?.includes('not enabled')) {
      throw new Error('Gemini API is not enabled. Please enable the Generative Language API in Google Cloud Console: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview');
    }
    
    // Re-throw the error so the route handler can return proper error response
    throw error;
  }
};

/**
 * Suggests the immediate next scene idea (visual description) based on context history.
 */
export const suggestNextScene = async (
  context: StoryContext,
  recentScenes: Scene[],
  userId?: number
): Promise<string> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a master Screenwriter and Continuity Director.
  Your task is to conceive the NEXT 8-second shot in a film sequence.
  
  INPUT ANALYSIS:
  - Review the "Story Context" for the overall arc.
  - Review "Recent Scenes" to understand the immediate action trajectory (escalation, reaction, revelation).
  - Review "Last Scene Summary" to ensure perfect spatial and temporal continuity.
  
  LANGUAGE PROTOCOLS:
  - **VISUAL DESCRIPTION**: Output MUST be in **ENGLISH**.
  - **DIALOGUE**: Only if the scene includes spoken lines, you may write the dialogue in the character's native language (e.g. Hindi in Devanagari).
  - Use proper script format (Hindi words in Hindi script, English words in English script).
  
  OUTPUT REQUIREMENT:
  - Provide a SINGLE, VIVID paragraph (2-3 sentences) describing the visual action.
  - Do NOT include technical camera jargon here (that comes later). Focus on what happens IN THE FRAME.
  - The transition from the last scene must be seamless.
  `;

  // Build a rich history string
  let historyPrompt = "";
  if (recentScenes.length === 0) {
    historyPrompt = `OPENING CONTEXT: ${context.initialContext || "The story begins here."}`;
  } else {
    historyPrompt = recentScenes.map(s => 
      `SCENE ${s.sequenceNumber}: ${s.contextSummary}`
    ).join('\n');
  }

  const lastScene = recentScenes[recentScenes.length - 1];
  const lastSummary = lastScene ? lastScene.contextSummary : context.initialContext;

  const prompt = `
    PROJECT: ${context.title}
    GENRE: ${context.genre}
    PLOT: ${context.plotSummary.substring(0, 400)}
    
    SEQUENCE HISTORY (Last 5 shots):
    ${historyPrompt.substring(0, 1500)}
    
    IMMEDIATE PREVIOUS ACTION:
    "${lastSummary || 'None'}"
    
    TASK: Write the visual description for the next 8-second clip (Scene ${recentScenes.length + 1}). 
    Maintain strict continuity with the previous action.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    return response.text?.trim() || "";
  } catch (error: any) {
    console.error("Error suggesting next scene:", error);
    // Re-throw the error so the route handler can return proper error response
    throw error;
  }
};

/**
 * Analyzes context and input to suggest the best technical director settings automatically.
 */
export const suggestDirectorSettings = async (
  rawIdea: string,
  context: StoryContext,
  prevSceneSummary: string | null,
  currentSettings: DirectorSettings,
  userId?: number
): Promise<DirectorSettings> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are an expert Cinematographer and Director. 
  Your task is to determine the best technical camera, lighting, sound, and physics settings for the next scene in a movie.
  
  Analyze the Genre, Plot, Previous Context, and the User's rough idea for the next shot.
  Select the most impactful settings that enhance the storytelling.
  
  **CRITICAL: YOU MUST FILL IN ALL FIELDS. DO NOT LEAVE ANY FIELD EMPTY.**
  
  **CRITICAL LANGUAGE RULES**:
  1. **INPUT HANDLING**: The user's idea might be in **Hindi**, **Hinglish** (Hindi in English script), or **English**. You must understand all three.
  2. **TECHNICAL OUTPUT (Lens, Angle, Lighting, Movement, Sound)**: MUST be in **ENGLISH**.
  3. **DIALOGUE OUTPUT**:
     - If the user's idea contains dialogue, or if the character context implies it, output the dialogue.
     - **FORMAT MANDATORY**: "Character Name: 'Dialogue'" (e.g., Aryan: "Wait here.", Ghost: "I cannot.")
     - **LANGUAGE**: Use **Hindi (Devanagari)** for Hindi lines. Use English for English lines.
     - Example: Aryan: "हम कहाँ हैं?", Creatures: "Tum quantum state mein ho..."
  
  **MANDATORY FIELD REQUIREMENTS** (ALL must be filled):
  - customSceneId: Generate a scene identifier (e.g. "SCENE_001", "INT_OFFICE_02")
  - lens: REQUIRED - Suggest specific focal lengths (e.g. "24mm Wide", "50mm Anamorphic", "85mm Portrait", "35mm Prime"). NEVER leave empty.
  - angle: REQUIRED - Camera angle (e.g. "Eye Level", "Low Angle", "High Angle", "Dutch Angle", "Bird's Eye"). NEVER leave empty.
  - lighting: REQUIRED - Be descriptive (e.g. "Chiaroscuro high contrast", "Neon-noir rim light", "Overcast soft diffusion", "Natural Cinematic"). NEVER leave empty.
  - movement: REQUIRED - Suggest specific gear (e.g. "Steadicam", "Dolly Zoom", "Handheld shaky", "Crane down", "Static"). NEVER leave empty.
  - zoom: REQUIRED - Zoom intensity (e.g. "Slow Push In", "Crash Zoom", "No Zoom", "Slow Pull Out"). Use "No Zoom" if no zoom is needed. NEVER leave empty.
  - sound: REQUIRED - Sound layers (e.g. "Heartbeat thumping + Distant sirens", "Wind howling + Crunching snow", "Atmospheric ambient", "Silence"). NEVER leave empty.
  - dialogue: If characters are interacting or the scene suggests dialogue, provide it. Otherwise use empty string "".
  - stuntInstructions: If action/stunts are implied, specify mechanics (e.g. "Wire-assisted fall", "Squib impact", "High-speed collision"). Otherwise use empty string "".
  - physicsFocus: Boolean - true if scene requires high physics detail (action, explosions, water, etc.), false otherwise.
  - style: Must be one of: "Cinematic", "Documentary", "Experimental", "Commercial", "Music Video"
  - transition: Transition type (e.g. "Cut", "Fade", "Dissolve", "Wipe", "Match Cut")
  
  Return a JSON object matching the DirectorSettings interface exactly. ALL REQUIRED FIELDS MUST HAVE VALUES.`;

  const prompt = `
    MOVIE PROJECT:
    Title: ${context.title || 'Untitled'}
    Genre: ${context.genre || 'General'}
    Characters: ${context.characters || 'Unknown'}
    
    STORY CONTEXT:
    ${(prevSceneSummary || context.plotSummary || 'No previous context').substring(0, 500)}
    
    USER'S IDEA FOR NEXT SCENE:
    "${(rawIdea || "Continue the story naturally from the previous context.").substring(0, 300)}"
    
    CURRENT STYLE: ${currentSettings.style || 'Cinematic'}
    
    YOUR TASK:
    Based on the user's idea above, generate COMPLETE technical settings for this scene.
    - Analyze what type of shot this is (action, dialogue, establishing, etc.)
    - Determine appropriate camera settings (lens, angle, movement, zoom)
    - Determine lighting style that matches the mood
    - Determine sound design that enhances the scene
    - If dialogue is present or implied, include it
    - If action/stunts are present, include stunt instructions
    
    CRITICAL: Fill in EVERY field with appropriate values. Do not leave any field as an empty string unless it truly doesn't apply (like dialogue in a silent scene).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customSceneId: { 
              type: Type.STRING,
              description: "Scene identifier like 'SCENE_001' or 'INT_OFFICE_02'. REQUIRED."
            },
            lens: { 
              type: Type.STRING,
              description: "Camera lens specification. Examples: '24mm Wide', '50mm Anamorphic', '85mm Portrait', '35mm Prime'. REQUIRED - must provide a value."
            },
            angle: { 
              type: Type.STRING,
              description: "Camera angle. Examples: 'Eye Level', 'Low Angle', 'High Angle', 'Dutch Angle'. REQUIRED - must provide a value."
            },
            lighting: { 
              type: Type.STRING,
              description: "Lighting style. Examples: 'Chiaroscuro high contrast', 'Neon-noir rim light', 'Natural Cinematic'. REQUIRED - must provide a value."
            },
            movement: { 
              type: Type.STRING,
              description: "Camera movement. Examples: 'Steadicam', 'Dolly Zoom', 'Handheld shaky', 'Static', 'Crane down'. REQUIRED - must provide a value."
            },
            zoom: { 
              type: Type.STRING,
              description: "Zoom operation. Examples: 'Slow Push In', 'Crash Zoom', 'No Zoom', 'Slow Pull Out'. REQUIRED - must provide a value."
            },
            sound: { 
              type: Type.STRING,
              description: "Sound design. Examples: 'Heartbeat thumping + Distant sirens', 'Atmospheric ambient', 'Wind howling'. REQUIRED - must provide a value."
            },
            dialogue: { 
              type: Type.STRING,
              description: "Spoken lines if present. Format: Character: 'Line'. Leave empty if no dialogue."
            },
            stuntInstructions: { 
              type: Type.STRING,
              description: "Stunt/action mechanics if applicable. Examples: 'Wire-assisted fall', 'Squib impact'. Leave empty if no stunts."
            },
            physicsFocus: { 
              type: Type.BOOLEAN,
              description: "Whether scene requires high physics detail (true for action/explosions/water, false otherwise)."
            },
            style: { 
              type: Type.STRING,
              enum: Object.values(TechnicalStyle),
              description: "Visual style. Must be one of: Cinematic, Documentary, Experimental, Commercial, Music Video."
            },
            transition: { 
              type: Type.STRING,
              description: "Transition type. Examples: 'Cut', 'Fade', 'Dissolve', 'Wipe'. REQUIRED - must provide a value."
            }
          },
          required: ['lens', 'angle', 'lighting', 'movement', 'zoom', 'sound', 'transition', 'style', 'physicsFocus']
        }
      }
    });

    // Log the raw response for debugging
    console.log('Raw Gemini response:', response.text);
    
    const json = safeParseJSON<Partial<DirectorSettings>>(response.text, {});
    
    // Log parsed JSON for debugging
    console.log('Parsed JSON:', JSON.stringify(json, null, 2));
    
    // Merge with defaults to ensure safety - use empty string check, not just falsy
    return {
      ...currentSettings,
      ...json,
      // Ensure specific fields are strings and valid - check for empty strings explicitly
      customSceneId: json.customSceneId || `SCENE_${Date.now().toString().slice(-6)}`,
      lens: (json.lens && json.lens.trim()) ? json.lens : '35mm Prime',
      angle: (json.angle && json.angle.trim()) ? json.angle : 'Eye Level',
      lighting: (json.lighting && json.lighting.trim()) ? json.lighting : 'Natural Cinematic',
      movement: (json.movement && json.movement.trim()) ? json.movement : 'Static',
      zoom: (json.zoom && json.zoom.trim()) ? json.zoom : 'No Zoom',
      sound: (json.sound && json.sound.trim()) ? json.sound : 'Atmospheric ambient',
      stuntInstructions: json.stuntInstructions || '',
      dialogue: json.dialogue || '',
      physicsFocus: json.physicsFocus ?? currentSettings.physicsFocus ?? false,
      style: json.style || currentSettings.style || TechnicalStyle.CINEMATIC,
      transition: (json.transition && json.transition.trim()) ? json.transition : 'Cut'
    };
  } catch (error: any) {
    console.error("Error predicting settings:", error);
    // Re-throw the error so the route handler can return proper error response
    throw error;
  }
};

/**
 * Uses Gemini Flash to act as a "Director AI".
 * It takes a simple user idea and expands it into a highly detailed, physically accurate prompt.
 */
export const enhanceScenePrompt = async (
  rawIdea: string,
  context: StoryContext,
  prevSceneSummary: string | null,
  settings: DirectorSettings,
  userId?: number
): Promise<{ enhancedPrompt: string; contextSummary: string }> => {
  const ai = await getAIClient(userId);

  // Updated System Instruction for strict language separation
  const systemInstruction = `You are a legendary Film Director, Cinematographer, VFX Supervisor, and Stunt Coordinator combined.
  
  Your task is to generate the **ULTIMATE PRODUCTION PROMPT** for a high-end AI video generator (like Veo or Sora). 
  The output must be an extremely dense, technical, and visually evocative description of an 8-second clip.
  
  **STRICT LANGUAGE PROTOCOLS**:
  1. **VISUAL ACTION, LIGHTING, PHYSICS, CAMERA, AUDIO**: MUST be in **ENGLISH**. Even if the user input is in Hindi, you must TRANSLATE the visual description to English.
  2. **DIALOGUE**: If provided, include the dialogue exactly as given (respecting the Character: "Line" format and native script).
  3. **NO TRANSLITERATION**: Do not write Hindi in English letters (No Hinglish) in the output UNLESS the user explicitly provided it that way.
  4. **INPUT**: Accept Hindi, Hinglish, or English input.
  
  You must NOT return a simple summary. You must return a STRUCTURED TECHNICAL BREAKDOWN string.
  
  Output Format for 'enhancedPrompt' string (Use line breaks):
  
  **VISUAL ACTION (8s)**: [Detailed frame-by-frame description of the action, actors, expressions, and environment evolution in ENGLISH.]
  
  **CAMERA & LENS**: [Specific camera model, lens focal length, T-stop, shutter angle, specific movement type, damping, framing, zoom operations in ENGLISH]
  
  **LIGHTING & ATMOSPHERE**: [Key light position, ratios, volumetric fog density, color palette hex codes or names, exposure value, light texture in ENGLISH]
  
  **PHYSICS, VFX & STUNTS**: [Fluid dynamics, cloth simulation weight/drag, particle emission rates, impact velocity, skin texture scattering (sweat/pores), destruction physics, wirework specs in ENGLISH]
  
  **AUDIO LANDSCAPE**: [Specific foley stems, ambience layers, music intensity, mixing notes in ENGLISH]
  
  INSTRUCTIONS:
  - Populate every section with high-fidelity details.
  - If the user provided 'stuntInstructions', expand on them with physics (velocity, gravity).
  - If 'physicsFocus' is true, obsess over textures (skin, water, debris).
  - Ensure the 'contextSummary' field is a simple 1-sentence narrative bridge for the next scene (in ENGLISH).
  `;

  // Updated Prompt Construction to include ALL settings
  const prompt = `
    PROJECT DATA:
    Movie Title: ${context.title}
    Genre: ${context.genre}
    Previous Context: ${(prevSceneSummary || "Start of sequence").substring(0, 500)}
    
    DIRECTOR'S BEAT: "${rawIdea}"
    
    TECHNICAL INPUTS (MANDATORY INCLUSION):
    - Lens/Angle: ${settings.lens}, ${settings.angle}
    - Lighting: ${settings.lighting}
    - Camera Movement: ${settings.movement}
    - Camera Zoom: ${settings.zoom || "None"}
    - Physics Level: ${settings.physicsFocus ? "ULTRA-HIGH FIDELITY (Soft-body, Fluid, Particle)" : "Standard Cinematic"}
    - Stunt Specifics: ${settings.stuntInstructions || "Realistic motion"}
    - Sound Design: ${settings.sound || "Cinematic atmosphere"}
    - Dialogue Context: ${settings.dialogue || "No dialogue"}
    - Next Transition: ${settings.transition}
    
    EXECUTE: Generate the structured 8-second production prompt now. Invent details where missing.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedPrompt: { type: Type.STRING },
            contextSummary: { type: Type.STRING }
          }
        }
      }
    });

    const json = safeParseJSON(response.text, { 
      enhancedPrompt: rawIdea, 
      contextSummary: rawIdea 
    });

    return {
      enhancedPrompt: json.enhancedPrompt || rawIdea,
      contextSummary: json.contextSummary || rawIdea
    };
  } catch (error: any) {
    console.error("Error enhancing prompt:", error);
    // Re-throw the error so the route handler can return proper error response
    throw error;
  }
};

/**
 * Extracts characters from story context and all scenes, returns structured character data
 */
export const extractCharacters = async (
  context: StoryContext,
  scenes: Scene[] = [],
  userId?: number
): Promise<Array<{ name: string; description?: string; role?: string; appearance?: string; personality?: string }>> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a professional script analyst. Extract all characters mentioned in the ENTIRE story, including all scenes.
  Return a JSON array of character objects with:
  - name: Character's name (required)
  - description: Brief character description
  - role: Character's role (e.g., "Protagonist", "Antagonist", "Supporting")
  - appearance: Physical appearance description
  - personality: Personality traits
  
  Extract ALL characters mentioned throughout the entire story, including all scenes. Analyze the complete narrative to identify every character, even minor ones.`;

  // Build scenes content summary - limit to prevent timeout
  // Truncate long content and limit number of scenes if too many
  const MAX_SCENES = 50; // Limit to first 50 scenes to prevent timeout
  const MAX_CONTENT_LENGTH = 500; // Limit each field to 500 chars
  
  const truncate = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  const scenesToProcess = scenes.slice(0, MAX_SCENES);
  const scenesContent = scenesToProcess.length > 0 
    ? scenesToProcess.map((scene, idx) => `
      Scene ${scene.sequenceNumber || idx + 1}:
      - Raw Idea: ${truncate(scene.rawIdea, MAX_CONTENT_LENGTH)}
      - Enhanced Prompt: ${truncate(scene.enhancedPrompt, MAX_CONTENT_LENGTH)}
      - Context Summary: ${truncate(scene.contextSummary, MAX_CONTENT_LENGTH)}
    `).join('\n')
    : 'No scenes generated yet.';
  
  if (scenes.length > MAX_SCENES) {
    console.warn(`Character extraction: Processing only first ${MAX_SCENES} of ${scenes.length} scenes to prevent timeout`);
  }

  const prompt = `
    COMPLETE STORY ANALYSIS:
    
    STORY CONTEXT:
    Title: ${context.title || 'Untitled'}
    Genre: ${context.genre || 'General'}
    Plot Summary: ${context.plotSummary || ''}
    Initial Characters Mentioned: ${context.characters || ''}
    Initial Context: ${context.initialContext || ''}
    
    ALL SCENES IN THE STORY:
    ${scenesContent}
    
    Analyze the ENTIRE story above, including all scenes, and extract ALL characters that appear throughout the complete narrative. Consider character development, relationships, and appearances across all scenes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              role: { type: Type.STRING },
              appearance: { type: Type.STRING },
              personality: { type: Type.STRING }
            },
            required: ['name']
          }
        }
      }
    });

    return safeParseJSON<Array<{ name: string; description?: string; role?: string; appearance?: string; personality?: string }>>(
      response.text,
      []
    );
  } catch (error: any) {
    console.error("Error extracting characters:", error);
    throw error;
  }
};

/**
 * Suggests scenes using AI based on story context
 */
export const suggestScenes = async (
  storyContext: StoryContext,
  scenes: Scene[],
  prompt: string,
  suggestionType: 'next' | 'improve' | 'transition',
  selectedSceneId?: string,
  userId?: number
): Promise<Array<{
  suggestion: string;
  reasoning: string;
  confidence: number;
  type: 'continuation' | 'improvement' | 'transition' | 'climax' | 'resolution';
}>> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a professional screenwriter and story consultant. Analyze the story and provide creative, compelling scene suggestions.

Return a JSON array of suggestion objects with:
- suggestion: A detailed scene idea (2-3 sentences)
- reasoning: Why this scene would work well (1-2 sentences)
- confidence: Confidence score (0-1)
- type: One of: "continuation", "improvement", "transition", "climax", "resolution"

Provide 3-5 diverse suggestions that offer different creative directions.`;

  // Build context from recent scenes
  const MAX_SCENES = 10;
  const MAX_CONTENT_LENGTH = 200;
  
  const truncate = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const scenesToProcess = scenes.slice(-MAX_SCENES);
  const scenesContent = scenesToProcess.length > 0 
    ? scenesToProcess.map((scene, idx) => `
      Scene ${scene.sequenceNumber || idx + 1}:
      - Idea: ${truncate(scene.rawIdea, MAX_CONTENT_LENGTH)}
      - Context: ${truncate(scene.contextSummary, MAX_CONTENT_LENGTH)}
      - Dialogue: ${truncate(scene.directorSettings?.dialogue, MAX_CONTENT_LENGTH)}
    `).join('\n')
    : 'No scenes yet.';

  const selectedScene = selectedSceneId ? scenes.find(s => s.id === selectedSceneId) : null;
  const selectedSceneContent = selectedScene ? `
    SELECTED SCENE TO IMPROVE:
    Scene ${selectedScene.sequenceNumber}:
    - Idea: ${truncate(selectedScene.rawIdea, MAX_CONTENT_LENGTH)}
    - Enhanced: ${truncate(selectedScene.enhancedPrompt, MAX_CONTENT_LENGTH)}
    - Context: ${truncate(selectedScene.contextSummary, MAX_CONTENT_LENGTH)}
  ` : '';

  const fullPrompt = `
    STORY CONTEXT:
    Title: ${storyContext.title || 'Untitled'}
    Genre: ${storyContext.genre || 'General'}
    Plot Summary: ${storyContext.plotSummary || ''}
    Characters: ${storyContext.characters || ''}
    
    ${selectedSceneContent}
    
    RECENT SCENES:
    ${scenesContent}
    
    REQUEST: ${prompt}
    
    Provide ${suggestionType === 'next' ? 'next scene' : suggestionType === 'improve' ? 'improvement' : 'transition'} suggestions that are creative, compelling, and fit the story's tone and progression.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              suggestion: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              type: {
                type: Type.STRING,
                enum: ['continuation', 'improvement', 'transition', 'climax', 'resolution']
              }
            },
            required: ['suggestion', 'reasoning', 'confidence', 'type']
          }
        }
      }
    });

    return safeParseJSON<Array<{
      suggestion: string;
      reasoning: string;
      confidence: number;
      type: 'continuation' | 'improvement' | 'transition' | 'climax' | 'resolution';
    }>>(
      response.text,
      []
    );
  } catch (error: any) {
    console.error("Error suggesting scenes:", error);
    throw error;
  }
};

/**
 * Analyzes character relationships using AI
 */
export const analyzeCharacterRelationships = async (
  characters: Array<{ name: string }>,
  scenes: Scene[],
  context: StoryContext,
  userId?: number
): Promise<Array<{
  character1: string;
  character2: string;
  type: 'allies' | 'enemies' | 'neutral' | 'romantic' | 'family';
  strength: number;
  description?: string;
}>> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a professional story analyst specializing in character relationships. Analyze the relationships between characters based on their interactions in scenes.

Return a JSON array of relationship objects with:
- character1: First character name
- character2: Second character name
- type: Relationship type - one of: "allies", "enemies", "neutral", "romantic", "family"
- strength: Relationship strength (0-1, where 1 is strongest)
- description: Brief description of their relationship (optional)

Analyze the actual content, dialogue, and interactions to determine relationship types accurately.`;

  // Build scenes content summary - limit to prevent timeout
  const MAX_SCENES = 30;
  const MAX_CONTENT_LENGTH = 300;
  
  const truncate = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const scenesToProcess = scenes.slice(0, MAX_SCENES);
  const scenesContent = scenesToProcess.length > 0 
    ? scenesToProcess.map((scene, idx) => `
      Scene ${scene.sequenceNumber || idx + 1}:
      - Raw Idea: ${truncate(scene.rawIdea, MAX_CONTENT_LENGTH)}
      - Enhanced Prompt: ${truncate(scene.enhancedPrompt, MAX_CONTENT_LENGTH)}
      - Context Summary: ${truncate(scene.contextSummary, MAX_CONTENT_LENGTH)}
      - Dialogue: ${truncate(scene.directorSettings?.dialogue, MAX_CONTENT_LENGTH)}
    `).join('\n')
    : 'No scenes generated yet.';

  const characterNames = characters.map(c => c.name).join(', ');

  const prompt = `
    STORY CONTEXT:
    Title: ${context.title || 'Untitled'}
    Genre: ${context.genre || 'General'}
    Plot Summary: ${context.plotSummary || ''}
    
    CHARACTERS TO ANALYZE:
    ${characterNames}
    
    SCENES:
    ${scenesContent}
    
    Analyze the relationships between all pairs of characters listed above. Consider:
    - Their interactions in dialogue
    - Their actions toward each other
    - The context and tone of their scenes together
    - Whether they cooperate, conflict, or are neutral
    - Any romantic or familial connections
    
    Return relationships for ALL character pairs that appear together in scenes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              character1: { type: Type.STRING },
              character2: { type: Type.STRING },
              type: { 
                type: Type.STRING,
                enum: ['allies', 'enemies', 'neutral', 'romantic', 'family']
              },
              strength: { type: Type.NUMBER },
              description: { type: Type.STRING }
            },
            required: ['character1', 'character2', 'type', 'strength']
          }
        }
      }
    });

    return safeParseJSON<Array<{
      character1: string;
      character2: string;
      type: 'allies' | 'enemies' | 'neutral' | 'romantic' | 'family';
      strength: number;
      description?: string;
    }>>(
      response.text,
      []
    );
  } catch (error: any) {
    console.error("Error analyzing character relationships:", error);
    throw error;
  }
};

/**
 * Extracts locations from story context and all scenes, returns structured location data
 */
export const extractLocations = async (
  context: StoryContext,
  scenes: Scene[] = [],
  userId?: number
): Promise<Array<{ name: string; description?: string; location_type?: string; address?: string }>> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a location scout. Extract all locations mentioned in the ENTIRE story, including all scenes.
  Return a JSON array of location objects with:
  - name: Location name (required)
  - description: Brief location description
  - location_type: Type of location (e.g., "Interior", "Exterior", "Studio", "Real Location")
  - address: Physical address or description if mentioned
  
  Extract ALL locations mentioned throughout the entire story, including all scenes. Analyze the complete narrative to identify every location, even minor ones.`;

  // Build scenes content summary with full details
  const scenesContent = scenes.length > 0 
    ? scenes.map((scene, idx) => `
      Scene ${scene.sequenceNumber || idx + 1}:
      - Raw Idea: ${scene.rawIdea || ''}
      - Enhanced Prompt: ${scene.enhancedPrompt || ''}
      - Context Summary: ${scene.contextSummary || ''}
    `).join('\n')
    : 'No scenes generated yet.';

  const prompt = `
    COMPLETE STORY ANALYSIS:
    
    STORY CONTEXT:
    Title: ${context.title || 'Untitled'}
    Genre: ${context.genre || 'General'}
    Plot Summary: ${context.plotSummary || ''}
    Initial Context: ${context.initialContext || ''}
    
    ALL SCENES IN THE STORY:
    ${scenesContent}
    
    Analyze the ENTIRE story above, including all scenes, and extract ALL locations that appear throughout the complete narrative. Consider location descriptions, settings, and any physical addresses or location details mentioned across all scenes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              location_type: { type: Type.STRING },
              address: { type: Type.STRING }
            },
            required: ['name']
          }
        }
      }
    });

    return safeParseJSON<Array<{ name: string; description?: string; location_type?: string; address?: string }>>(
      response.text,
      []
    );
  } catch (error: any) {
    console.error("Error extracting locations:", error);
    throw error;
  }
};

/**
 * Analyzes a complete story for pacing, character development, plot holes, structure, and dialogue
 */
export const analyzeStory = async (
  context: StoryContext,
  scenes: Scene[],
  userId?: number
): Promise<{
  pacing: { score: number; issues: string[]; suggestions: string[] };
  characterDevelopment: { score: number; issues: string[]; suggestions: string[] };
  plotHoles: { found: boolean; issues: string[] };
  structure: { score: number; analysis: string; suggestions: string[] };
  dialogue: { score: number; issues: string[]; suggestions: string[] };
}> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a professional story analyst and script consultant. Analyze storyboard projects and provide comprehensive feedback on pacing, character development, plot structure, and dialogue quality.

Return a JSON object with the following structure:
{
  "pacing": {
    "score": 0-100,
    "issues": ["issue1", "issue2"],
    "suggestions": ["suggestion1", "suggestion2"]
  },
  "characterDevelopment": {
    "score": 0-100,
    "issues": ["issue1"],
    "suggestions": ["suggestion1"]
  },
  "plotHoles": {
    "found": true/false,
    "issues": ["hole1", "hole2"]
  },
  "structure": {
    "score": 0-100,
    "analysis": "detailed analysis text",
    "suggestions": ["suggestion1"]
  },
  "dialogue": {
    "score": 0-100,
    "issues": ["issue1"],
    "suggestions": ["suggestion1"]
  }
}

Focus on:
1. Pacing - Are scenes well-paced? Too fast/slow? Transitions smooth?
2. Character Development - Are characters well-developed? Consistent? Growth arcs?
3. Plot Holes - Any inconsistencies or missing connections?
4. Structure - Does it follow good story structure (three-act, etc.)?
5. Dialogue - Is dialogue natural and character-appropriate?

Provide specific, actionable feedback.`;

  // Limit scenes to prevent timeout
  const MAX_SCENES = 50;
  const MAX_CONTENT_LENGTH = 300;
  
  const truncate = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const scenesToProcess = scenes.slice(0, MAX_SCENES);
  const scenesContent = scenesToProcess.length > 0
    ? scenesToProcess.map((scene, idx) => `
      Scene ${scene.sequenceNumber || idx + 1}:
      - Prompt: ${truncate(scene.enhancedPrompt, MAX_CONTENT_LENGTH)}
      - Dialogue: ${truncate(scene.directorSettings?.dialogue, MAX_CONTENT_LENGTH) || 'None'}
      - Context: ${truncate(scene.contextSummary, MAX_CONTENT_LENGTH) || 'None'}
    `).join('\n')
    : 'No scenes generated yet.';

  if (scenes.length > MAX_SCENES) {
    console.warn(`Story analysis: Processing only first ${MAX_SCENES} of ${scenes.length} scenes`);
  }

  const prompt = `
    STORY CONTEXT:
    Title: ${context.title || 'Untitled'}
    Genre: ${context.genre || 'General'}
    Plot Summary: ${context.plotSummary || ''}
    Characters: ${context.characters || ''}
    
    SCENES (${scenesToProcess.length} of ${scenes.length} total):
    ${scenesContent}
    
    Analyze this storyboard project comprehensively. Provide detailed feedback on pacing, character development, plot structure, and dialogue quality.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pacing: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['score', 'issues', 'suggestions']
            },
            characterDevelopment: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['score', 'issues', 'suggestions']
            },
            plotHoles: {
              type: Type.OBJECT,
              properties: {
                found: { type: Type.BOOLEAN },
                issues: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['found', 'issues']
            },
            structure: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                analysis: { type: Type.STRING },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['score', 'analysis', 'suggestions']
            },
            dialogue: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['score', 'issues', 'suggestions']
            }
          },
          required: ['pacing', 'characterDevelopment', 'plotHoles', 'structure', 'dialogue']
        }
      }
    });

    return safeParseJSON<{
      pacing: { score: number; issues: string[]; suggestions: string[] };
      characterDevelopment: { score: number; issues: string[]; suggestions: string[] };
      plotHoles: { found: boolean; issues: string[] };
      structure: { score: number; analysis: string; suggestions: string[] };
      dialogue: { score: number; issues: string[]; suggestions: string[] };
    }>(
      response.text,
      {
        pacing: { score: 0, issues: [], suggestions: [] },
        characterDevelopment: { score: 0, issues: [], suggestions: [] },
        plotHoles: { found: false, issues: [] },
        structure: { score: 0, analysis: 'Analysis failed', suggestions: [] },
        dialogue: { score: 0, issues: [], suggestions: [] }
      }
    );
  } catch (error: any) {
    console.error("Error analyzing story:", error);
    throw error;
  }
};

/**
 * Generates hashtags and captions for an episode
 */
export const generateEpisodeContent = async (
  episodeTitle: string,
  episodeDescription: string,
  projectContext: StoryContext,
  userId?: number
): Promise<{ hashtags: string[]; caption: string }> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a social media content creator for film/TV projects.
  Generate engaging hashtags and captions for an episode.
  
  Return:
  - hashtags: Array of 10-15 relevant hashtags (mix of genre, themes, episode-specific)
  - caption: Engaging 2-3 sentence caption for social media (Instagram/Twitter style)
  
  Make it engaging, use emojis appropriately, and include relevant film/TV hashtags.`;

  const prompt = `
    PROJECT:
    Title: ${projectContext.title || 'Untitled'}
    Genre: ${projectContext.genre || 'General'}
    
    EPISODE:
    Title: ${episodeTitle}
    Description: ${episodeDescription}
    
    Generate hashtags and caption for this episode.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            caption: { type: Type.STRING }
          },
          required: ['hashtags', 'caption']
        }
      }
    });

    return safeParseJSON<{ hashtags: string[]; caption: string }>(
      response.text,
      { hashtags: [], caption: '' }
    );
  } catch (error: any) {
    console.error("Error generating episode content:", error);
    throw error;
  }
};

/**
 * Generate simplified comic book content from scenes
 * Removes technical details, focuses on dialogues, tone, and visual storytelling
 */
export const generateComicContent = async (
  projectContext: StoryContext,
  scenes: Scene[],
  userId?: number,
  coverImageId?: string
): Promise<{ comicContent: string; htmlContent: string }> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a professional comic book writer and artist.
  Transform film/TV scenes into comic book format.
  
  CRITICAL FORMATTING RULES - FOLLOW EXACTLY:
  1. NEVER write "comic-panel-number", "SFX:", "NARRATION:", ">", or any formatting markers as literal text
  2. REMOVE all technical camera details (lens, angle, movement, zoom, etc.)
  3. REMOVE all production notes and technical specifications
  4. FOCUS on:
     - Dialogue with emotional tone indicators (whispered, shouted, sarcastic, etc.)
     - Visual descriptions that paint a picture
     - Character emotions and expressions
     - Action and movement in simple terms
     - Panel-by-panel storytelling
  
  5. Format each scene EXACTLY like this example (NO extra text, NO markers, NO prefixes):
     
     Scene 1 (SEQ #01):
     
     PANEL 1
     The hero stands at the edge of the rooftop, city lights twinkling below. Rain streaks down his face.
     
     Hero (determined): "This ends tonight."
     
     WHOOSH!
     
     PANEL 2
     The hero leaps into action, cape billowing behind him.
     
     BANG!
     
     And so, the legend begins...
     
     Scene 2 (SEQ #02):
     PANEL 1
     [Next scene content]
  
  6. FORMATTING RULES - STRICTLY FOLLOW:
     - Scene headers: "Scene [number] ([Scene ID]):" on its own line - NO other text
     - Panel markers: "PANEL [number]" on its own line - NO quotes, NO ">", NO other text
     - Sound effects: Just the effect in ALL CAPS on its own line (e.g., "WHOOSH!" "BANG!") - NO "SFX:" prefix
     - Narration: Plain descriptive text, no prefix, on its own line - NO "NARRATION:" prefix
     - Dialogue: "[Character] (tone): \"[dialogue]\""
     - Visual descriptions: Plain text describing what we see
  
  7. ABSOLUTELY FORBIDDEN - DO NOT WRITE:
     - "comic-panel-number" as text anywhere
     - "SFX:" before sound effects
     - "NARRATION:" before narration
     - ">" symbols anywhere
     - Quotes around panel numbers
     - Any formatting markers or prefixes
  
  8. Keep it engaging and visual, like a real comic book page.
  9. Each scene should have 2-5 panels depending on complexity.
  10. Be descriptive but concise - paint the picture with words.
  11. Write clean, simple text - no formatting markers, no prefixes, just content.`;

  // Prepare scene data (simplified, no technical details)
  const scenesData = scenes.map((scene, index) => ({
    sequence: index + 1,
    sceneId: scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`,
    visualDirection: scene.enhancedPrompt,
    dialogue: scene.directorSettings.dialogue || '',
    context: scene.contextSummary || ''
  }));

  const prompt = `
    PROJECT:
    Title: ${projectContext.title || 'Untitled'}
    Genre: ${projectContext.genre || 'General'}
    Plot: ${projectContext.plotSummary || ''}
    Characters: ${projectContext.characters || ''}
    
    SCENES TO CONVERT:
    ${scenesData.map(s => `
      Scene ${s.sequence} (${s.sceneId}):
      Visual: ${s.visualDirection.substring(0, 500)}
      ${s.dialogue ? `Dialogue: "${s.dialogue}"` : ''}
      ${s.context ? `Context: ${s.context}` : ''}
    `).join('\n---\n')}
    
    Convert these scenes into comic book format. Remove all technical details.
    Focus on visual storytelling, dialogue with tone, and comic book conventions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8, // More creative
        maxOutputTokens: 8000
      }
    });

    const comicContent = response.text;
    
    // Note: HTML generation with images requires database access
    // For portable version, return simple HTML wrapper
    const htmlContent = generateSimpleComicHTML(projectContext, comicContent);

    return { comicContent, htmlContent };
  } catch (error: any) {
    console.error("Error generating comic content:", error);
    throw error;
  }
};

/**
 * Generate simple HTML version of comic content (portable version without DB)
 * For full HTML with images, implement your own version using your database
 */
function generateSimpleComicHTML(
  projectContext: StoryContext,
  comicContent: string
): string {
  // Simple HTML wrapper for comic content
  // For full image support, implement your own version using your database
  const coverImageUrl = projectContext.coverImageUrl || '';
  
  // Clean comic content
  let html = comicContent
    .replace(/"comic-panel-number"/gi, '')
    .replace(/SFX:\s*/gi, '')
    .replace(/NARRATION:\s*/gi, '')
    .replace(/S\s*cene/gi, 'Scene');
  
  // Convert to basic HTML format
  html = html
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.match(/^PANEL\s+\d+/i)) {
        return `<div class="comic-panel-header">${trimmed}</div>`;
      }
      if (trimmed.match(/^Scene\s+\d+/i)) {
        return `<div class="comic-scene-header">${trimmed}</div>`;
      }
      if (trimmed.match(/^[A-Z]{3,}[!?.]?$/)) {
        return `<div class="sound-effect">${trimmed}</div>`;
      }
      if (trimmed.match(/^[A-Z][a-zA-Z\s]+\([^)]+\):\s*"/)) {
        return `<div class="speech-bubble">${trimmed}</div>`;
      }
      return `<p>${trimmed}</p>`;
    })
    .filter(line => line)
    .join('\n');
  
  // Note: The original function had database dependencies for images
  // This simplified version doesn't include image fetching
  // For full functionality, implement your own version
  
  // Generate cover page HTML
  const coverPage = `
    <div class="comic-cover-page">
      <div class="cover-image-container">
        ${coverImageUrl ? `<img src="${coverImageUrl}" alt="Cover" class="cover-image" />` : ''}
        <div class="cover-overlay"></div>
      </div>
      <div class="cover-content">
        <div class="cover-title">${projectContext.title || 'Untitled'}</div>
        ${projectContext.genre ? `<div class="cover-genre">${projectContext.genre}</div>` : ''}
        ${projectContext.plotSummary ? `<div class="cover-tagline">${projectContext.plotSummary.substring(0, 150)}${projectContext.plotSummary.length > 150 ? '...' : ''}</div>` : ''}
      </div>
    </div>
  `;
  
  // Return simple HTML wrapper
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${projectContext.title} - Comic Book</title>
  <style>
    body {
      font-family: 'Comic Sans MS', cursive, sans-serif;
      background: #f5e6d3;
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
    }
    .comic-scene-header {
      font-size: 2em;
      font-weight: bold;
      margin: 30px 0 15px;
      color: #8B0000;
    }
    .comic-panel-header {
      font-size: 1.5em;
      font-weight: bold;
      margin: 20px 0 10px;
      color: #1E88E5;
    }
    .speech-bubble {
      background: #fff;
      border: 3px solid #000;
      border-radius: 20px;
      padding: 15px;
      margin: 15px 0;
      max-width: 80%;
    }
    .sound-effect {
      font-size: 3em;
      font-weight: bold;
      color: #FF0000;
      text-align: center;
      margin: 20px 0;
      transform: rotate(-5deg);
    }
    .comic-cover-page {
      text-align: center;
      padding: 40px;
      background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
      color: #FFD700;
      margin-bottom: 40px;
    }
    .cover-title {
      font-size: 4em;
      font-weight: bold;
      text-shadow: 4px 4px 0px #000;
    }
  </style>
</head>
<body>
  ${coverPage}
  <div class="comic-content">
    ${html}
  </div>
</body>
</html>
  `;
}
