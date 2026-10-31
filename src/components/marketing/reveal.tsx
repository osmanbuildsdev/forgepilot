"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

// Fires once when the element scrolls into view.
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Fades content up on first view. The hidden state lives in CSS and only
// applies when scripting is on and the user allows motion.
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  style?: CSSProperties;
}) {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={`${className} ${inView ? "is-visible" : ""}`}
      style={{ ...style, "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

// Counts up to `value` when visible. Server render and reduced motion show
// the final number.
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!inView) {
      setShown(0);
      return;
    }
    // Timer rather than rAF so the final value lands even in background tabs.
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 900);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t === 1) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [inView, value]);
  return (
    <span ref={ref}>
      {shown}
      {suffix}
    </span>
  );
}
