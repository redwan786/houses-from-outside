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

## Quick start (Windows)

> The project needs a local HTTP server, because browsers refuse to load ES
> modules from `file://`. Both steps below are automated — just double-click.

**Step 1 — once, with internet:**

```
1-DOWNLOAD-LIBS.bat
```

Downloads `three.module.js` (about 1.2 MB) into the `vendor\` folder. Run it
only once. If it says `three.module.js already present`, you are done with this
step forever.

**Step 2 — every time you want to run the project:**

```
2-START-PROJECT.bat
```

Starts a local server on port **8204** in a separate window and opens
<http://localhost:8204/index.html> in your default browser. After Step 1 this
works completely **offline**.

To stop the project, close the black server window (or press `Ctrl+C` in it).

**Requirements:** Windows 10/11 and any modern browser (Chrome, Edge, Firefox),
plus **either** Python 3 **or** Node.js for the local server. The launcher tries
`python`, then `py -3`, then `node server.js` and uses whichever it finds.

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
CSE4204_Group7_C2_Houses_From_Outside/
├── 1-DOWNLOAD-LIBS.bat          run once, with internet
├── 2-START-PROJECT.bat          run every time
├── index.html                   page shell and HUD markup
├── server.js                    fallback local server (Node.js)
├── css/
│   └── style.css                HUD, help overlay, loading screen
├── js/
│   ├── three-loader.js          vendor → unpkg → jsDelivr fallback chain
│   ├── config.js                every tunable constant
│   ├── shaders.js               all hand-written GLSL
│   ├── materials.js             ShaderMaterial factories
│   ├── textures.js              texture loading, sRGB, anisotropy, tiling
│   ├── lighting.js              lights, shadows, day-night, orbiting light
│   ├── building.js              the building model
│   ├── cottage.js               the cottage model + texture switching
│   ├── environment.js           ground, sky, road, trees, props
│   ├── controls.js              custom keyboard + mouse camera rig
│   ├── hud.js                   HUD rendering and updates
│   └── main.js                  renderer, raycasting, render loop, snapshots
├── assets/textures/             31 generated PNG files
├── tools/
│   └── gen_textures.py          regenerates every texture
├── vendor/                      three.module.js lands here
├── README.md                    this file
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
| Black screen, console says `Failed to load module` | The page was opened as a file. Use `2-START-PROJECT.bat`, not a double-click on `index.html`. |
| Red panel: *Three.js could not be loaded* | `vendor\three.module.js` is missing and there is no internet. Run `1-DOWNLOAD-LIBS.bat` once while online. |
| `1-DOWNLOAD-LIBS.bat` fails | Download <https://unpkg.com/three@0.169.0/build/three.module.js> manually and save it into `vendor\` with exactly that file name. |
| `Python was not found` / server window closes at once | Install Python 3 from python.org **or** Node.js from nodejs.org, then run `2-START-PROJECT.bat` again. |
| Port 8204 already in use | Close the old server window, or edit the `PORT` line at the top of `2-START-PROJECT.bat`. |
| Textures are missing / white surfaces | The `assets\textures` folder was not copied. Re-extract the ZIP, keeping the folder structure intact. |
| Keyboard does nothing | Click once on the 3D area first so the canvas has focus. |
| Low frame rate | Press `X` to turn shadows off, or `M` to stop the wind. |

---

## Academic integrity

All JavaScript, GLSL, CSS and Python in this project was written by the two group
members listed above. Three.js (MIT licence) is the only third-party dependency
and it is loaded unmodified from `vendor/`. All textures are procedurally
generated by `tools/gen_textures.py`. The report screenshots must be captured
from your own running instance of the project with the `P` key — see
`SNAPSHOT-GUIDE.md`.


---

## Deployment (optional, not a course requirement)


### Files added for deployment

| File | Purpose |
|---|---|
| `vercel.json` | Cache headers only: long cache for `assets/textures/` and `vendor/`, no cache for `js/`. Safe to delete. |
| `.gitignore` | Ignores OS junk and caches. It deliberately does **not** ignore `vendor/three.module.js`, which must be committed so the deployed site never depends on a CDN. |


