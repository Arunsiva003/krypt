import { useCallback, useRef } from 'react';

const MOBILE_RESULT_QUERY = '(max-width: 899.95px)';

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
);

const isMobileLayout = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.(MOBILE_RESULT_QUERY)?.matches ?? window.innerWidth < 900;
};

const useMobileResultReveal = () => {
  const resultRef = useRef(null);

  const revealResult = useCallback(() => {
    if (!isMobileLayout()) return;

    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }, 80);
  }, []);

  return { resultRef, revealResult };
};

export default useMobileResultReveal;
