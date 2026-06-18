/** Hiệu ứng slash/xẹt kiểu ASUS ROG — streak chéo quét màn hình. */
export function RogSlashEffects({ burst = false }: { burst?: boolean }) {
  return (
    <div
      className={[
        "rog-slash-layer",
        burst ? "rog-slash-layer--burst" : "",
      ].join(" ")}
      aria-hidden="true"
    >
      <div className="rog-slash-streak rog-slash-a" />
      <div className="rog-slash-streak thick rog-slash-b" />
      <div className="rog-slash-streak rog-slash-c" />
      <div className="rog-slash-streak thick rog-slash-d" />
      <div className="rog-slash-streak rog-slash-e" />
      <div className="rog-slash-streak rog-slash-f" />
      <div className="rog-slash-streak rog-slash-g" />
      <div className="rog-slash-streak thick rog-slash-h" />

      <div className="rog-slash-corner rog-slash-corner-tl" />
      <div className="rog-slash-corner rog-slash-corner-br" />
      <div className="rog-slash-corner rog-slash-corner-tr" />
    </div>
  );
}
