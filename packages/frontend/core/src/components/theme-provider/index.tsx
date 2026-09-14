import { AppThemeService } from '@affine/core/modules/theme';
import { useService } from '@toeverything/infra';
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

const themes = ['dark', 'light'];

function ThemeObserver() {
  const { resolvedTheme } = useTheme();
  const service = useService(AppThemeService);

  useEffect(() => {
    service.appTheme.theme$.next(resolvedTheme);
  }, [resolvedTheme, service.appTheme.theme$]);

  return null;
}

function HostThemeObserver() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const globals = globalThis as typeof globalThis & {
      __HALO_DOCS_COMPILED_PACKAGE__?: boolean;
      __HALO_DOCS_HOST_THEME__?: 'light' | 'dark';
    };
    if (!globals.__HALO_DOCS_COMPILED_PACKAGE__) return;

    const applyHostTheme = (event?: Event) => {
      const eventTheme = (event as CustomEvent<'light' | 'dark'> | undefined)
        ?.detail;
      const theme = eventTheme ?? globals.__HALO_DOCS_HOST_THEME__;
      if (theme === 'light' || theme === 'dark') setTheme(theme);
    };

    applyHostTheme();
    window.addEventListener('halo-docs-theme-change', applyHostTheme);
    return () =>
      window.removeEventListener('halo-docs-theme-change', applyHostTheme);
  }, [setTheme]);

  return null;
}

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  return (
    <NextThemeProvider themes={themes} enableSystem={true}>
      {children}
      <ThemeObserver />
      <HostThemeObserver />
    </NextThemeProvider>
  );
};
