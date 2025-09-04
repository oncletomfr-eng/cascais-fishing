'use client';

/**
 * Fishing Emoji Set Component
 * Task 20.2: Custom Fishing Emojis and Reactions
 * 
 * Taking the role of UI/UX Designer specializing in Chat Gamification
 */

import React from 'react';
import { EmojiData, BaseEmoji } from 'emoji-mart';

// Fishing-themed emoji data
export interface FishingEmoji extends BaseEmoji {
  id: string;
  name: string;
  colons: string;
  text: string;
  emoticons: string[];
  skin: number;
  native: string;
  category: 'fishing' | 'marine' | 'weather' | 'catch' | 'gear' | 'celebration';
  keywords: string[];
}

// Custom fishing emoji set
export const FISHING_EMOJI_SET: FishingEmoji[] = [
  // Fishing Activities
  {
    id: 'fishing_rod',
    name: 'Fishing Rod',
    colons: ':fishing_rod:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🎣',
    category: 'fishing',
    keywords: ['fishing', 'rod', 'catch', 'angling'],
    unified: '1F3A3',
    sheet_x: 7,
    sheet_y: 51
  },
  {
    id: 'fish_catch',
    name: 'Fish',
    colons: ':fish:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🐟',
    category: 'catch',
    keywords: ['fish', 'catch', 'seafood', 'marine'],
    unified: '1F41F',
    sheet_x: 12,
    sheet_y: 31
  },
  {
    id: 'fishing_net',
    name: 'Fishing Net',
    colons: ':fishing_net:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🕸️',
    category: 'gear',
    keywords: ['net', 'fishing', 'catch', 'web'],
    unified: '1F578-FE0F',
    sheet_x: 25,
    sheet_y: 4
  },
  {
    id: 'fishing_hook',
    name: 'Hook',
    colons: ':hook:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🪝',
    category: 'gear',
    keywords: ['hook', 'fishing', 'catch', 'bait'],
    unified: '1FA9D',
    sheet_x: 52,
    sheet_y: 47
  },

  // Marine Life
  {
    id: 'tropical_fish',
    name: 'Tropical Fish',
    colons: ':tropical_fish:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🐠',
    category: 'marine',
    keywords: ['tropical', 'fish', 'colorful', 'reef'],
    unified: '1F420',
    sheet_x: 12,
    sheet_y: 32
  },
  {
    id: 'blowfish',
    name: 'Blowfish',
    colons: ':blowfish:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🐡',
    category: 'marine',
    keywords: ['blowfish', 'puffer', 'fish', 'toxic'],
    unified: '1F421',
    sheet_x: 12,
    sheet_y: 33
  },
  {
    id: 'shark',
    name: 'Shark',
    colons: ':shark:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🦈',
    category: 'marine',
    keywords: ['shark', 'predator', 'ocean', 'big_catch'],
    unified: '1F988',
    sheet_x: 42,
    sheet_y: 40
  },
  {
    id: 'octopus',
    name: 'Octopus',
    colons: ':octopus:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🐙',
    category: 'marine',
    keywords: ['octopus', 'tentacles', 'sea', 'intelligent'],
    unified: '1F419',
    sheet_x: 12,
    sheet_y: 25
  },
  {
    id: 'shrimp',
    name: 'Shrimp',
    colons: ':shrimp:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🦐',
    category: 'marine',
    keywords: ['shrimp', 'prawn', 'crustacean', 'bait'],
    unified: '1F990',
    sheet_x: 42,
    sheet_y: 48
  },
  {
    id: 'lobster',
    name: 'Lobster',
    colons: ':lobster:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🦞',
    category: 'marine',
    keywords: ['lobster', 'crustacean', 'claws', 'premium'],
    unified: '1F99E',
    sheet_x: 43,
    sheet_y: 4
  },

  // Weather & Environment
  {
    id: 'ocean_wave',
    name: 'Ocean Wave',
    colons: ':ocean:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🌊',
    category: 'weather',
    keywords: ['ocean', 'wave', 'water', 'sea'],
    unified: '1F30A',
    sheet_x: 5,
    sheet_y: 42
  },
  {
    id: 'sun',
    name: 'Sun',
    colons: ':sunny:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '☀️',
    category: 'weather',
    keywords: ['sun', 'sunny', 'clear', 'bright'],
    unified: '2600-FE0F',
    sheet_x: 50,
    sheet_y: 39
  },
  {
    id: 'cloud_rain',
    name: 'Rain Cloud',
    colons: ':rain_cloud:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🌧️',
    category: 'weather',
    keywords: ['rain', 'cloud', 'storm', 'weather'],
    unified: '1F327-FE0F',
    sheet_x: 6,
    sheet_y: 7
  },
  {
    id: 'wind_face',
    name: 'Wind',
    colons: ':wind_face:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '💨',
    category: 'weather',
    keywords: ['wind', 'breeze', 'air', 'movement'],
    unified: '1F4A8',
    sheet_x: 20,
    sheet_y: 40
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    colons: ':sunrise:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🌅',
    category: 'weather',
    keywords: ['sunrise', 'dawn', 'morning', 'early'],
    unified: '1F305',
    sheet_x: 5,
    sheet_y: 37
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colons: ':sunset:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🌇',
    category: 'weather',
    keywords: ['sunset', 'dusk', 'evening', 'golden_hour'],
    unified: '1F307',
    sheet_x: 5,
    sheet_y: 39
  },

  // Equipment & Gear  
  {
    id: 'fishing_boat',
    name: 'Fishing Boat',
    colons: ':boat:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🚤',
    category: 'gear',
    keywords: ['boat', 'fishing', 'speedboat', 'vessel'],
    unified: '1F6A4',
    sheet_x: 34,
    sheet_y: 36
  },
  {
    id: 'anchor',
    name: 'Anchor',
    colons: ':anchor:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '⚓',
    category: 'gear',
    keywords: ['anchor', 'boat', 'ship', 'harbor'],
    unified: '2693',
    sheet_x: 53,
    sheet_y: 51
  },
  {
    id: 'compass',
    name: 'Compass',
    colons: ':compass:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🧭',
    category: 'gear',
    keywords: ['compass', 'navigation', 'direction', 'north'],
    unified: '1F9ED',
    sheet_x: 51,
    sheet_y: 37
  },
  {
    id: 'life_preserver',
    name: 'Life Preserver',
    colons: ':life_preserver:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🛟',
    category: 'gear',
    keywords: ['safety', 'life', 'preserver', 'rescue'],
    unified: '1F6DF',
    sheet_x: 36,
    sheet_y: 31
  },
  {
    id: 'fishing_tackle',
    name: 'Tackle Box',
    colons: ':tackle_box:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🧰',
    category: 'gear',
    keywords: ['tackle', 'box', 'tools', 'equipment'],
    unified: '1F9F0',
    sheet_x: 51,
    sheet_y: 40
  },

  // Celebrations & Success
  {
    id: 'trophy',
    name: 'Trophy',
    colons: ':trophy:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🏆',
    category: 'celebration',
    keywords: ['trophy', 'winner', 'achievement', 'success'],
    unified: '1F3C6',
    sheet_x: 8,
    sheet_y: 6
  },
  {
    id: 'medal',
    name: 'Medal',
    colons: ':medal:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🏅',
    category: 'celebration',
    keywords: ['medal', 'award', 'achievement', 'recognition'],
    unified: '1F3C5',
    sheet_x: 8,
    sheet_y: 5
  },
  {
    id: 'party_popper',
    name: 'Party Popper',
    colons: ':tada:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🎉',
    category: 'celebration',
    keywords: ['party', 'celebration', 'congratulations', 'confetti'],
    unified: '1F389',
    sheet_x: 7,
    sheet_y: 9
  },
  {
    id: 'clapping',
    name: 'Clapping Hands',
    colons: ':clap:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '👏',
    category: 'celebration',
    keywords: ['clap', 'applause', 'congratulations', 'good_job'],
    unified: '1F44F',
    sheet_x: 14,
    sheet_y: 15
  },
  {
    id: 'fire',
    name: 'Fire',
    colons: ':fire:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '🔥',
    category: 'celebration',
    keywords: ['fire', 'hot', 'amazing', 'excellent'],
    unified: '1F525',
    sheet_x: 23,
    sheet_y: 5
  },
  {
    id: 'thumbs_up',
    name: 'Thumbs Up',
    colons: ':+1:',
    text: '',
    emoticons: [],
    skin: 1,
    native: '👍',
    category: 'celebration',
    keywords: ['thumbs_up', 'like', 'good', 'approve'],
    unified: '1F44D',
    sheet_x: 14,
    sheet_y: 13
  }
];

