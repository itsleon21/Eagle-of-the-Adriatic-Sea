# Eagle of the Adriatic

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

A single-player seaplane adventure across sunlit, Adriatic-inspired islands.

[Play online](https://eagle-of-the-adriatic-playtest.zola.chatgpt.site) · [Introduction](https://eagle-of-the-adriatic-playtest.zola.chatgpt.site/about.html?lang=en)

The hosted demo is owner-only and requires the owner's ChatGPT account. Local play needs no account.

## Experience

- Six islands, coastal towns, a lighthouse, a hidden cove, and mooring jetties.
- Red Wing One, M5, and Macchi MC.72, each with a distinct flying style.
- Waypoint challenges, island commissions, aerobatics, and photography.
- Supermarine S.6, Gloster VI, and Macchi M.67 in a dedicated racing hangar; three-lap time trials and fireworks.
- A day/night cycle, five weather conditions, volumetric clouds, and moving waves.

## Run locally

Requires Node.js 22.12 or newer. Chrome with hardware acceleration is recommended.

```sh
npm ci
npm run dev
```

Open the printed address. To validate and build:

```sh
npm test
npm run build
npm run preview
```

Static output: `dist/`. Introduction: `about.html`.

## Controls

W / S pitch, A / D turn, Q / E yaw, Shift / Ctrl throttle.
C camera, M chart, F moor, J journal, P photo, L landing guidance, Esc pause, H full guide.
Space + A / D rolls Red Wing One and MC.72. MC.72: X loop, Z Immelmann. I inverts pitch.

Progress is saved in your browser. Performance is game-tuned; the tribute race is not a historical event recreation.

Three.js · TypeScript · Vite · Blender

[Asset credits](docs/ASSET_MANIFEST.md) · [Aircraft references](docs/RACE_REFERENCES.md)
