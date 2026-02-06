# LTCG Hype Video

An epic 30-second hype video for the LTCG card game, created with Remotion.

## 🎬 Video Structure

**Total Duration:** 30 seconds (900 frames at 30fps)

1. **Opening Scene (0-4s):** Logo reveal with golden glow effects
2. **Archetype Showcase (4-14s):** Animated display of all 10 archetypes
3. **Gameplay Clips (14-25s):** Montage of epic trailer, card showcase, and dragon reveal
4. **Final CTA (25-30s):** Call-to-action with "PLAY NOW" button

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd apps/hype-video
bun install
```

### 2. Preview the Video

Launch the Remotion Studio to preview and edit:

```bash
bun start
```

This will open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Render the Video

Render the final video to `out/hype-video.mp4`:

```bash
bun run render
```

Or use the full remotion render command with custom settings:

```bash
bunx remotion render HypeVideo out/hype-video.mp4 --codec=h264
```

## 🎨 Customization

### Adjust Video Duration

Edit [src/Root.tsx](src/Root.tsx#L8):

```tsx
durationInFrames={900} // Change this value (900 = 30s at 30fps)
```

### Change Resolution

Edit [src/Root.tsx](src/Root.tsx#L10-11):

```tsx
width={1920}  // Change to 1080 for Instagram, 1080 for square
height={1080} // Change to 1920 for stories, 1080 for square
```

### Modify Scene Timings

Edit [src/HypeVideo.tsx](src/HypeVideo.tsx):

```tsx
<Sequence from={0} durationInFrames={120}>
  <OpeningScene />
</Sequence>
```

### Add Background Music

If you have an audio track, add it to the main composition:

```tsx
import { Audio } from "remotion";

<Audio src="../web/public/audio/your-music.mp3" volume={0.5} />
```

## 📁 File Structure

```
apps/hype-video/
├── src/
│   ├── scenes/
│   │   ├── OpeningScene.tsx      # Logo reveal
│   │   ├── ArchetypeShowcase.tsx # 10 archetypes grid
│   │   ├── GameplayClips.tsx     # Video montage
│   │   └── FinalCTA.tsx          # Call-to-action
│   ├── HypeVideo.tsx             # Main composition
│   ├── Root.tsx                  # Remotion root config
│   ├── webpack-override.ts       # Asset handling
│   └── index.ts                  # Entry point
├── remotion.config.ts            # Remotion configuration
├── package.json
└── README.md
```

## 🎯 Assets Used

The video uses assets from `apps/web/public/`:

- **Logo:** `assets/logo-main.png`
- **Archetype Icons:** `brand/icons/archetypes/*.png`
- **Videos:**
  - `videos/epic-trailer.mp4`
  - `videos/card-showcase.mp4`
  - `videos/infernal-dragons-reveal.mp4`

## 🎞️ Render Options

### High Quality (for distribution)

```bash
bunx remotion render HypeVideo out/hype-video.mp4 \
  --codec=h264 \
  --crf=18 \
  --pixel-format=yuv420p \
  --video-bitrate=8M
```

### Social Media Formats

**Instagram Reel (1080x1920):**
```bash
bunx remotion render HypeVideo out/hype-video-reel.mp4 \
  --height=1920 --width=1080
```

**Square (1080x1080):**
```bash
bunx remotion render HypeVideo out/hype-video-square.mp4 \
  --height=1080 --width=1080
```

**Twitter/X (1280x720):**
```bash
bunx remotion render HypeVideo out/hype-video-twitter.mp4 \
  --height=720 --width=1280
```

### GIF Export

```bash
bunx remotion render HypeVideo out/hype-video.gif \
  --codec=gif \
  --scale=0.5
```

## 🎨 Color Palette

- **Gold:** `#ffd700` - Primary accent, CTAs
- **Dark Blue:** `#1a1a2e` - Background base
- **Deep Blue:** `#16213e` - Secondary background
- **Ocean Blue:** `#0f3460` - Gradient accent
- **Black:** `#0a0a0a` - Pure black backgrounds

## 🔧 Troubleshooting

### Assets Not Loading

Make sure asset paths are correct. They use relative paths from the hype-video directory:

```tsx
src="../../web/public/assets/logo-main.png"
```

### Video Performance Issues

If preview is laggy, try:
1. Reduce preview quality in Remotion Studio settings
2. Close other applications
3. Use `--scale=0.5` flag when rendering for faster processing

### Missing Fonts

The video uses system fonts. For custom fonts, add them to your project:

```tsx
import { loadFont } from "@remotion/fonts";

loadFont({
  family: "YourFont",
  url: "/path/to/font.woff2",
}).then(() => {
  // Font loaded
});
```

## 📦 Deployment

The rendered video can be:
- Uploaded to YouTube, Vimeo, etc.
- Embedded in your website
- Shared on social media
- Used in presentations

## 🎓 Learn More

- [Remotion Documentation](https://remotion.dev/docs)
- [Remotion Examples](https://remotion.dev/showcase)
- [React Documentation](https://react.dev)

## 📝 License

Part of the LTCG project.
