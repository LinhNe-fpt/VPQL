import type { CSSProperties } from "react";

import type { LoginThemePalette } from "@/lib/login-theme";

export const AURORA_SVG_ID = "login-aurora";

export const AURORA_PETAL_LAYERS = [
  { count: 16, rotationOffset: 0, scale: 1.08, length: 1, opacity: 0.86 },
  { count: 16, rotationOffset: 360 / 32, scale: 0.96, length: 0.92, opacity: 0.88 },
  { count: 14, rotationOffset: 360 / 28, scale: 0.84, length: 0.8, opacity: 0.9 },
  { count: 12, rotationOffset: 360 / 24, scale: 0.72, length: 0.66, opacity: 0.92 },
  { count: 10, rotationOffset: 360 / 20, scale: 0.58, length: 0.52, opacity: 0.94 },
] as const;

function petalPath(length: number) {
  const tip = -395 * length;
  const mid = -290 * length;
  const base = 8 + 4 * (1 - length);
  const wOuter = 95 * length;
  const wInner = 18 + 6 * (1 - length);
  return `M0,${base} C-${wInner},-${60 * length} -${wOuter},${mid} -8,${tip} C${wOuter},${mid} ${wInner},-${60 * length} 0,${base} Z`;
}

function prismPath(length: number) {
  const tip = -310 * length;
  const mid = -220 * length;
  const w = 55 * length;
  return `M0,${20 * length} C-6,-${50 * length} -${w},${mid} -4,${tip} C${w},${mid} 6,-${50 * length} 0,${20 * length} Z`;
}

type AuroraFlowerSvgProps = {
  palette: LoginThemePalette;
  svgId?: string;
  className?: string;
};

export function AuroraFlowerSvg({ palette, svgId = AURORA_SVG_ID, className }: AuroraFlowerSvgProps) {
  const uid = svgId;

  return (
    <svg className={className} viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.sky[0]} />
          <stop offset="45%" stopColor={palette.sky[1]} />
          <stop offset="100%" stopColor={palette.sky[2]} />
        </linearGradient>

        <linearGradient id={`${uid}-petal-face`} x1="32%" y1="100%" x2="68%" y2="0%">
          <stop offset="0%" stopColor={palette.stack.petalRoot} stopOpacity="0.78" />
          <stop offset="24%" stopColor={palette.petalFace[1]} stopOpacity="0.88" />
          <stop offset="58%" stopColor={palette.petalFace[1]} stopOpacity="0.84" />
          <stop offset="100%" stopColor={palette.petalFace[0]} stopOpacity="0.97" />
        </linearGradient>

        <linearGradient id={`${uid}-petal-shade`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={palette.petalShade[0]} />
          <stop offset="50%" stopColor={palette.petalShade[1]} />
          <stop offset="100%" stopColor={palette.petalShade[2]} />
        </linearGradient>

        <linearGradient id={`${uid}-prism`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={palette.prism[0]} />
          <stop offset="25%" stopColor={palette.prism[1]} />
          <stop offset="50%" stopColor={palette.prism[2]} />
          <stop offset="75%" stopColor={palette.prism[3]} />
          <stop offset="100%" stopColor={palette.prism[4]} />
        </linearGradient>
      </defs>

      <rect width="800" height="900" fill={`url(#${uid}-sky)`} />

      <g transform="translate(400, 470)">
        <g className="login-aurora__flower">
          {AURORA_PETAL_LAYERS.map((layer, layerIdx) => {
            const step = 360 / layer.count;
            return (
              <g
                key={layerIdx}
                className="login-aurora__layer"
                style={
                  {
                    ["--layer-delay" as string]: AURORA_PETAL_LAYERS.length - 1 - layerIdx,
                    ["--layer-opacity" as string]: layer.opacity,
                  } as CSSProperties
                }
              >
                {Array.from({ length: layer.count }, (_, i) => {
                  const deg = i * step + layer.rotationOffset;
                  return (
                    <g key={i} transform={`rotate(${deg}) scale(${layer.scale})`}>
                      <path
                        className="login-aurora__petal"
                        d={petalPath(layer.length)}
                        fill={`url(#${uid}-petal-face)`}
                        stroke={`url(#${uid}-petal-shade)`}
                        strokeWidth={1.1 + layerIdx * 0.18}
                      />
                      {layerIdx < 3 && (
                        <path
                          d={prismPath(layer.length)}
                          fill={`url(#${uid}-prism)`}
                          opacity={0.42 + layerIdx * 0.05}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
