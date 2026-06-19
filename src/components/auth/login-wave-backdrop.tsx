import { useCallback, useId, useRef, useState } from "react";

const SPHERES = [
  { id: "1", wrapClass: "login-sphere-wrap--1", sphereClass: "login-sphere--1", parallax: 28 },
  { id: "2", wrapClass: "login-sphere-wrap--2", sphereClass: "login-sphere--2", parallax: 20 },
  { id: "3", wrapClass: "login-sphere-wrap--3", sphereClass: "login-sphere--3", parallax: 32 },
] as const;

type Offset = { x: number; y: number };

const ZERO: Offset = { x: 0, y: 0 };

/** Nền sóng ultramarine + sphere 3D có thể kéo và parallax chuột */
export function LoginWaveBackdrop() {
  const uid = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState<Offset>(ZERO);
  const [dragOffsets, setDragOffsets] = useState<Record<string, Offset>>({
    "1": ZERO,
    "2": ZERO,
    "3": ZERO,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origin: Offset;
  } | null>(null);

  const onContainerMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setParallax({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  }, []);

  const onContainerMouseLeave = useCallback(() => {
    if (!dragRef.current) setParallax(ZERO);
  }, []);

  const onSpherePointerDown = useCallback(
    (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const origin = dragOffsets[id] ?? ZERO;
      dragRef.current = { id, startX: e.clientX, startY: e.clientY, origin };
      setActiveId(id);
    },
    [dragOffsets],
  );

  const onSpherePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setDragOffsets((prev) => ({
      ...prev,
      [drag.id]: {
        x: drag.origin.x + (e.clientX - drag.startX),
        y: drag.origin.y + (e.clientY - drag.startY),
      },
    }));
  }, []);

  const onSpherePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setActiveId(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="login-waves"
      onMouseMove={onContainerMouseMove}
      onMouseLeave={onContainerMouseLeave}
    >
      <svg className="login-waves__svg" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id={`lw-deep-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#001a66" />
            <stop offset="100%" stopColor="#0029d6" />
          </linearGradient>
          <linearGradient id={`lw-mid-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0038ff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1a5cff" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id={`lw-soft-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4d7cff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0038ff" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect width="800" height="900" fill={`url(#lw-deep-${uid})`} />
        <path
          className="login-waves__layer login-waves__layer--1"
          d="M0,520 C180,380 320,620 520,480 C640,390 720,340 800,400 L800,900 L0,900 Z"
          fill={`url(#lw-mid-${uid})`}
        />
        <path
          className="login-waves__layer login-waves__layer--2"
          d="M0,640 C220,520 380,720 580,580 C680,510 750,470 800,520 L800,900 L0,900 Z"
          fill="#0038ff"
          opacity="0.75"
        />
        <path
          className="login-waves__layer login-waves__layer--3"
          d="M0,720 C200,640 400,780 600,680 C700,630 760,600 800,640 L800,900 L0,900 Z"
          fill={`url(#lw-soft-${uid})`}
        />
      </svg>

      <div className="login-spheres">
        {SPHERES.map(({ id, wrapClass, sphereClass, parallax: factor }) => {
          const drag = dragOffsets[id] ?? ZERO;
          const isActive = activeId === id;
          const tx = parallax.x * factor + drag.x;
          const ty = parallax.y * factor + drag.y;

          return (
            <div
              key={id}
              className={[
                "login-sphere-wrap",
                wrapClass,
                isActive && "login-sphere-wrap--active",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ transform: `translate3d(${tx}px, ${ty}px, 0)` }}
              onPointerDown={onSpherePointerDown(id)}
              onPointerMove={onSpherePointerMove}
              onPointerUp={onSpherePointerUp}
              onPointerCancel={onSpherePointerUp}
            >
              <div
                className={["login-sphere", sphereClass, isActive && "login-sphere--active"]
                  .filter(Boolean)
                  .join(" ")}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
