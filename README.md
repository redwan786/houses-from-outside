# CSE 4204 — Computer Graphics Lab — Final Project

# Project 08 — Houses from Outside

A Three.js scene of a five-storey **building** and a gabled **cottage**, rendered
with six hand-written GLSL shader programs, a full lighting rig with soft
shadows, a light that orbits the building, procedurally generated textures, and
complete keyboard and mouse interaction.

| | |
|---|---|
| **Course** | Computer Graphics Lab (CSE 4204) |
| **University** | Ahsanullah University of Science and Technology |
| **Assigned Serial No.** | 08 |
| **Section** | C (C2) |
| **Group No.** | 07 |
| **Marks** | 25 |
| **Prescribed tool** | Three.js |
| **Submission date** | 30 September 2026 |

| Student ID | Name |
|---|---|
| 20220104141 | Jakaria Mahmud |
| 20220104147 | Md. Redwan Hossen |

---

## Quick start (Windows 11)

> A browser refuses to load ES modules and textures over `file://`, so the
> project must be opened through a **local HTTP server**. Double-clicking
> `index.html` only shows a black screen. Pick any one of the three methods
> below - they all do the same thing.
>
> Three.js is already inside `vendor/three.module.js`, so **no internet is
> needed** at any point.

### Method 1 - VS Code Live Server (easiest for a live demonstration)

