import { useLayoutEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';

// Adapted to the shared shell from quandao-rgb/synera-web's LineSidebar:
// route owns selection; only the background travels (280ms, power3.out).
export function useSidebarMotion(scope: RefObject<HTMLElement>, route: string) {
  const marker = useRef<HTMLSpanElement>(null);
  const sync = useRef<(animate?: boolean) => void>();
  useLayoutEffect(() => {
    const nav = scope.current;
    const slider = marker.current;
    if (!nav || !slider) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let positioned = false;
    const position = (animate = false) => {
      const active = nav.querySelector<HTMLElement>('.nav-link.active');
      if (!active || reduced.matches || !active.getClientRects().length) {
        delete nav.dataset.sliding;
        slider.hidden = true;
        positioned = false;
        gsap.killTweensOf(slider);
        return;
      }
      const box = active.getBoundingClientRect();
      const parent = nav.getBoundingClientRect();
      slider.hidden = false;
      gsap.to(slider, {
        x: box.left - parent.left + nav.scrollLeft,
        y: box.top - parent.top + nav.scrollTop,
        width: box.width,
        height: box.height,
        duration: animate && positioned ? 0.28 : 0,
        ease: 'power3.out',
        overwrite: true,
      });
      nav.dataset.sliding = 'true';
      positioned = true;
    };
    sync.current = position;
    const resize = new ResizeObserver(() => position());
    resize.observe(nav);
    nav.querySelectorAll('.nav-link').forEach((link) => resize.observe(link));
    nav.querySelectorAll('.sidebar-nav-group').forEach((group) => resize.observe(group));
    const changed = () => position();
    reduced.addEventListener('change', changed);
    position();
    return () => {
      resize.disconnect();
      reduced.removeEventListener('change', changed);
      gsap.killTweensOf(slider);
      delete nav.dataset.sliding;
      sync.current = undefined;
    };
  }, [scope]);
  useLayoutEffect(() => sync.current?.(true), [route]);
  return marker;
}
