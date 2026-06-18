import { useEffect, useRef } from "react";

const TILT_X = 0.42;
const MERIDIAN_COUNT = 16;
const PARALLEL_COUNT = 9;
const GLOBE_SPIN_SPEED = 0.004;
const FRONT_DEPTH = 0.06;
const LIMB_INNER = 0.992;

const satellites: {
  kind: "package" | "hardhat" | "wrench";
  orbitRadius: number;
  inclination: number;
  speed: number;
  phase: number;
}[] = [
  { kind: "package", orbitRadius: 1.28, inclination: 0.48, speed: 0.22, phase: 0 },
  { kind: "hardhat", orbitRadius: 1.34, inclination: 0.35, speed: 0.18, phase: 2.4 },
  { kind: "wrench", orbitRadius: 1.24, inclination: 0.65, speed: 0.26, phase: 4.8 },
];

type PlanetGlobeProps = {
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  spin?: boolean;
  showSatellites?: boolean;
};

const sizeMap = {
  sm: "planet-globe--sm",
  md: "planet-globe--md",
  lg: "planet-globe--lg",
  hero: "planet-globe--hero",
};

type Vec3 = { x: number; y: number; z: number };
type Proj = { sx: number; sy: number; depth: number };

function spherePoint(theta: number, phi: number): Vec3 {
  const cosPhi = Math.cos(phi);
  return {
    x: cosPhi * Math.cos(theta),
    y: Math.sin(phi),
    z: cosPhi * Math.sin(theta),
  };
}

function rotateY(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

function rotateX(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

function viewTransform(p: Vec3): Vec3 {
  return rotateX(p, TILT_X);
}

function project(p: Vec3, cx: number, cy: number, radius: number): Proj {
  return { sx: cx + p.x * radius, sy: cy - p.y * radius, depth: p.z };
}

function orbitPoint(orbitRadius: number, inclination: number, angle: number): Vec3 {
  const x = orbitRadius * Math.cos(angle);
  const y = orbitRadius * Math.sin(angle) * Math.sin(inclination);
  const z = orbitRadius * Math.sin(angle) * Math.cos(inclination);
  return { x, y, z };
}

function isFront(depth: number) {
  return depth > FRONT_DEPTH;
}

function insideDisk(sx: number, sy: number, cx: number, cy: number, radius: number) {
  return Math.hypot(sx - cx, sy - cy) <= radius * LIMB_INNER;
}

function outsideDisk(
  sx: number,
  sy: number,
  cx: number,
  cy: number,
  radius: number,
  margin = 1.045,
) {
  return Math.hypot(sx - cx, sy - cy) > radius * margin;
}

function chordSamplesOk(
  a: Proj,
  b: Proj,
  cx: number,
  cy: number,
  radius: number,
  mode: "grid" | "orbit",
) {
  for (const t of [0.25, 0.5, 0.75]) {
    const mx = a.sx + (b.sx - a.sx) * t;
    const my = a.sy + (b.sy - a.sy) * t;
    const md = a.depth + (b.depth - a.depth) * t;
    if (!isFront(md)) return false;
    if (mode === "grid" && !insideDisk(mx, my, cx, cy, radius)) return false;
    if (mode === "orbit" && !outsideDisk(mx, my, cx, cy, radius)) return false;
  }
  return true;
}

function strokeVisibleArc(
  ctx: CanvasRenderingContext2D,
  points: Proj[],
  cx: number,
  cy: number,
  radius: number,
  mode: "grid" | "orbit" = "grid",
) {
  let open = false;
  let prev: Proj | null = null;

  for (const pt of points) {
    const visible =
      mode === "grid"
        ? isFront(pt.depth) && insideDisk(pt.sx, pt.sy, cx, cy, radius)
        : isFront(pt.depth) && outsideDisk(pt.sx, pt.sy, cx, cy, radius);

    if (visible && prev && open && !chordSamplesOk(prev, pt, cx, cy, radius, mode)) {
      ctx.stroke();
      open = false;
      prev = null;
    }

    if (visible) {
      if (!open) {
        ctx.beginPath();
        ctx.moveTo(pt.sx, pt.sy);
        open = true;
      } else {
        ctx.lineTo(pt.sx, pt.sy);
      }
      prev = pt;
    } else {
      if (open) {
        ctx.stroke();
        open = false;
      }
      prev = null;
    }
  }
  if (open) ctx.stroke();
}

function clipOutsideSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  w: number,
  h: number,
) {
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(cx, cy, radius * 1.035, 0, Math.PI * 2);
  ctx.clip("evenodd");
}

function drawOrbitRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  orbitRadius: number,
  inclination: number,
) {
  const steps = 120;
  const pts: Proj[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const p = viewTransform(orbitPoint(orbitRadius, inclination, angle));
    pts.push(project(p, cx, cy, radius));
  }
  strokeVisibleArc(ctx, pts, cx, cy, radius, "orbit");
}

