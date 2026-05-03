import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

type ChartContainerProps = {
  children: ReactNode;
  className?: string;
  minHeight?: number;
};

export function ChartContainer({
  children,
  className = "",
  minHeight = 300,
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      setIsReady(width > 0 && height > 0);
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full min-w-0 ${className}`.trim()}
      style={{ minHeight }}
    >
      {isReady ? (
        <ResponsiveContainer width="100%" height="100%" minHeight={minHeight}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
