const STORAGE_KEY = "stockflow-login-theme";

export const LOGIN_THEME_CHANGE_EVENT = "stockflow-login-theme-change";

export type LoginThemeId = "frost" | "lavender" | "rose" | "mint" | "gold" | "slate";

export type LoginThemePalette = {
  id: LoginThemeId;
  accent: string;
  accentLight: string;
  mesh: {
    r1: string;
    r2: string;
    r3: string;
    base: string;
    mid: string;
    end: string;
  };
  sky: [string, string, string];
  petalFace: [string, string, string];
  petalShade: [string, string, string];
  prism: [string, string, string, string, string];
  halo: [string, string, string];
  stack: {
    petalRoot: string;
    center: string;
    glass: string;
  };
  glass: {
    fill: string;
    tint: string;
    edge: string;
    shadow: string;
  };
};

type LoginThemeBase = Omit<LoginThemePalette, "stack" | "glass">;

function mixHex(hex: string, target: string, amount: number) {
  const parse = (h: string) => {
    const s = h.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(target);
  const t = Math.min(1, Math.max(0, amount));
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = mix(r1, r2);
  const g = mix(g1, g2);
  const b = mix(b1, b2);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function softenRgba(color: string, alphaScale = 0.72) {
  const match = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!match) return color;
  const r = match[1];
  const g = match[2];
  const b = match[3];
  const a = match[4] ?? "1";
  const nextA = Math.min(1, parseFloat(a) * alphaScale);
  return `rgba(${r}, ${g}, ${b}, ${nextA.toFixed(3).replace(/\.?0+$/, "")})`;
}

function hexToRgba(hex: string, alpha: number) {
  const s = hex.replace("#", "");
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Màu vùng chồng lớp kính — nhẹ, lan tỏa tự nhiên từ gốc cánh. */
function deriveStack(p: Pick<LoginThemePalette, "accent" | "petalFace">): LoginThemePalette["stack"] {
  const root = mixHex(p.petalFace[2], p.accent, 0.38);
  return {
    petalRoot: hexToRgba(root, 0.4),
    center: hexToRgba(mixHex(p.accent, p.petalFace[1], 0.65), 0.05),
    glass: hexToRgba(mixHex(p.petalFace[2], "#64748b", 0.35), 0.07),
  };
}

function deriveGlass(p: Pick<LoginThemePalette, "accent" | "accentLight" | "mesh">): LoginThemePalette["glass"] {
  const fillBase = mixHex(p.mesh.mid, "#ffffff", 0.55);
  return {
    fill: hexToRgba(fillBase, 0.34),
    tint: hexToRgba(p.accent, 0.06),
    edge: hexToRgba("#ffffff", 0.52),
    shadow: hexToRgba(mixHex(p.accent, "#334155", 0.55), 0.1),
  };
}

/** Làm bảng màu nhạt, pastel — giữ sắc thái từng theme. */
function palePalette(p: LoginThemeBase): LoginThemePalette {
  const pale: LoginThemeBase = {
    ...p,
    accent: mixHex(p.accent, "#ffffff", 0.12),
    accentLight: mixHex(p.accentLight, "#ffffff", 0.22),
    mesh: {
      r1: softenRgba(p.mesh.r1, 0.92),
      r2: softenRgba(p.mesh.r2, 0.78),
      r3: softenRgba(p.mesh.r3, 0.78),
      base: mixHex(p.mesh.base, "#ffffff", 0.28),
      mid: mixHex(p.mesh.mid, "#ffffff", 0.32),
      end: mixHex(p.mesh.end, "#ffffff", 0.24),
    },
    sky: [
      mixHex(p.sky[0], "#ffffff", 0.22),
      mixHex(p.sky[1], "#ffffff", 0.28),
      mixHex(p.sky[2], "#ffffff", 0.18),
    ] as LoginThemeBase["sky"],
    petalFace: [
      "#ffffff",
      mixHex(p.petalFace[1], "#ffffff", 0.28),
      mixHex(p.petalFace[2], "#ffffff", 0.32),
    ] as LoginThemeBase["petalFace"],
    petalShade: [
      p.petalShade[0],
      softenRgba(p.petalShade[1], 0.72),
      softenRgba(p.petalShade[2], 0.92),
    ] as LoginThemeBase["petalShade"],
    prism: p.prism.map((c) => softenRgba(c, 0.82)) as LoginThemeBase["prism"],
    halo: [
      softenRgba(p.halo[0], 0.88),
      softenRgba(p.halo[1], 0.78),
      softenRgba(p.halo[2], 0.68),
    ] as LoginThemeBase["halo"],
  };
  return { ...pale, stack: deriveStack(pale), glass: deriveGlass(pale) };
}

const RAW_THEMES: Record<LoginThemeId, LoginThemeBase> = {
  frost: {
    id: "frost",
    accent: "#0038ff",
    accentLight: "#4d7cff",
    mesh: {
      r1: "rgba(255, 255, 255, 0.92)",
      r2: "rgba(196, 216, 255, 0.28)",
      r3: "rgba(212, 255, 240, 0.16)",
      base: "#e8eef6",
      mid: "#f4f7fb",
      end: "#dde6f0",
    },
    sky: ["#eef2f8", "#f7f9fc", "#d8e2ee"],
    petalFace: ["#ffffff", "#eef3fa", "#b8c9de"],
    petalShade: ["rgba(143, 164, 196, 0)", "rgba(107, 132, 159, 0.18)", "rgba(255, 255, 255, 0.45)"],
    prism: [
      "rgba(255, 255, 255, 0.5)",
      "rgba(196, 216, 255, 0.3)",
      "rgba(255, 212, 240, 0.18)",
      "rgba(212, 255, 240, 0.22)",
      "rgba(255, 255, 255, 0.14)",
    ],
    halo: ["rgba(255, 255, 255, 0.36)", "rgba(255, 255, 255, 0.14)", "rgba(255, 255, 255, 0.05)"],
  },
  lavender: {
    id: "lavender",
    accent: "#7c3aed",
    accentLight: "#a78bfa",
    mesh: {
      r1: "rgba(255, 255, 255, 0.9)",
      r2: "rgba(216, 200, 255, 0.26)",
      r3: "rgba(240, 220, 255, 0.16)",
      base: "#ede8f8",
      mid: "#f6f2fc",
      end: "#ddd0f0",
    },
    sky: ["#f0ebfa", "#f8f5fd", "#ddd0ee"],
    petalFace: ["#ffffff", "#f0e8ff", "#c4b0e8"],
    petalShade: ["rgba(167, 139, 250, 0)", "rgba(124, 58, 237, 0.14)", "rgba(255, 255, 255, 0.42)"],
    prism: [
      "rgba(255, 255, 255, 0.45)",
      "rgba(216, 180, 255, 0.3)",
      "rgba(244, 199, 255, 0.2)",
      "rgba(221, 214, 254, 0.24)",
      "rgba(255, 255, 255, 0.12)",
    ],
    halo: ["rgba(245, 240, 255, 0.38)", "rgba(221, 214, 254, 0.16)", "rgba(196, 181, 253, 0.06)"],
  },
  rose: {
    id: "rose",
    accent: "#e11d48",
    accentLight: "#fb7185",
    mesh: {
      r1: "rgba(255, 255, 255, 0.92)",
      r2: "rgba(255, 200, 216, 0.26)",
      r3: "rgba(255, 228, 230, 0.18)",
      base: "#f8e8ee",
      mid: "#fdf4f7",
      end: "#ecd0dc",
    },
    sky: ["#faf0f3", "#fdf6f8", "#e8d0da"],
    petalFace: ["#ffffff", "#fceef3", "#e8b4c8"],
    petalShade: ["rgba(251, 113, 133, 0)", "rgba(225, 29, 72, 0.12)", "rgba(255, 255, 255, 0.42)"],
    prism: [
      "rgba(255, 255, 255, 0.48)",
      "rgba(255, 200, 216, 0.3)",
      "rgba(255, 182, 193, 0.2)",
      "rgba(254, 205, 211, 0.22)",
      "rgba(255, 255, 255, 0.13)",
    ],
    halo: ["rgba(255, 241, 245, 0.36)", "rgba(254, 205, 211, 0.14)", "rgba(251, 113, 133, 0.05)"],
  },
  mint: {
    id: "mint",
    accent: "#0d9488",
    accentLight: "#2dd4bf",
    mesh: {
      r1: "rgba(255, 255, 255, 0.92)",
      r2: "rgba(180, 240, 220, 0.26)",
      r3: "rgba(204, 251, 241, 0.16)",
      base: "#e4f5f0",
      mid: "#f2fbf8",
      end: "#c8e8de",
    },
    sky: ["#eaf7f3", "#f4fbf9", "#c8e6dc"],
    petalFace: ["#ffffff", "#e8f8f2", "#9fd4c0"],
    petalShade: ["rgba(45, 212, 191, 0)", "rgba(13, 148, 136, 0.13)", "rgba(255, 255, 255, 0.4)"],
    prism: [
      "rgba(255, 255, 255, 0.45)",
      "rgba(167, 243, 208, 0.28)",
      "rgba(153, 246, 228, 0.2)",
      "rgba(204, 251, 241, 0.22)",
      "rgba(255, 255, 255, 0.12)",
    ],
    halo: ["rgba(240, 253, 250, 0.34)", "rgba(167, 243, 208, 0.14)", "rgba(45, 212, 191, 0.05)"],
  },
  gold: {
    id: "gold",
    accent: "#b45309",
    accentLight: "#f59e0b",
    mesh: {
      r1: "rgba(255, 255, 255, 0.92)",
      r2: "rgba(255, 220, 160, 0.24)",
      r3: "rgba(255, 237, 200, 0.16)",
      base: "#f5eed8",
      mid: "#fbf8f0",
      end: "#e8dcc0",
    },
    sky: ["#f7f2e8", "#fbf9f4", "#e6dcc8"],
    petalFace: ["#ffffff", "#f8f0e0", "#dcc8a0"],
    petalShade: ["rgba(245, 158, 11, 0)", "rgba(180, 83, 9, 0.12)", "rgba(255, 255, 255, 0.42)"],
    prism: [
      "rgba(255, 255, 255, 0.48)",
      "rgba(255, 220, 160, 0.28)",
      "rgba(255, 200, 140, 0.18)",
      "rgba(254, 240, 138, 0.2)",
      "rgba(255, 255, 255, 0.12)",
    ],
    halo: ["rgba(255, 251, 235, 0.36)", "rgba(254, 240, 138, 0.14)", "rgba(245, 158, 11, 0.05)"],
  },
  slate: {
    id: "slate",
    accent: "#475569",
    accentLight: "#64748b",
    mesh: {
      r1: "rgba(255, 255, 255, 0.88)",
      r2: "rgba(203, 213, 225, 0.26)",
      r3: "rgba(226, 232, 240, 0.18)",
      base: "#e8ecf1",
      mid: "#f3f5f8",
      end: "#d4dbe4",
    },
    sky: ["#eef1f5", "#f6f8fa", "#d8dfe8"],
    petalFace: ["#ffffff", "#eef2f6", "#b8c4d0"],
    petalShade: ["rgba(100, 116, 139, 0)", "rgba(71, 85, 105, 0.13)", "rgba(255, 255, 255, 0.4)"],
    prism: [
      "rgba(255, 255, 255, 0.42)",
      "rgba(203, 213, 225, 0.28)",
      "rgba(226, 232, 240, 0.2)",
      "rgba(241, 245, 249, 0.22)",
      "rgba(255, 255, 255, 0.11)",
    ],
    halo: ["rgba(248, 250, 252, 0.34)", "rgba(226, 232, 240, 0.14)", "rgba(148, 163, 184, 0.05)"],
  },
};

export const LOGIN_THEMES = Object.fromEntries(
  Object.entries(RAW_THEMES).map(([id, palette]) => [id, palePalette(palette)]),
) as Record<LoginThemeId, LoginThemePalette>;

export const LOGIN_THEME_IDS = Object.keys(LOGIN_THEMES) as LoginThemeId[];

export function isLoginThemeId(value: string): value is LoginThemeId {
  return value in LOGIN_THEMES;
}

export function getStoredLoginThemeId(): LoginThemeId {
  if (typeof window === "undefined") return "frost";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && isLoginThemeId(raw) ? raw : "frost";
  } catch {
    return "frost";
  }
}

export function setStoredLoginThemeId(id: LoginThemeId) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new Event(LOGIN_THEME_CHANGE_EVENT));
  } catch {
    /* private browsing / quota */
  }
}

