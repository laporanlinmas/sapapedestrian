import { useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';

export function useCurrentTheme(): ThemeMode {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof document !== 'undefined') {
      if (document.documentElement.classList.contains('dark')) return 'dark';
      try {
        const saved = localStorage.getItem('theme') || localStorage.getItem('sipedas_theme');
        if (saved === 'dark' || saved === 'light') return saved;
      } catch {
        // Ignore
      }
    }
    return 'dark';
  });

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    updateTheme();

    // 1. Amati perubahan class 'dark' di elemen <html> secara langsung
    const observer = new MutationObserver(() => {
      updateTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // 2. Dengarkan custom event jika ada trigger sinkronisasi internal
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme?: ThemeMode }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      } else {
        updateTheme();
      }
    };

    // 3. Dengarkan event storage untuk tab/window lain
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme' || e.key === 'sipedas_theme' || e.key === 'sipedas_dark') {
        if (e.newValue === 'dark' || e.newValue === 'light') {
          setTheme(e.newValue);
        } else {
          updateTheme();
        }
      }
    };

    window.addEventListener('themechange', handleThemeChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      observer.disconnect();
      window.removeEventListener('themechange', handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return theme;
}
