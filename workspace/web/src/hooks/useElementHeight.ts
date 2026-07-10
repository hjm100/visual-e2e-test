import { useLayoutEffect, useState, type RefObject } from "react";

/** Observe container height minus a reserved strip (e.g. table header). */
export function useElementHeight(
  ref: RefObject<HTMLElement | null>,
  reserve = 0,
): number {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      setHeight(Math.max(0, el.clientHeight - reserve));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [reserve]);

  return height;
}