export function applyLoginTheme(id: LoginThemeId) {
  if (typeof document === "undefined") return;
  const theme = LOGIN_THEMES[id];
  const root = document.documentElement;

  root.dataset.loginTheme = id;
  root.style.setProperty("--login-ultra", theme.accent);
  root.style.setProperty("--login-ultra-light", theme.accentLight);
  root.style.setProperty("--login-ultra-deep", theme.accent);

  root.style.setProperty("--aurora-mesh-r1", theme.mesh.r1);
  root.style.setProperty("--aurora-mesh-r2", theme.mesh.r2);
  root.style.setProperty("--aurora-mesh-r3", theme.mesh.r3);
  root.style.setProperty("--aurora-mesh-base", theme.mesh.base);
  root.style.setProperty("--aurora-mesh-mid", theme.mesh.mid);
  root.style.setProperty("--aurora-mesh-end", theme.mesh.end);

  root.style.setProperty("--aurora-halo-inner", theme.halo[0]);
  root.style.setProperty("--aurora-halo-mid", theme.halo[1]);
  root.style.setProperty("--aurora-halo-outer", theme.halo[2]);

  root.style.setProperty("--aurora-glass-stack", theme.stack.glass);
  root.style.setProperty("--aurora-stack-center", theme.stack.center);
  root.style.setProperty("--aurora-glass-fill", theme.glass.fill);
  root.style.setProperty("--aurora-glass-tint", theme.glass.tint);
  root.style.setProperty("--aurora-glass-edge", theme.glass.edge);
  root.style.setProperty("--aurora-glass-shadow", theme.glass.shadow);
}

export function restoreLoginTheme() {
  applyLoginTheme(getStoredLoginThemeId());
}

if (typeof window !== "undefined") {
  restoreLoginTheme();
}
