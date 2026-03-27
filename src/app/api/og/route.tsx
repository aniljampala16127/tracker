import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAFAF8",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #2D6A4F, #4A9468, #D4A03C)",
          }}
        />

        {/* Card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px 60px",
            borderRadius: "24px",
            border: "2px solid #E8E6E1",
            backgroundColor: "white",
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          }}
        >
          {/* Logo area */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                backgroundColor: "#2D6A4F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "28px",
                fontWeight: "bold",
              }}
            >
              S
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  color: "#1A1A18",
                  lineHeight: 1.1,
                }}
              >
                SponsorTrack
              </div>
              <div style={{ fontSize: "16px", color: "#8A8880" }}>
                Canada Spousal Sponsorship Tracker
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: "32px",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "14px", color: "#8A8880", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
                IRCC Outland
              </div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#2D6A4F" }}>
                15 months
              </div>
            </div>
            <div style={{ width: "2px", backgroundColor: "#E8E6E1" }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "14px", color: "#8A8880", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
                IRCC Inland
              </div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#D4A03C" }}>
                21 months
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: "18px",
              color: "#65635D",
              textAlign: "center",
              maxWidth: "500px",
            }}
          >
            Free community tracker with real processing times, AOR predictions, and milestone celebrations
          </div>

          {/* Steps dots */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "28px",
            }}
          >
            {["Sub", "AOR", "BIL", "SE", "Med", "PA", "BG", "Pre", "P1", "P2", "eCoPR"].map(
              (label, i) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      width: i === 0 ? "14px" : "10px",
                      height: i === 0 ? "14px" : "10px",
                      borderRadius: "50%",
                      backgroundColor: i === 0 ? "#2D6A4F" : i < 3 ? "#4A9468" : "#D5D3CE",
                    }}
                  />
                  <div style={{ fontSize: "9px", color: "#B0ADA6" }}>{label}</div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            marginTop: "24px",
            fontSize: "14px",
            color: "#B0ADA6",
          }}
        >
          tracker-lime-five.vercel.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