function drawSatelliteIcon(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  kind: "package" | "hardhat" | "wrench",
) {
  const r = size * 0.42;
  ctx.save();
  ctx.translate(sx, sy);

  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, "rgba(95, 155, 255, 0.95)");
  grad.addColorStop(0.55, "rgba(0, 56, 255, 0.98)");
  grad.addColorStop(1, "rgba(0, 28, 120, 1)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.28);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const icon = size * 0.22;
  if (kind === "package") {
    ctx.strokeRect(-icon, -icon * 0.75, icon * 2, icon * 1.5);
    ctx.beginPath();
    ctx.moveTo(-icon, -icon * 0.75);
    ctx.lineTo(0, -icon * 1.35);
    ctx.lineTo(icon, -icon * 0.75);
    ctx.stroke();
  } else if (kind === "hardhat") {
    ctx.beginPath();
    ctx.arc(0, -icon * 0.15, icon * 1.1, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-icon * 1.25, icon * 0.35);
    ctx.lineTo(icon * 1.25, icon * 0.35);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-icon * 0.2, -icon * 1.1);
    ctx.lineTo(-icon * 0.2, icon * 0.9);
    ctx.lineTo(icon * 0.9, icon * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(icon * 0.55, -icon * 0.55, icon * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGlobe(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  canvasW: number,
  canvasH: number,
  rotation: number,
  time: number,
  showSatellites: boolean,
) {
  const transform = (theta: number, phi: number): Proj => {
    let p = spherePoint(theta, phi);
    p = rotateY(p, rotation);
    p = viewTransform(p);
    return project(p, cx, cy, radius);
  };

  const glow = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.35,
    radius * 0.05,
    cx,
    cy,
    radius * 1.12,
  );
  glow.addColorStop(0, "rgba(0, 80, 255, 0.32)");
  glow.addColorStop(0.55, "rgba(0, 40, 180, 0.1)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.1, 0, Math.PI * 2);
  ctx.fill();

  const bodyGrad = ctx.createRadialGradient(
    cx - radius * 0.32,
    cy - radius * 0.28,
    radius * 0.08,
    cx + radius * 0.08,
    cy + radius * 0.06,
    radius,
  );
  bodyGrad.addColorStop(0, "#8ec0ff");
  bodyGrad.addColorStop(0.22, "#2d6bff");
  bodyGrad.addColorStop(0.5, "#0038ff");
  bodyGrad.addColorStop(0.78, "#001a66");
  bodyGrad.addColorStop(1, "#000510");

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  ctx.clip();

  ctx.lineWidth = 1;
  ctx.lineCap = "butt";
  ctx.strokeStyle = "rgba(200, 230, 255, 0.5)";

  for (let i = 0; i < MERIDIAN_COUNT; i++) {
    const theta0 = (i / MERIDIAN_COUNT) * Math.PI * 2;
    const pts: Proj[] = [];
    for (let step = 0; step <= 80; step++) {
      const phi = -Math.PI / 2 + (step / 80) * Math.PI;
      pts.push(transform(theta0, phi));
    }
    strokeVisibleArc(ctx, pts, cx, cy, radius);
  }

  ctx.strokeStyle = "rgba(175, 210, 255, 0.38)";
  for (let j = 1; j < PARALLEL_COUNT; j++) {
    const phi = -Math.PI / 2 + (j / PARALLEL_COUNT) * Math.PI;
    const pts: Proj[] = [];
    for (let step = 0; step <= 120; step++) {
      const theta = (step / 120) * Math.PI * 2;
      pts.push(transform(theta, phi));
    }
    strokeVisibleArc(ctx, pts, cx, cy, radius);
  }

  ctx.restore();

  const terminator = ctx.createRadialGradient(
    cx + radius * 0.35,
    cy,
    radius * 0.1,
    cx,
    cy,
    radius,
  );
  terminator.addColorStop(0, "transparent");
  terminator.addColorStop(0.55, "rgba(0, 0, 0, 0.08)");
  terminator.addColorStop(1, "rgba(0, 0, 0, 0.65)");
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = terminator;
  ctx.fill();

  const specular = ctx.createRadialGradient(
    cx - radius * 0.28,
    cy - radius * 0.32,
    0,
    cx - radius * 0.28,
    cy - radius * 0.32,
    radius * 0.55,
  );
  specular.addColorStop(0, "rgba(255, 255, 255, 0.4)");
  specular.addColorStop(0.45, "rgba(255, 255, 255, 0.06)");
  specular.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = specular;
  ctx.fill();

  ctx.strokeStyle = "rgba(140, 190, 255, 0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (!showSatellites) return;

  ctx.save();
  clipOutsideSphere(ctx, cx, cy, radius, canvasW, canvasH);
  ctx.strokeStyle = "rgba(120, 185, 255, 0.28)";
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.setLineDash([4, 7]);
  for (const sat of satellites) {
    drawOrbitRing(ctx, cx, cy, radius, sat.orbitRadius, sat.inclination);
  }
  ctx.setLineDash([]);
  ctx.restore();

  for (const sat of satellites) {
    const angle = time * sat.speed + sat.phase;
    const p = viewTransform(orbitPoint(sat.orbitRadius, sat.inclination, angle));
    const { sx, sy, depth } = project(p, cx, cy, radius);
    if (!isFront(depth)) continue;
    if (!outsideDisk(sx, sy, cx, cy, radius, 1.02)) continue;

    const size = Math.max(22, radius * 0.11);
    ctx.save();
    ctx.shadowColor = "rgba(0, 120, 255, 0.65)";
    ctx.shadowBlur = 12;
    drawSatelliteIcon(ctx, sx, sy, size, sat.kind);
    ctx.restore();
  }
}

export function PlanetGlobe({
  size = "md",
  className = "",
  spin = true,
  showSatellites = true,
}: PlanetGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const timeRef = useRef(0);
  const spinRef = useRef(spin);
  const showSatellitesRef = useRef(showSatellites);
  spinRef.current = spin;
  showSatellitesRef.current = showSatellites;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      if (!running) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        raf = window.requestAnimationFrame(draw);
        return;
      }

      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const radius = Math.min(rect.width, rect.height) * 0.42;

      ctx.clearRect(0, 0, rect.width, rect.height);
      drawGlobe(
        ctx,
        cx,
        cy,
        radius,
        rect.width,
        rect.height,
        rotationRef.current,
        timeRef.current,
        showSatellitesRef.current,
      );

      if (spinRef.current) rotationRef.current += GLOBE_SPIN_SPEED;
      timeRef.current += 0.016;
      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className={["planet-globe", sizeMap[size], className].join(" ")}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="planet-canvas" />
    </div>
  );
}
