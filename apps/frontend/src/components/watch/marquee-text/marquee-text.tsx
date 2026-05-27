"use client";

import { useEffect, useRef, useState } from "react";

type MarqueeTextProps = {
  text: string;
  className?: string;
};

export default function MarqueeText({ text, className = "" }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      const container = containerRef.current;
      const textEl = textRef.current;
      if (container && textEl) {
        setShouldAnimate(textEl.scrollWidth > container.clientWidth + 1);
      }
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      {shouldAnimate ? (
        <span
          ref={textRef}
          className="inline-block whitespace-nowrap"
          style={{
            animation: `marquee 8s linear infinite`,
          }}
        >
          {text}{"\u00A0\u00A0\u00A0\u00A0"}{text}
        </span>
      ) : (
        <span ref={textRef} className="block truncate whitespace-nowrap">{text}</span>
      )}
    </div>
  );
}
