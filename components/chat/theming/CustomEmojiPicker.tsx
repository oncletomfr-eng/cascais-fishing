'use client';

/**
 * Custom Emoji Picker Component for Fishing Chat
 * Task 20.2: Custom Fishing Emojis and Reactions
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { 
  FISHING_EMOJI_SET, 
  FISHING_EMOJI_CATEGORIES, 
  FISHING_QUICK_REACTIONS,
  FishingEmoji,
  FishingEmojiUtils 
} from './FishingEmojiSet';

export interface CustomEmojiPickerProps {
  onEmojiSelect: (emoji: string, emojiData?: FishingEmoji) => void;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  showQuickReactions?: boolean;
  position?: 'top' | 'bottom';
}

export function CustomEmojiPicker({
  onEmojiSelect,
  isOpen,
  onClose,
  className = '',
  showQuickReactions = true,
  position = 'top'
}: CustomEmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState('fishing');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmojis, setFilteredEmojis] = useState<FishingEmoji[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle search filtering
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = FishingEmojiUtils.searchEmojis(searchQuery);
      setFilteredEmojis(results);
    } else {
      const categoryEmojis = FishingEmojiUtils.getEmojisByCategory(activeCategory);
      setFilteredEmojis(categoryEmojis);
    }
  }, [searchQuery, activeCategory]);

  // Handle emoji selection
  const handleEmojiClick = (emoji: FishingEmoji) => {
    onEmojiSelect(emoji.native, emoji);
    onClose();
  };

  // Handle quick reaction click
  const handleQuickReactionClick = (emoji: string) => {
    onEmojiSelect(emoji);
    onClose();
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={pickerRef}
      className={`custom-emoji-picker ${position === 'top' ? 'picker-top' : 'picker-bottom'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="picker-header">
        <div className="picker-title">
          <span className="emoji-icon">🎣</span>
          <span>Fishing Emojis</span>
        </div>
        <button 
          onClick={onClose}
          className="close-button"
          aria-label="Close emoji picker"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="search-container">
        <Search size={16} className="search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search emojis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="clear-search"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Quick Reactions */}
      {showQuickReactions && !searchQuery && (
        <div className="quick-reactions-section">
          <div className="section-title">Quick Reactions</div>
          <div className="quick-reactions-grid">
            {FISHING_QUICK_REACTIONS.map((reaction) => (
              <button
                key={reaction.id}
                onClick={() => handleQuickReactionClick(reaction.emoji)}
                className="quick-reaction-btn"
                title={reaction.label}
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {!searchQuery && (
        <div className="categories-container">
          <div className="categories-tabs">
            {FISHING_EMOJI_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
                title={category.name}
              >
                <span className="category-icon">
                  {category.emojis[0]?.native || '🎣'}
                </span>
                <span className="category-name">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emojis Grid */}
      <div className="emojis-container">
        {searchQuery && (
          <div className="section-title">
            Search Results ({filteredEmojis.length})
          </div>
        )}
        
        <div className="emojis-grid">
          {filteredEmojis.length > 0 ? (
            filteredEmojis.map((emoji) => (
              <button
                key={emoji.id}
                onClick={() => handleEmojiClick(emoji)}
                className="emoji-button"
                title={`${emoji.name} - ${emoji.keywords.join(', ')}`}
              >
                <span className="emoji-char">{emoji.native}</span>
              </button>
            ))
          ) : (
            <div className="no-results">
              <span className="no-results-icon">🔍</span>
              <span className="no-results-text">
                {searchQuery ? 'No emojis found' : 'No emojis in this category'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="picker-footer">
        <div className="footer-info">
          <span className="emoji-count">
            {filteredEmojis.length} emoji{filteredEmojis.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// Enhanced Emoji Button component for integration with Stream Chat
export interface EmojiButtonProps {
  onTogglePicker: () => void;
  isPickerOpen: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmojiButton({
  onTogglePicker,
  isPickerOpen,
  className = '',
  size = 'md'
}: EmojiButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base', 
    lg: 'w-12 h-12 text-lg'
  };

  return (
    <button
      onClick={onTogglePicker}
      className={`emoji-toggle-btn ${sizeClasses[size]} ${isPickerOpen ? 'active' : ''} ${className}`}
      title="Add fishing emoji"
      aria-label="Toggle emoji picker"
    >
      <span className="emoji-icon">
        {isPickerOpen ? '❌' : '🎣'}
      </span>
    </button>
  );
}

// Hook for managing emoji picker state
export function useEmojiPicker() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(prev => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return {
    isOpen,
    toggle,
    open,
    close
  };
}
