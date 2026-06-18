import { useEffect, useState } from "react";
import { HardHat, LogOut, Package, Wrench } from "lucide-react";

import { getInitials } from "@/lib/auth";

const DURATION_MS = 3000;

const collapseIcons = [
  { icon: Package, angle: 0, color: "cyan" as const },
  { icon: HardHat, angle: 120, color: "magenta" as const },
  { icon: Wrench, angle: 240, color: "yellow" as const },
];

type Phase = "disconnect" | "terminate" | "farewell";

export function LogoutTransitionOverlay({
  displayName,
  onComplete,
}: {
  displayName: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("disconnect");

  useEffect(() => {
    const terminateTimer = window.setTimeout(() => setPhase("terminate"), 1100);
    const farewellTimer = window.setTimeout(() => setPhase("farewell"), 2000);
    const completeTimer = window.setTimeout(() => onComplete(), DURATION_MS);
    return () => {
      window.clearTimeout(terminateTimer);
      window.clearTimeout(farewellTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const phaseLabel =
    phase === "disconnect"
      ? "ĐANG NGẮT KẾT NỐI"
      : phase === "terminate"
        ? "ĐÓNG PHIÊN BẢO MẬT"
        : "ĐĂNG XUẤT THÀNH CÔNG";

  const phaseTitle =
    phase === "disconnect"
      ? "Đang đăng xuất…"
      : phase === "terminate"
        ? "Hủy phiên truy cập"
        : `Hẹn gặp lại, ${displayName}`;

  return (
    <div
      className="cyber-logout-root fixed inset-0 z-[100] flex items-center justify-center"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="cyber-logout-bg" />
      <div className="cyber-logout-grid" />
      <div className="cyber-logout-scanlines" />
      <div className="cyber-logout-glow cyan" />
      <div className="cyber-logout-glow magenta" />

      <div className="cyber-logout-noise" />

      <div className="relative z-10 flex flex-col items-center px-6">
        <div className="cyber-logout-bracket left" />
        <div className="cyber-logout-bracket right" />

        <div className="relative size-32 sm:size-36">
          <div className="absolute inset-0 cyber-logout-hex" />
          <div
            className="absolute inset-1 cyber-logout-ring cyber-logout-ring-cyan"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="absolute inset-3 cyber-logout-ring cyber-logout-ring-magenta"
            style={{ animationDelay: "200ms" }}
          />
          <div className="absolute inset-0 cyber-logout-spin" />

          {collapseIcons.map((item, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 cyber-logout-collapse"
              style={{
                animationDelay: `${i * 120}ms`,
                ["--orbit-angle" as string]: `${item.angle}deg`,
              }}
            >
              <div
                className={[
                  "grid size-9 place-items-center border bg-black/60 backdrop-blur-sm",
                  item.color === "cyan"
                    ? "border-cyan-400/60 shadow-[0_0_12px_rgba(0,240,255,0.35)]"
                    : item.color === "magenta"
                      ? "border-fuchsia-400/60 shadow-[0_0_12px_rgba(255,0,170,0.35)]"
                      : "border-yellow-300/60 shadow-[0_0_12px_rgba(252,238,10,0.3)]",
                ].join(" ")}
                style={{
                  clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                }}
              >
                <item.icon
                  className={[
                    "size-4",
                    item.color === "cyan"
                      ? "text-cyan-300"
                      : item.color === "magenta"
                        ? "text-fuchsia-300"
                        : "text-yellow-200",
                  ].join(" ")}
                  strokeWidth={2}
                />
              </div>
            </div>
          ))}

          <div className="absolute inset-0 flex items-center justify-center cyber-logout-core-pulse">
            <div
              className={[
                "relative grid size-[4.5rem] place-items-center border-2 bg-black/80 backdrop-blur-md",
                phase === "farewell"
                  ? "border-fuchsia-400 shadow-[0_0_30px_rgba(255,0,170,0.55),inset_0_0_20px_rgba(255,0,170,0.15)]"
                  : "border-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.5),inset_0_0_20px_rgba(0,240,255,0.12)]",
              ].join(" ")}
              style={{
                clipPath: "polygon(14% 0%, 86% 0%, 100% 50%, 86% 100%, 14% 100%, 0% 50%)",
              }}
            >
              <LogOut
                className={[
                  "size-8 cyber-logout-icon",
                  phase === "farewell" ? "text-fuchsia-300" : "text-cyan-300",
                ].join(" ")}
                strokeWidth={2.2}
              />
              <div className="absolute inset-0 cyber-logout-core-glitch" />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2.5 text-center cyber-logout-text-in">
          <p className="cyber-logout-label font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            <span className="cyber-logout-glitch" data-text={phaseLabel}>{phaseLabel}</span>
          </p>
          <p
            className={[
              "cyber-logout-title text-xl sm:text-2xl font-bold tracking-tight",
              phase === "farewell" ? "text-fuchsia-200" : "text-cyan-100",
            ].join(" ")}
          >
            <span className="cyber-logout-glitch" data-text={phaseTitle}>{phaseTitle}</span>
          </p>

          {phase === "farewell" && (
            <div className="mt-1 flex items-center gap-2.5 text-sm font-mono text-cyan-200/50">
              <span
                className="grid size-7 place-items-center border border-cyan-400/40 bg-cyan-400/10 text-[10px] font-bold text-cyan-200 shadow-[0_0_10px_rgba(0,240,255,0.25)]"
                style={{
                  clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                }}
              >
                {getInitials(displayName)}
              </span>
              <span className="tracking-wide">→ LOGIN_GATE</span>
            </div>
          )}

          {phase === "terminate" && (
            <p className="font-mono text-[11px] tracking-widest text-fuchsia-300/60 animate-pulse">
              PURGING SESSION DATA...
            </p>
          )}
        </div>

        <div className="mt-8 w-56 sm:w-64">
          <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/40 mb-1.5">
            <span>EXIT</span>
            <span className="cyber-logout-progress-pct">100%</span>
          </div>
          <div className="h-1.5 overflow-hidden border border-cyan-400/30 bg-black/60 shadow-[inset_0_0_8px_rgba(0,240,255,0.1)]">
            <div className="h-full cyber-logout-progress-bar" />
          </div>
        </div>

        <div className="mt-6 flex gap-3 font-mono text-[9px] text-cyan-300/35 tracking-[0.15em]">
          <span>SYS.STOCKFLOW</span>
          <span className="text-fuchsia-400/50">|</span>
          <span>NET.INTERNAL</span>
          <span className="text-fuchsia-400/50">|</span>
          <span className="cyber-logout-status blink">OFFLINE</span>
        </div>
      </div>
    </div>
  );
}
