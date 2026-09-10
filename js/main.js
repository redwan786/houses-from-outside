/**
 * main.js
 * ---------------------------------------------------------------------------
 * Entry point. Creates the renderer, builds the scene, wires the input and
 * runs the animation loop.
 *
 * CSE 4204 Computer Graphics Lab
 * Project Serial 08 - "Houses from outside"
 * Group 07, Section C2
 *   20220104141 - Jakaria Mahmud
 *   20220104147 - Md. Redwan Hossen
 */

import { THREE, THREE_SOURCE } from "./three-loader.js"
import { CAMERA, PROJECT, PRESETS, LIGHT } from "./config.js"
import { TextureLibrary } from "./textures.js"
import { createLighting } from "./lighting.js"
import { createEnvironment } from "./environment.js"
import { createBuilding } from "./building.js"
import { createCottage } from "./cottage.js"
import { createControls } from "./controls.js"
import { createHUD } from "./hud.js"

/* ------------------------------------------------------------------ setup */
const app = document.getElementById("app")

const renderer = new THREE.WebGLRenderer({
	antialias: true,
	powerPreference: "high-performance",
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
// The custom shaders encode sRGB themselves, so tone mapping stays off to
// keep them identical to the MeshStandardMaterial props.
renderer.toneMapping = THREE.NoToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
app.appendChild(renderer.domElement)
renderer.domElement.setAttribute("tabindex", "0")

const scene = new THREE.Scene()

// Requirement #3: perspective projection.
const camera = new THREE.PerspectiveCamera(
	CAMERA.fov,
	window.innerWidth / window.innerHeight,
	CAMERA.near,
	CAMERA.far,
)
scene.add(camera)

/* ------------------------------------------------------------------- HUD */
const hud = createHUD({
	onCottage: () => changeCottageSkin(),
	onFacade: () => changeFacade(),
	onDayNight: () => toggleDayNight(),
	onLight: () => toggleOrbitLight(),
	onSnapshot: () => requestSnapshot(),
})
hud.setSource(THREE_SOURCE)
hud.setLoadProgress(0.12, "Three.js ready - loading textures")

/* -------------------------------------------------------------- contents */
const textures = new TextureLibrary(renderer).loadAll()
const lighting = createLighting(scene)
const environment = createEnvironment(scene, textures, lighting.uniforms)
const building = createBuilding(textures, lighting.uniforms)
scene.add(building.group)
const cottage = createCottage(textures, lighting.uniforms)
scene.add(cottage.group)

// Point the sun's shadow frustum at the middle of the two houses.
lighting.sun.target.position.set(0, 4, 0)
lighting.sun.target.updateMatrixWorld()

const controls = createControls(camera, renderer.domElement)

/* -------------------------------------------------------- loading status */
THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => {
	hud.setLoadProgress(0.12 + 0.88 * (loaded / Math.max(total, 1)), `Loading textures ${loaded}/${total}`)
}
THREE.DefaultLoadingManager.onLoad = () => hud.hideLoading()
THREE.DefaultLoadingManager.onError = (url) => {
	console.warn("Texture failed to load:", url)
}
// Safety net: never leave the loading screen up forever.
window.setTimeout(() => hud.hideLoading(), 6000)

/* ---------------------------------------------------------- interactions */
const raycaster = new THREE.Raycaster()
let mouseClientX = 0
let mouseClientY = 0
let hovering = false

window.addEventListener("pointermove", (e) => {
	mouseClientX = e.clientX
	mouseClientY = e.clientY
})

/** Requirement: clicking the cottage changes its texture. */
renderer.domElement.addEventListener("pointerup", (e) => {
	if (e.button !== 0) return
	if (controls.state.moved) return // it was a camera drag, not a click
	raycaster.setFromCamera(controls.pointer, camera)
	const hits = raycaster.intersectObjects(cottage.clickTargets, false)
	if (hits.length > 0) changeCottageSkin()
})

function changeCottageSkin() {
	const name = cottage.cycleSkin()
	hud.toast(`Cottage texture: ${name}`)
	return name
}

function changeFacade() {
	const name = building.cycleSkin()
	hud.toast(`Building facade: ${name}`)
	return name
}

function toggleDayNight() {
	lighting.state.cycleRunning = !lighting.state.cycleRunning
	hud.setButtonLabels({
		dayNight: lighting.state.cycleRunning,
		light: lighting.state.orbitRunning,
	})
	hud.toast(lighting.state.cycleRunning ? "Day / night cycle running" : "Day / night cycle paused")
}

function toggleOrbitLight() {
	lighting.state.orbitRunning = !lighting.state.orbitRunning
	hud.setButtonLabels({
		dayNight: lighting.state.cycleRunning,
		light: lighting.state.orbitRunning,
	})
	hud.toast(lighting.state.orbitRunning ? "Orbiting light running" : "Orbiting light paused")
}

/* ------------------------------------------------------------- snapshots */
let snapshotPending = false
function requestSnapshot() {
	snapshotPending = true
}

function saveSnapshot() {
	try {
		const url = renderer.domElement.toDataURL("image/png")
		const d = new Date()
		const p = (n) => String(n).padStart(2, "0")
		const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
		const view = PRESETS.find((x) => x.key === controls.state.lastPreset)
		const label = (view ? view.label : "view").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
		const a = document.createElement("a")
		a.href = url
		a.download = `CSE4204_G7_${label}_${stamp}.png`
		document.body.appendChild(a)
		a.click()
		a.remove()
		hud.toast("Snapshot saved to your Downloads folder")
	} catch (err) {
		console.error(err)
		hud.toast("Snapshot failed - see the browser console")
	}
}

/* ------------------------------------------------------------- keyboard */
const WIND_STEPS = [0.13, 0.26, 0.42, 0.0]
let windStep = 0
let season = 0

window.addEventListener("keydown", (e) => {
	if (e.ctrlKey || e.metaKey || e.altKey) return
	const k = e.key.length === 1 ? e.key.toLowerCase() : e.key

	if (k === "Escape") {
		hud.toggleHelp(false)
		return
	}

	// camera presets
	if ("12345".includes(k)) {
		const label = controls.goToPreset(k)
		if (label) hud.toast(`View ${k}: ${label}`)
		return
	}

	switch (k) {
		case "c":
			changeCottageSkin()
			break
		case "b":
			changeFacade()
			break
		case "t":
			toggleDayNight()
			break
		case "y":
			lighting.setTimeOfDay(lighting.state.dayTime + 0.125)
			hud.toast("Time skipped forward")
			break
		case "l":
			toggleOrbitLight()
			break
		case "o": {
			const on = environment.togglePathRing()
			hud.toast(on ? "Orbit path shown" : "Orbit path hidden")
			break
		}
		case "k":
			season = season > 0.5 ? 0 : 1
			environment.setSeason(season)
			hud.toast(season > 0.5 ? "Autumn leaves" : "Summer leaves")
			break
		case "m": {
			windStep = (windStep + 1) % WIND_STEPS.length
			const w = WIND_STEPS[windStep]
			environment.setWind(w)
			hud.toast(w === 0 ? "Wind stopped" : `Wind strength ${w.toFixed(2)}`)
			break
		}
		case "x": {
			const on = !lighting.state.shadowsOn
			lighting.setShadows(on)
			renderer.shadowMap.needsUpdate = true
			hud.toast(on ? "Shadow maps on" : "Shadow maps off")
			break
		}
		case "p":
			requestSnapshot()
			break
		case "g":
			hud.toggleHelp()
			break
		case "h": {
			const on = hud.toggleHud()
			if (!on) hud.toast("HUD hidden - press H to bring it back", 1400)
			break
		}
		case "v":
			controls.goToPreset("1")
			controls.resetFov()
			hud.toast("View reset")
			break
		case "[":
			hud.toast(`Field of view ${Math.round(controls.adjustFov(-4))}\u00B0`, 900)
			break
		case "]":
			hud.toast(`Field of view ${Math.round(controls.adjustFov(4))}\u00B0`, 900)
			break
		case " ": {
			const on = controls.toggleTour()
			hud.toast(on ? "Auto orbit tour on" : "Auto orbit tour off")
			break
		}
		default:
			break
	}
})

/* ---------------------------------------------------------------- resize */
function onResize() {
	const w = window.innerWidth
	const h = window.innerHeight
	camera.aspect = w / h
	camera.updateProjectionMatrix()
	renderer.setSize(w, h)
}
window.addEventListener("resize", onResize)

/* --------------------------------------------------------- animation loop */
const clock = new THREE.Clock()
let frames = 0
let fpsAccum = 0
let fps = 0
let statsAccum = 0
let hoverAccum = 0

function formatClock(dayTime) {
	// dayTime 0 = sunrise (06:00), 0.25 = noon, 0.5 = sunset, 0.75 = midnight
	const hours = (dayTime * 24 + 6) % 24
	const h = Math.floor(hours)
	const m = Math.floor((hours - h) * 60)
	const label = lighting.state.night > 0.75 ? "night" : lighting.state.night > 0.25 ? "dusk" : "day"
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${label}`
}

function updateHover() {
	raycaster.setFromCamera(controls.pointer, camera)
	const hit = raycaster.intersectObjects(cottage.clickTargets, false).length > 0
	if (hit !== hovering) {
		hovering = hit
		cottage.setHover(hit)
		renderer.domElement.style.cursor = hit ? "pointer" : "default"
	}
	hud.setTooltip(
		hovering,
		mouseClientX,
		mouseClientY,
		`Click to change texture (now: ${cottage.skinName})`,
	)
}

function animate() {
	const dt = Math.min(clock.getDelta(), 0.05)
	const elapsed = clock.elapsedTime

	controls.update(dt)
	lighting.update(dt, elapsed)
	environment.syncOrb(lighting.orbitLight.position)
	environment.setLampGlow(lighting.state.night)
	building.update(dt)
	cottage.update(dt)

	// Hover test a few times a second is plenty and keeps the loop cheap.
	hoverAccum += dt
	if (hoverAccum > 0.06) {
		hoverAccum = 0
		updateHover()
	}

	if (snapshotPending) {
		// Render once with the overlay hidden, grab the pixels, then continue.
		snapshotPending = false
		hud.withHudHidden(() => {
			renderer.render(scene, camera)
			saveSnapshot()
		})
	} else {
		renderer.render(scene, camera)
	}

	/* ---- stats ------------------------------------------------------- */
	frames += 1
	fpsAccum += dt
	if (fpsAccum >= 0.5) {
		fps = Math.round(frames / fpsAccum)
		frames = 0
		fpsAccum = 0
	}
	statsAccum += dt
	if (statsAccum >= 0.2) {
		statsAccum = 0
		const p = camera.position
		hud.setStats({
			fps,
			time: formatClock(lighting.state.dayTime),
			light: lighting.state.orbitRunning ? "rotating" : "paused",
			cottage: cottage.skinName,
			building: building.skinName,
			fov: `${camera.fov.toFixed(0)}\u00B0`,
			cam: `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
			triangles: renderer.info.render.triangles.toLocaleString(),
			shadows: lighting.state.shadowsOn ? "on" : "off",
		})
	}

	requestAnimationFrame(animate)
}

/* ------------------------------------------------------------------ start */
hud.setButtonLabels({ dayNight: true, light: true })
controls.goToPreset("1")
onResize()
animate()

console.info(
	`%c${PROJECT.course}%c\n${PROJECT.title} - Serial ${PROJECT.serial}, Group ${PROJECT.group} (${PROJECT.section})\n` +
		PROJECT.members.map((m) => `  ${m.id}  ${m.name}`).join("\n") +
		`\nThree.js loaded from: ${THREE_SOURCE}\nOrbit light: radius ${LIGHT.orbit.radius}, speed ${LIGHT.orbit.speed} rad/s\nPress G in the page for the full control list.`,
	"font-weight:bold;color:#5e9fe8",
	"color:inherit",
)
