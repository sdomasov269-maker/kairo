"use client";

import { createContext, type ReactNode, useContext } from "react";

const KairoWebGLSurfaceContext = createContext(false);

export function useKairoWebGLSurface() {
  return useContext(KairoWebGLSurfaceContext);
}

export function KairoWebGLSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <KairoWebGLSurfaceContext.Provider value>
      <div className={className}>{children}</div>
    </KairoWebGLSurfaceContext.Provider>
  );
}
