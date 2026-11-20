import { useLayoutEffect, useState, type RefObject } from 'react';

/** Connect the visible cards, so collapsed branches never leave dangling trunks. */
export function OrganizationLinks({
  canvas,
  revision,
}: {
  canvas: RefObject<HTMLDivElement>;
  revision: unknown;
}) {
  const [drawing, setDrawing] = useState({ width: 0, height: 0, paths: [] as string[] });
  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let frame = 0,
      disposed = false;
    const draw = () => {
      const bounds = element.getBoundingClientRect();
      const cards = [...element.querySelectorAll<HTMLElement>('[data-org-key]')];
      const index = new Map(cards.map((card) => [card.dataset.orgKey, card]));
      const paths: string[] = [];
      for (const card of cards) {
        const parent = index.get(card.dataset.orgParent);
        if (!parent) continue;
        const from = parent.getBoundingClientRect(),
          to = card.getBoundingClientRect();
        const x1 = from.right - bounds.left,
          y1 = from.top + from.height / 2 - bounds.top,
          x2 = to.left - bounds.left,
          y2 = to.top + to.height / 2 - bounds.top,
          middle = (x1 + x2) / 2,
          direction = Math.sign(y2 - y1),
          radius = Math.min(12, Math.abs(y2 - y1) / 2, (x2 - x1) / 4);
        paths.push(
          radius < 1
            ? `M ${x1} ${y1} L ${x2} ${y2}`
            : `M ${x1} ${y1} H ${middle - radius} Q ${middle} ${y1} ${middle} ${y1 + direction * radius} V ${y2 - direction * radius} Q ${middle} ${y2} ${middle + radius} ${y2} H ${x2}`,
        );
      }
      const next = { width: bounds.width, height: bounds.height, paths };
      setDrawing((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next));
    };
    const schedule = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    draw();
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    element
      .querySelectorAll<HTMLElement>('[data-org-key]')
      .forEach((card) => observer.observe(card));
    void document.fonts.ready.then(schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [canvas, revision]);
  return (
    <svg
      className="org-connectors"
      width={drawing.width}
      height={drawing.height}
      aria-hidden="true"
      focusable="false"
    >
      {drawing.paths.map((path, i) => (
        <path key={i} d={path} />
      ))}
    </svg>
  );
}