// Quick reaction shortcuts for fishing chat
export const FISHING_QUICK_REACTIONS = [
  { emoji: '🎣', label: 'Fishing', id: 'fishing' },
  { emoji: '🐟', label: 'Nice catch!', id: 'nice_catch' },
  { emoji: '🏆', label: 'Winner!', id: 'winner' },
  { emoji: '👏', label: 'Applause', id: 'applause' },
  { emoji: '🔥', label: 'Amazing!', id: 'fire' },
  { emoji: '😍', label: 'Love it!', id: 'love' },
  { emoji: '💪', label: 'Strong!', id: 'strong' },
  { emoji: '🌊', label: 'Perfect conditions', id: 'good_conditions' },
  { emoji: '☀️', label: 'Great weather', id: 'sunny' },
  { emoji: '🚤', label: 'Let\'s go!', id: 'lets_go' },
  { emoji: '📍', label: 'Great spot!', id: 'good_location' },
  { emoji: '⚓', label: 'Anchored', id: 'anchored' }
];

// Fishing-specific emoji categories
export const FISHING_EMOJI_CATEGORIES = [
  {
    id: 'fishing',
    name: 'Fishing',
    emojis: FISHING_EMOJI_SET.filter(e => e.category === 'fishing')
  },
  {
    id: 'marine',
    name: 'Marine Life', 
    emojis: FISHING_EMOJI_SET.filter(e => e.category === 'marine')
  },
  {
    id: 'gear',
    name: 'Gear & Equipment',
    emojis: FISHING_EMOJI_SET.filter(e => e.category === 'gear')
  },
  {
    id: 'weather',
    name: 'Weather & Conditions',
    emojis: FISHING_EMOJI_SET.filter(e => e.category === 'weather')
  },
  {
    id: 'celebration',
    name: 'Celebrations',
    emojis: FISHING_EMOJI_SET.filter(e => e.category === 'celebration')
  },
  {
    id: 'catch',
    name: 'Catch & Success',
    emojis: FISHING_EMOJI_SET.filter(e => e.category === 'catch')
  }
];

