import React, { createContext, useContext } from 'react';

const SplashVisibilityContext = createContext<boolean>(false);

export function SplashVisibilityProvider({
  showSplash,
  children,
}: {
  showSplash: boolean;
  children: React.ReactNode;
}) {
  return <SplashVisibilityContext.Provider value={showSplash}>{children}</SplashVisibilityContext.Provider>;
}

export function useSplashVisible() {
  return useContext(SplashVisibilityContext);
}
