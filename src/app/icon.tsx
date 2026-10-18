import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon — a simple gold monogram "W" on ivory. Contains no photographs or
 * likenesses; it is purely typographic so it can never imply a person.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF8F3",
          borderRadius: 4,
        }}
      >
        <span
          style={{
            color: "#B6955B",
            fontFamily: "serif",
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          W
        </span>
      </div>
    ),
    { ...size },
  );
}
