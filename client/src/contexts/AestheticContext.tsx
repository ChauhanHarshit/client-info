import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AestheticTheme {
  id: string;
  name: string;
  backgroundGradient: string;
  headerGradient: string;
  accentIcon: string;
  headerColor: string;
  buttonGradient: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  shadowColor: string;
}

const defaultThemes: Record<string, AestheticTheme> = {
  'spring-bloom': {
    id: 'spring-bloom',
    name: 'Spring Bloom',
    backgroundGradient: 'from-pink-300 to-pink-100',
    headerGradient: 'from-pink-400 to-pink-200',
    accentIcon: '🌸',
    headerColor: 'text-pink-800',
    buttonGradient: 'from-pink-400 to-fuchsia-500',
    cardBackground: 'bg-white/90',
    textPrimary: 'text-gray-800',
    textSecondary: 'text-pink-600',
    accentColor: 'text-pink-700',
    shadowColor: 'shadow-pink-200/50'
  },
  'ocean-breeze': {
    id: 'ocean-breeze', 
    name: 'Ocean Breeze',
    backgroundGradient: 'from-blue-300 to-cyan-100',
    headerGradient: 'from-blue-400 to-cyan-200',
    accentIcon: '🌊',
    headerColor: 'text-blue-800',
    buttonGradient: 'from-blue-400 to-cyan-500',
    cardBackground: 'bg-white/90',
    textPrimary: 'text-gray-800',
    textSecondary: 'text-blue-600',
    accentColor: 'text-blue-700',
    shadowColor: 'shadow-blue-200/50'
  },
  'sunset-glow': {
    id: 'sunset-glow',
    name: 'Sunset Glow', 
    backgroundGradient: 'from-orange-300 to-yellow-100',
    headerGradient: 'from-orange-400 to-yellow-200',
    accentIcon: '🌅',
    headerColor: 'text-orange-800',
    buttonGradient: 'from-orange-400 to-yellow-500',
    cardBackground: 'bg-white/90',
    textPrimary: 'text-gray-800',
    textSecondary: 'text-orange-600',
    accentColor: 'text-orange-700',
    shadowColor: 'shadow-orange-200/50'
  },
  'purple-dream': {
    id: 'purple-dream',
    name: 'Purple Dream',
    backgroundGradient: 'from-purple-300 to-indigo-100',
    headerGradient: 'from-purple-400 to-indigo-200',
    accentIcon: '💜',
    headerColor: 'text-purple-800',
    buttonGradient: 'from-purple-400 to-indigo-500',
    cardBackground: 'bg-white/90',
    textPrimary: 'text-gray-800',
    textSecondary: 'text-purple-600',
    accentColor: 'text-purple-700',
    shadowColor: 'shadow-purple-200/50'
  }
};

interface AestheticContextValue {
  currentTheme: AestheticTheme;
  themes: Record<string, AestheticTheme>;
  setTheme: (themeId: string) => void;
  isLoading: boolean;
}

const AestheticContext = createContext<AestheticContextValue | undefined>(undefined);

export function AestheticProvider({ children }: { children: React.ReactNode }) {
  const [currentThemeId, setCurrentThemeId] = useState<string>('spring-bloom');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('creator-aesthetic-theme');
    if (savedTheme && defaultThemes[savedTheme]) {
      setCurrentThemeId(savedTheme);
    }
    setIsLoading(false);
  }, []);

  const setTheme = (themeId: string) => {
    if (defaultThemes[themeId]) {
      setCurrentThemeId(themeId);
      localStorage.setItem('creator-aesthetic-theme', themeId);
    }
  };

  const currentTheme = defaultThemes[currentThemeId];

  return (
    <AestheticContext.Provider 
      value={{ 
        currentTheme, 
        themes: defaultThemes, 
        setTheme, 
        isLoading 
      }}
    >
      {children}
    </AestheticContext.Provider>
  );
}

export function useAesthetic() {
  const context = useContext(AestheticContext);
  if (context === undefined) {
    throw new Error('useAesthetic must be used within an AestheticProvider');
  }
  return context;
}