// Component for rendering quick reactions
export interface FishingQuickReactionsProps {
  onReactionClick: (reactionId: string, emoji: string) => void;
  className?: string;
}

export function FishingQuickReactions({
  onReactionClick,
  className = ''
}: FishingQuickReactionsProps) {
  return (
    <div className={`fishing-quick-reactions ${className}`}>
      <div className="reaction-grid">
        {FISHING_QUICK_REACTIONS.map((reaction) => (
          <button
            key={reaction.id}
            onClick={() => onReactionClick(reaction.id, reaction.emoji)}
            className="reaction-button"
            title={reaction.label}
          >
            <span className="reaction-emoji">{reaction.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Styles for the quick reactions (add to theme CSS)
export const FISHING_REACTIONS_STYLES = `
.fishing-quick-reactions {
  padding: 12px;
  background: oklch(0.98 0.01 85);
  border-top: 2px solid oklch(0.92 0 0);
  border-radius: 0 0 12px 12px;
}

.reaction-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.reaction-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: oklch(1 0 0);
  border: 2px solid oklch(0.92 0 0);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.reaction-button:hover {
  transform: scale(1.1);
  background: oklch(0.5 0.15 240 / 0.1);
  border-color: oklch(0.5 0.15 240);
  box-shadow: 0 2px 8px oklch(0.5 0.15 240 / 0.2);
}

.reaction-button:active {
  transform: scale(0.95);
}

.reaction-emoji {
  font-size: 20px;
  line-height: 1;
  filter: saturate(1.2);
}

.reaction-button:hover .reaction-emoji {
  animation: reactionBounce 0.3s ease;
}

@keyframes reactionBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .reaction-grid {
    gap: 6px;
  }
  
  .reaction-button {
    width: 36px;
    height: 36px;
  }
  
  .reaction-emoji {
    font-size: 18px;
  }
}
`;

// Utility functions for emoji management
export const FishingEmojiUtils = {
  // Get emoji by ID
  getEmojiById: (id: string): FishingEmoji | undefined => {
    return FISHING_EMOJI_SET.find(emoji => emoji.id === id);
  },

  // Get emojis by category  
  getEmojisByCategory: (category: string): FishingEmoji[] => {
    return FISHING_EMOJI_SET.filter(emoji => emoji.category === category);
  },

  // Search emojis by keywords
  searchEmojis: (query: string): FishingEmoji[] => {
    const lowercaseQuery = query.toLowerCase();
    return FISHING_EMOJI_SET.filter(emoji =>
      emoji.name.toLowerCase().includes(lowercaseQuery) ||
      emoji.keywords.some(keyword => keyword.toLowerCase().includes(lowercaseQuery))
    );
  },

  // Convert fishing emoji to unicode
  toUnicode: (emoji: FishingEmoji): string => {
    return emoji.native;
  },

  // Check if emoji is fishing-related
  isFishingEmoji: (emojiNative: string): boolean => {
    return FISHING_EMOJI_SET.some(emoji => emoji.native === emojiNative);
  },

  // Get suggested reactions for fishing context
  getSuggestedReactions: (context: 'catch' | 'weather' | 'gear' | 'celebration' = 'catch'): string[] => {
    const contextReactions: Record<string, string[]> = {
      catch: ['🎣', '🐟', '🏆', '👏', '🔥'],
      weather: ['🌊', '☀️', '🌧️', '💨', '⚓'],
      gear: ['🎣', '🚤', '🧰', '🪝', '🕸️'],
      celebration: ['🏆', '🏅', '🎉', '👏', '🔥']
    };
    return contextReactions[context] || contextReactions.catch;
  }
};

export default FishingEmojiUtils;
