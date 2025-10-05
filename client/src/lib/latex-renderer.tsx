import { useEffect } from "react";
import renderMathInElement from "katex/contrib/auto-render";

export function useLatexRenderer() {
  useEffect(() => {
    try {
      renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
        errorColor: "#cc0000",
        strict: false,
      });
    } catch (err) {
      // Silently ignore rendering errors to avoid crashing the app
      console.error("LaTeX render error", err);
    }
  }, []);

  return {
    renderMath: () => {
      try {
        renderMathInElement(document.body, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
          ],
          throwOnError: false,
          errorColor: "#cc0000",
          strict: false,
        });
      } catch (err) {
        console.error("LaTeX render error", err);
      }
    },
  };
}

export function LatexRenderer({ children }: { children: React.ReactNode }) {
  useLatexRenderer();
  return <>{children}</>;
}
