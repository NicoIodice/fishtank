import { useState, useEffect } from "react";

interface Breakpoints {
  desktop: boolean; // ≥ 1024px
  mid: boolean; // 768–1023px
  midNarrow: boolean; // 640–767px
  mobile: boolean; // < 768px
}

export function useBreakpoint(): Breakpoints {
  const getBreakpoints = (): Breakpoints => {
    const w = window.innerWidth;
    return {
      desktop: w >= 1024,
      mid: w >= 768 && w < 1024,
      midNarrow: w >= 640 && w < 768,
      mobile: w < 768,
    };
  };

  const [bp, setBp] = useState<Breakpoints>(getBreakpoints);

  useEffect(() => {
    const handler = () => setBp(getBreakpoints());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return bp;
}
