/**
 * controls.js
 * ---------------------------------------------------------------------------
 * Requirement: "Camera will move around the houses" (keyboard) plus mouse
 * navigation.
 *
 * OrbitControls is NOT used - this is a hand-written spherical camera rig so
 * the project has no dependency beyond three.module.js:
 *
 *     eye = target + R * (sin(phi)cos(theta), cos(phi), sin(phi)sin(theta))
 *
 * Every input edits the *desired* radius/theta/phi/target, and update() eases
 * the live values towards them, which is what gives the smooth feel.
 *
 * Keyboard
 *   W / S ....... move closer / further (dolly)
 *   A / D ....... orbit left / right around the houses
 *   Q / E ....... orbit down / up (elevation)
 *   R / F ....... raise / lower the look-at point
 *   Arrows ...... pan the look-at point over the plot
 *   Shift ....... sprint (x2.4)
 *   1 - 5 ....... jump to a camera preset
 *   [ / ] ....... narrow / widen the perspective field of view
 *   Space ....... automatic orbit tour on / off
 *
 * Mouse
 *   left drag ... orbit
 *   right drag .. pan
 *   wheel ....... zoom (dolly)
 *   click ....... change the cottage texture (handled in main.js)
 */

import { THREE } from "./three-loader.js"
import { CAMERA, PRESETS } from "./config.js"

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export function createControls(camera, dom) {
	const keys = new Set()

	const live = {
		radius: CAMERA.start.radius,
		theta: CAMERA.start.theta,
		phi: CAMERA.start.phi,
		target: new THREE.Vector3(...CAMERA.start.target),
	}
	const want = {
		radius: live.radius,
		theta: live.theta,
		phi: live.phi,
		target: live.target.clone(),
	}

	const state = {
		tour: false,
		tourSpeed: 0.16,
		lastPreset: "1",
		dragging: null, // "orbit" | "pan"
		moved: false,
	}

	const pointer = new THREE.Vector2(-10, -10) // NDC, for raycasting
	let px = 0
	let py = 0

	/* ------------------------------------------------------------ keyboard */
	const onKeyDown = (e) => {
		// Never swallow browser shortcuts such as Ctrl+R or F5.
		if (e.ctrlKey || e.metaKey || e.altKey) return
		const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
		keys.add(k)
		if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
			e.preventDefault()
		}
	}
	const onKeyUp = (e) => {
		const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
		keys.delete(k)
	}
	const onBlur = () => keys.clear()

	window.addEventListener("keydown", onKeyDown)
	window.addEventListener("keyup", onKeyUp)
	window.addEventListener("blur", onBlur)

	/* --------------------------------------------------------------- mouse */
	const updatePointer = (e) => {
		const r = dom.getBoundingClientRect()
		pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
		pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1
	}

	const onPointerDown = (e) => {
		dom.setPointerCapture?.(e.pointerId)
		px = e.clientX
		py = e.clientY
		state.moved = false
		state.dragging = e.button === 0 ? "orbit" : "pan"
		updatePointer(e)
	}

	const onPointerMove = (e) => {
		updatePointer(e)
		if (!state.dragging) return
		const dx = e.clientX - px
		const dy = e.clientY - py
		px = e.clientX
		py = e.clientY
		if (Math.abs(dx) + Math.abs(dy) > 3) state.moved = true

		if (state.dragging === "orbit") {
			want.theta -= dx * 0.005
			want.phi = clamp(want.phi - dy * 0.004, CAMERA.phiMin, CAMERA.phiMax)
			state.tour = false
		} else {
			// Pan in the camera's own screen plane, projected onto the ground.
			const scale = want.radius * 0.0016
			const right = new THREE.Vector3()
			const up = new THREE.Vector3(0, 1, 0)
			camera.getWorldDirection(right)
			right.cross(up).normalize()
			want.target.addScaledVector(right, -dx * scale)
			want.target.y = clamp(want.target.y + dy * scale, 0.4, 40)
		}
	}

	const onPointerUp = (e) => {
		dom.releasePointerCapture?.(e.pointerId)
		state.dragging = null
	}

	const onWheel = (e) => {
		e.preventDefault()
		const step = want.radius * 0.0016 * e.deltaY
		want.radius = clamp(want.radius + step, CAMERA.radiusMin, CAMERA.radiusMax)
	}

	const onContextMenu = (e) => e.preventDefault()

	dom.addEventListener("pointerdown", onPointerDown)
	window.addEventListener("pointermove", onPointerMove)
	window.addEventListener("pointerup", onPointerUp)
	dom.addEventListener("wheel", onWheel, { passive: false })
	dom.addEventListener("contextmenu", onContextMenu)

	/* ------------------------------------------------------------ presets */
	function goToPreset(key) {
		const p = PRESETS.find((x) => x.key === key)
		if (!p) return null
		want.radius = p.radius
		want.theta = p.theta
		want.phi = p.phi
		want.target.set(...p.target)
		state.lastPreset = key
		state.tour = false
		return p.label
	}

	function toggleTour() {
		state.tour = !state.tour
		return state.tour
	}

	function adjustFov(delta) {
		camera.fov = clamp(camera.fov + delta, CAMERA.fovMin, CAMERA.fovMax)
		camera.updateProjectionMatrix()
		return camera.fov
	}

	function resetFov() {
		camera.fov = CAMERA.fov
		camera.updateProjectionMatrix()
		return camera.fov
	}

	/* ------------------------------------------------------------- update */
	const eye = new THREE.Vector3()

	function update(dt) {
		const boost = keys.has("Shift") || keys.has("shift") ? CAMERA.sprint : 1
		const d = dt * boost

		if (keys.has("w")) want.radius -= CAMERA.moveSpeed * d
		if (keys.has("s")) want.radius += CAMERA.moveSpeed * d
		if (keys.has("a")) want.theta -= CAMERA.orbitSpeed * d
		if (keys.has("d")) want.theta += CAMERA.orbitSpeed * d
		if (keys.has("q")) want.phi += CAMERA.elevSpeed * d
		if (keys.has("e")) want.phi -= CAMERA.elevSpeed * d
		if (keys.has("r")) want.target.y += CAMERA.panSpeed * 0.5 * d
		if (keys.has("f")) want.target.y -= CAMERA.panSpeed * 0.5 * d

		// Arrow keys pan the look-at point relative to the current heading.
		const fwd = new THREE.Vector3(Math.cos(live.theta), 0, Math.sin(live.theta))
		const side = new THREE.Vector3(-fwd.z, 0, fwd.x)
		if (keys.has("ArrowUp")) want.target.addScaledVector(fwd, -CAMERA.panSpeed * d)
		if (keys.has("ArrowDown")) want.target.addScaledVector(fwd, CAMERA.panSpeed * d)
		if (keys.has("ArrowLeft")) want.target.addScaledVector(side, -CAMERA.panSpeed * d)
		if (keys.has("ArrowRight")) want.target.addScaledVector(side, CAMERA.panSpeed * d)

		if (state.tour) want.theta += state.tourSpeed * dt

		want.radius = clamp(want.radius, CAMERA.radiusMin, CAMERA.radiusMax)
		want.phi = clamp(want.phi, CAMERA.phiMin, CAMERA.phiMax)
		want.target.y = clamp(want.target.y, 0.4, 40)
		want.target.x = clamp(want.target.x, -60, 60)
		want.target.z = clamp(want.target.z, -60, 60)

		// Critically-damped easing towards the desired values.
		const k = 1 - Math.exp(-CAMERA.damping * dt)
		live.radius += (want.radius - live.radius) * k
		live.theta += (want.theta - live.theta) * k
		live.phi += (want.phi - live.phi) * k
		live.target.lerp(want.target, k)

		// Spherical -> Cartesian.
		const sp = Math.sin(live.phi)
		eye.set(
			live.target.x + live.radius * sp * Math.cos(live.theta),
			live.target.y + live.radius * Math.cos(live.phi),
			live.target.z + live.radius * sp * Math.sin(live.theta),
		)
		// Never let the camera sink under the grass.
		eye.y = Math.max(eye.y, 0.8)
		camera.position.copy(eye)
		camera.lookAt(live.target)
	}

	function dispose() {
		window.removeEventListener("keydown", onKeyDown)
		window.removeEventListener("keyup", onKeyUp)
		window.removeEventListener("blur", onBlur)
		dom.removeEventListener("pointerdown", onPointerDown)
		window.removeEventListener("pointermove", onPointerMove)
		window.removeEventListener("pointerup", onPointerUp)
		dom.removeEventListener("wheel", onWheel)
		dom.removeEventListener("contextmenu", onContextMenu)
	}

	return {
		keys,
		live,
		want,
		state,
		pointer,
		update,
		goToPreset,
		toggleTour,
		adjustFov,
		resetFov,
		dispose,
		get wasDrag() {
			return state.moved
		},
	}
}
