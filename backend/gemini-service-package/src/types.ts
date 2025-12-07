export enum TechnicalStyle {
  CINEMATIC = 'Cinematic',
  DOCUMENTARY = 'Documentary',
  ANIMATION = '3D Animation',
  VINTAGE = 'Vintage Film',
}

export interface DirectorSettings {
  customSceneId: string; // User defined ID (e.g. SC-05)
  lens: string;
  angle: string;
  lighting: string;
  movement: string;
  zoom: string; // Camera Zoom
  sound: string;
  dialogue: string; // Spoken lines
  stuntInstructions: string; // Specific instructions for action/stunts
  physicsFocus: boolean;
  style: TechnicalStyle;
  transition: string;
}

export interface Scene {
  id: string;
  sequenceNumber: number;
  rawIdea: string;
  enhancedPrompt: string; // The "Director" refined prompt
  status: 'planning' | 'generating' | 'completed' | 'failed';
  directorSettings: DirectorSettings;
  contextSummary: string; // What happened in this scene (for next scene context)
  thumbnailUrl?: string; // URL to primary image thumbnail for quick access
  is_ai_generated?: boolean; // Indicates if content was AI-generated
}

export interface StoryContext {
  id: string; // Unique Project ID
  lastUpdated: number; // Timestamp
  title: string;
  genre: string;
  plotSummary: string;
  characters: string;
  initialContext?: string; // Optional: Description of the last clip to resume from
  coverImageUrl?: string; // Project cover image URL (user-uploaded or auto-generated character composite)
  contentType?: string; // Content type: 'film', 'news', 'sports', 'documentary', etc.
}

