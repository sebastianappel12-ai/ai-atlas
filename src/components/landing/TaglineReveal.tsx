"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The tagline reveal: words start muted (~30% opacity) and turn to full color one at a time,
 * in reading order, as they cross a trigger line. One IntersectionObserver for all words.
 */
export function TaglineReveal({ lines }: { lines: string[] }) {
  const words = lines.flatMap((l, li) => l.split(" ").map((w, wi) => ({ w, li, key: `${li}-${wi}` })));
  const [lit, setLit] = useState<Set<string>>(new Set());
  const root = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLSpanElement>("[data-word]");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => {
        const on = entries.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.word!);
        if (on.length) setLit((prev) => new Set([...prev, ...on]));
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 1 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <h2 ref={root} className="mx-auto max-w-[680px] text-3xl font-semibold tracking-tight sm:text-5xl">
      {lines.map((_, li) => (
        <span key={li} className="block">
          {words
            .filter((x) => x.li === li)
            .map((x) => (
              <span
                key={x.key}
                data-word={x.key}
                className="transition-opacity duration-500 ease-base"
                style={{ opacity: lit.has(x.key) ? 1 : 0.3 }}
              >
                {x.w}{" "}
              </span>
            ))}
        </span>
      ))}
    </h2>
  );
}
