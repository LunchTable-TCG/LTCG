import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile } from "remotion";

const archetypes = [
  { name: "Infernal Dragons", file: "infernal_dragons.png", color: "#ff4500" },
  { name: "Divine Knights", file: "divine_knights.png", color: "#ffd700" },
  { name: "Shadow Assassins", file: "shadow_assassins.png", color: "#9370db" },
  { name: "Arcane Mages", file: "arcane_mages.png", color: "#4169e1" },
  { name: "Nature Spirits", file: "nature_spirits.png", color: "#32cd32" },
  { name: "Storm Elementals", file: "storm_elementals.png", color: "#00bfff" },
  { name: "Undead Legion", file: "undead_legion.png", color: "#8b008b" },
  { name: "Celestial Guardians", file: "celestial_guardians.png", color: "#f0e68c" },
  { name: "Abyssal Horrors", file: "abyssal_horrors.png", color: "#800080" },
  { name: "Mechanical Constructs", file: "mechanical_constructs.png", color: "#c0c0c0" },
];

const ArchetypeCard = ({
  name,
  file,
  color,
  delay
}: {
  name: string;
  file: string;
  color: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();

  // Slow, smooth entrance animation
  const entrance = interpolate(
    frame,
    [delay, delay + 40], // Slower entrance (40 frames instead of 15)
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Ease-out curve for smoother animation
  const easeOut = 1 - Math.pow(1 - entrance, 3);

  const scale = interpolate(easeOut, [0, 1], [0.7, 1]);
  const opacity = easeOut;
  const rotation = interpolate(easeOut, [0, 1], [-5, 0]); // Less rotation

  // Gentle floating animation
  const float = Math.sin((frame + delay) * 0.05) * 3; // Slower, smaller float

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale}) rotate(${rotation}deg) translateY(${float}px)`,
      }}
    >
      <div
        style={{
          width: "180px",
          height: "180px",
          borderRadius: "20px",
          background: `linear-gradient(135deg, ${color}33, ${color}11)`,
          border: `3px solid ${color}`,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "15px",
          boxShadow: `0 10px 40px ${color}44, inset 0 0 20px ${color}22`,
        }}
      >
        <Img
          src={staticFile(`archetypes/${file}`)}
          style={{
            width: "100px",
            height: "100px",
            filter: `drop-shadow(0 0 10px ${color})`,
          }}
        />
        <div
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            color: "#ffffff",
            textAlign: "center",
            textShadow: `0 0 10px ${color}`,
          }}
        >
          {name}
        </div>
      </div>
    </div>
  );
};

export const ArchetypeShowcase = () => {
  const frame = useCurrentFrame();

  // Slow title animation
  const titleOpacity = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame, [0, 40], [-50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      }}
    >
      {/* Slow animated background */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          opacity: 0.08,
          background: `radial-gradient(circle at ${50 + Math.sin(frame * 0.01) * 20}% ${50 + Math.cos(frame * 0.015) * 20}%, #ffd700 0%, transparent 50%)`,
        }}
      />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: "80px",
          width: "100%",
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <h1
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            color: "#ffd700",
            textShadow: "0 0 30px rgba(255, 215, 0, 0.6)",
            margin: 0,
            letterSpacing: "0.05em",
          }}
        >
          CHOOSE YOUR DESTINY
        </h1>
        <p
          style={{
            fontSize: "32px",
            color: "#ffffff",
            marginTop: "10px",
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)",
          }}
        >
          10 Unique Archetypes
        </p>
      </div>

      {/* Archetype grid with slower stagger */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "30px",
          marginTop: "60px",
        }}
      >
        {archetypes.map((archetype, index) => (
          <ArchetypeCard
            key={archetype.name}
            {...archetype}
            delay={60 + index * 20} // Slower stagger (20 frames instead of 8)
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
