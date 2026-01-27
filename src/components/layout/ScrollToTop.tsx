import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls window to top on route changes.
 * This ensures navigation to new pages starts at the top.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