1. Install [Visual Studio Code](https://code.visualstudio.com/), then inside it
   install the extension **Live Server** (publisher: Ritwick Dey).
2. `File > Open Folder...` and select this project folder.
3. Right-click `index.html` in the Explorer panel and choose
   **Open with Live Server**.
4. The default browser opens at `http://127.0.0.1:5500/index.html`.
5. To stop it, click **Port: 5500** in the blue status bar at the bottom.

### Method 2 - Python

1. Open this folder in File Explorer.
2. Click the address bar, type `cmd`, press `Enter`.
3. Run:

```
python -m http.server 8204
```

   If Windows says `python` is not recognised, use `py -3 -m http.server 8204`.
4. Open <http://localhost:8204/index.html> in Chrome, Edge or Firefox.
5. Press `Ctrl + C` in the terminal to stop the server.

### Method 3 - Node.js (uses `server.js` from this folder)

1. Open this folder in File Explorer, type `cmd` in the address bar, `Enter`.
2. Run:

```
node server.js
```

3. Open <http://localhost:8204/index.html>.
4. Press `Ctrl + C` to stop the server.

**Requirements:** Windows 10/11 and any modern browser with WebGL 2 (Chrome,
Edge or Firefox). Method 2 needs Python 3, Method 3 needs Node.js, Method 1
needs neither.

---

## Controls

### Camera — keyboard (requirement: *camera will move around the houses*)

| Key | Action |
|---|---|
| `W` / `S` | Move closer to / further from the houses |
| `A` / `D` | Orbit left / right around the houses |
| `Q` / `E` | Look down / look up (elevation) |
| `R` / `F` | Raise / lower the look-at point |
| `←` `→` `↑` `↓` | Pan the look-at point across the plot |
| `Shift` (hold) | Move 2.4× faster |
| `1` … `5` | Camera presets: front view, cottage close-up, building close-up, aerial overview, street level |
| `[` / `]` | Field of view −4° / +4° (25°–95°) |
| `V` | Reset the view and the field of view |
| `Space` | Start / stop the automatic orbit tour |

### Scene — keyboard

| Key | Action |
|---|---|
| `C` | Next cottage texture |
| `B` | Toggle building facade (Red Brick ⇄ Grey Concrete) |
| `T` | Pause / resume the day–night cycle |
| `Y` | Skip time forward (about three hours) |
| `L` | Pause / resume the orbiting light |
| `O` | Show / hide the orbit path ring |
| `K` | Season toggle (summer ⇄ autumn foliage) |
| `M` | Cycle wind strength (calm → light → strong → off) |
| `X` | Shadow maps on / off |
| `P` | **Save a PNG snapshot** to your Downloads folder |
| `G` | Open / close the help overlay |
| `H` | Hide / show the HUD |
| `Escape` | Close the help overlay |

### Mouse (requirement: *texture of the cottage will change*)

| Input | Action |
|---|---|
| **Click the cottage** | Cross-fades its wall texture to the next material |
| Hover the cottage | Blue rim highlight + tooltip with the texture name |
| Left drag | Orbit the camera |
| Right / middle drag | Pan the camera target |
| Mouse wheel | Zoom in / out |

Cottage texture order: **Wooden Planks → Stone Masonry → White Plaster → Beige
Brick → (repeat)**. Dragging the camera never changes the texture by accident —
a release is ignored if the pointer moved more than a few pixels.

---

## How each requirement is satisfied

| # | Requirement | Where it is implemented |
|---|---|---|
| 1 | **Custom shaders** | `js/shaders.js` — six GLSL programs: sky dome, building facade, cottage walls, foliage wind, chimney smoke, Fresnel glow. All are `THREE.ShaderMaterial`; no built-in material chunks are used. |
| 2 | **Implementation of lighting** | `js/lighting.js` — hemisphere ambient, directional sun/moon, an orbiting `PointLight`, a street lamp, 2048² PCF soft shadow maps, and a hand-written Blinn-Phong model inside the shaders. |
| 3 | **Perspective projection** | `js/main.js` — `THREE.PerspectiveCamera(55°, aspect, 0.1, 1200)`, with FOV adjustable at runtime via `[` and `]`. |
| 4 | **Texture for each object** | `assets/textures/` — 14 procedurally generated tileable sets, 31 PNG files including matching normal maps. Every mesh in the scene is textured. |
| 5 | **Animation** | `js/lighting.js` — the light position rotates around the building (the required animation), plus the day–night cycle, foliage wind, chimney smoke particles, texture cross-fade and eased camera motion. |
| 6 | **Mouse and keyboard interaction** | `js/main.js` (raycaster picking) and `js/controls.js` (custom camera rig). |
| 7 | 3D object 1 — **a building with texture** | `js/building.js` |
| 8 | 3D object 2 — **a cottage with texture** | `js/cottage.js` |

---

## What is in the scene

**Building** (15 × 18 × 11 units, five floors) — custom facade shader with a
window mask driving specular response and night-time emissive window glow,
plinth, roof slab, parapet, stair head-room, water tank on legs, four AC outdoor
units, antenna mast, entrance canopy, shopfront glass, double door, steps.

**Cottage** (10 × 4.6 × 8.4 units, gabled) — four switchable wall materials with
cross-fading colour **and** normal maps, stone base course, two roof planes with
a ridge cap, brick chimney with a 240-point GPU smoke system, porch with posts,
railings, canopy and steps, panelled door, five framed windows, garden fence.

**Environment** — sky dome with sun, moon and a twinkling star field, 260 × 260
grass ground, asphalt road, cobblestone paths, contact-shadow decals, eight trees
and eight bushes that sway in the wind, flower patches, a working street lamp, a
bench, boundary fencing, and distance fog matched to the sky colour.

**HUD** — project identity, live scene state (fps, time of day, current textures,
FOV, camera position, triangle count), a quick-control cheat sheet, six action
buttons and a full help overlay (`G`). The HUD hides itself automatically for one
frame when a snapshot is taken.

---

## Project structure

```
houses-from-outside/
|-- index.html                   page shell and HUD markup
|-- server.js                    optional local server (Node.js)
|-- css/
|   `-- style.css                HUD, help overlay, loading screen
|-- js/
|   |-- three-loader.js          loads Three.js from vendor/, CDN as fallback
|   |-- config.js                every tunable constant
|   |-- shaders.js               all hand-written GLSL
|   |-- materials.js             ShaderMaterial factories
|   |-- textures.js              texture loading, sRGB, anisotropy, tiling
|   |-- lighting.js              lights, shadows, day-night, orbiting light
|   |-- building.js              the building model
|   |-- cottage.js               the cottage model + texture switching
|   |-- environment.js           ground, sky, road, trees, props
|   |-- controls.js              custom keyboard + mouse camera rig
|   |-- hud.js                   HUD rendering and updates
|   `-- main.js                  renderer, raycasting, render loop, snapshots
|-- assets/
|   `-- textures/                31 generated PNG files
|-- tools/
|   `-- gen_textures.py          regenerates every texture
|-- vendor/
|   `-- three.module.js          Three.js r169 (MIT), kept for offline running
|-- vercel.json                  cache headers, only used by the optional deploy
|-- .gitignore
`-- README.md                    this file
```

---

## Technical notes

**Colour management.** Tone mapping is disabled (`NoToneMapping`). Every texture
sample is decoded with a hand-written `sRGBToLinear()`, all lighting maths runs
in linear space, and the result is encoded with `linearToSRGB()` before it is
written out. Linear fog is reimplemented inside each shader, because `scene.fog`
is only injected into Three.js built-in materials.

**Light-unit matching.** `MeshStandardMaterial` is physically based and divides
incoming radiance by π internally, while our shaders are Blinn-Phong. The shader
uniforms are therefore driven from the same light objects but divided by π
(`uSunIntensity = sun.intensity / Math.PI`), with separate calibrated gains for
the two point lights. A shader-lit wall and a standard-material prop beside it
receive visually identical illumination.

**Shared uniforms.** `lighting.js` creates one set of light uniform objects that
every custom material spreads into its own uniform map. Writing a single `.value`
updates the sky, the facade, the cottage and all foliage in the same frame.

**Normals.** The shaders use `mat3(modelMatrix) * normal`, which is only valid
without non-uniform scaling. Every box is therefore created at its true size with
`new THREE.BoxGeometry(w, h, d)` and never scaled; foliage is scaled uniformly
only.

**Generated textures.** All 31 PNG files are produced by `tools/gen_textures.py`
(Pillow + NumPy), including normal maps derived from each pattern's height field.
No texture was downloaded, so there is no copyright or plagiarism risk. To
regenerate them:

```
pip install pillow numpy
python tools/gen_textures.py
```

**Offline-safe loading.** `js/three-loader.js` tries `vendor/three.module.js`
first, then unpkg, then jsDelivr, and paints a readable instruction panel if all
three fail. The HUD shows which source was used.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Black screen; console shows `Failed to load module script` or a CORS error | `index.html` was opened by double-click as `file://`. Start a local server (see Quick start) and open the `http://localhost:...` address instead. |
| Red panel: *Three.js could not be loaded* | `vendor/three.module.js` is missing. Put the file back into `vendor/`; it must be about 1.2 MB. |
| `python` is not recognised | Use `py -3 -m http.server 8204`, or Method 1 (Live Server), or Method 3 (`node server.js`). |
| Port 8204 is already in use | Start on another port, e.g. `python -m http.server 8500`, then open <http://localhost:8500/index.html>. |
| Textures missing, surfaces are white | The `assets/textures` folder was not copied. Re-extract the ZIP and keep the folder structure intact. |
| Keyboard does nothing | Click once on the 3D area first so the canvas has focus. |
| Low frame rate | Press `X` to switch shadows off, or `M` to stop the wind. |

---

## Academic integrity

All JavaScript, GLSL, CSS and Python in this project was written by the two group
members listed above. Three.js (MIT licence) is the only third-party dependency
and it is loaded unmodified from `vendor/`. All textures are procedurally
generated by `tools/gen_textures.py`. The report screenshots must be captured
from your own running instance of the project with the `P` key.


---

## Deployment (optional, not a course requirement)


### Files added for deployment

| File | Purpose |
|---|---|
| `vercel.json` | Cache headers only: long cache for `assets/textures/` and `vendor/`, no cache for `js/`. Safe to delete. |
| `.gitignore` | Ignores OS junk and caches. It deliberately does **not** ignore `vendor/three.module.js`, which must be committed so the deployed site never depends on a CDN. |


