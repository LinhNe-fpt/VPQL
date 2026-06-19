type XiaomiSupergraphicProps = {
  variant?: "scene" | "fullscreen";
  className?: string;
  /** Tắt drift/pulse — dùng trong transition zoom để tránh khựng */
  staticLayer?: boolean;
};

export function XiaomiSupergraphic({
  variant = "scene",
  className = "",
  staticLayer = false,
}: XiaomiSupergraphicProps) {
  return (
    <div
      className={[
        "xiaomi-supergraphic",
        variant === "fullscreen" ? "xiaomi-supergraphic--fullscreen" : "xiaomi-supergraphic--scene",
        staticLayer && "xiaomi-supergraphic--static",
        className,
      ].join(" ")}
      aria-hidden="true"
    >
      <svg
        className="xiaomi-supergraphic__svg"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="mi-sweep-a" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0038FF" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#4D7CFF" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="mi-sweep-b" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0038FF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8FA8FF" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="mi-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0038FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0038FF" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <ellipse
          className="xiaomi-supergraphic__ring"
          cx="340"
          cy="460"
          rx="280"
          ry="280"
          fill="none"
          stroke="url(#mi-ring)"
          strokeWidth="2"
        />
        <ellipse
          className="xiaomi-supergraphic__ring xiaomi-supergraphic__ring--2"
          cx="340"
          cy="460"
          rx="360"
          ry="360"
          fill="none"
          stroke="#0038FF"
          strokeOpacity="0.06"
          strokeWidth="1.5"
        />

        <path
          className="xiaomi-supergraphic__band xiaomi-supergraphic__band--soft"
          d="M-120 720 C 280 180, 520 120, 920 280 L 1100 420 C 620 200, 380 260, -80 900 Z"
          fill="url(#mi-sweep-b)"
        />
        <path
          className="xiaomi-supergraphic__band xiaomi-supergraphic__band--main"
          d="M-80 820 C 320 280, 580 200, 1000 360 L 1150 500 C 640 240, 400 300, -40 980 Z"
          fill="url(#mi-sweep-a)"
        />

        <path
          className="xiaomi-supergraphic__arc"
          d="M 60 680 Q 420 120, 880 320"
          fill="none"
          stroke="#0038FF"
          strokeOpacity="0.18"
          strokeWidth="3"
        />
        <path
          className="xiaomi-supergraphic__arc xiaomi-supergraphic__arc--2"
          d="M 120 760 Q 480 200, 940 400"
          fill="none"
          stroke="#0038FF"
          strokeOpacity="0.1"
          strokeWidth="2"
        />
      </svg>

      <div className="xiaomi-supergraphic__tiles">
        <div className="xiaomi-supergraphic__tile xiaomi-supergraphic__tile--1" />
        <div className="xiaomi-supergraphic__tile xiaomi-supergraphic__tile--2" />
        <div className="xiaomi-supergraphic__tile xiaomi-supergraphic__tile--3" />
      </div>

      <div className="xiaomi-supergraphic__orb" />
    </div>
  );
}
