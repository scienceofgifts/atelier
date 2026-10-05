import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeId = 'editorial' | 'cloud' | 'library' | 'mist' | 'midnight';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  previewBg: string;
  previewSurface: string;
  previewAccent: string;
  previewText: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Warm alabaster canvas, literary type, dark elegant text.',
    previewBg: '#FAF8F5',
    previewSurface: '#FFFFFF',
    previewAccent: '#292524',
    previewText: '#1C1917',
  },
  {
    id: 'cloud',
    name: 'Cloud',
    description: 'Clean cool blue-gray background, white cards, subtle blue accent.',
    previewBg: '#F1F4F7',
    previewSurface: '#FFFFFF',
    previewAccent: '#2563EB',
    previewText: '#1E293B',
  },
  {
    id: 'library',
    name: 'Library',
    description: 'Warm parchment background, cream surfaces, bronze accent.',
    previewBg: '#F5F1E8',
    previewSurface: '#FCFAF5',
    previewAccent: '#78350F',
    previewText: '#2A2421',
  },
  {
    id: 'mist',
    name: 'Mist',
    description: 'Calm, airy blue-gray canvas, seafoam/teal accent.',
    previewBg: '#EEF2F5',
    previewSurface: '#FFFFFF',
    previewAccent: '#0D9488',
    previewText: '#1E293B',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Sophisticated dark reading environment with deep charcoal navy.',
    previewBg: '#12161F',
    previewSurface: '#1A202C',
    previewAccent: '#38BDF8',
    previewText: '#E2E8F0',
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: ThemeConfig[];
  activeThemeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY_THEME = 'atelier_theme_v1';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_THEME) as ThemeId;
      if (stored && THEMES.some(t => t.id === stored)) {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
    }
    return 'editorial';
  });

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const activeThemeConfig = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, activeThemeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
