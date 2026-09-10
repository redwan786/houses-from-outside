/**
 * lighting.js
 * ---------------------------------------------------------------------------
 * Requirement #2 (lighting) and the required animation (a light that rotates
 * around the building) both live here.
 *
 * There are two parallel lighting systems that must agree with each other:
 *
 *  A. Real Three.js lights  - HemisphereLight, DirectionalLight (sun, casts
 *     shadow maps), PointLight (the orbiting light, casts shadow maps) and a
 *     PointLight for the street lamp. These light every MeshStandardMaterial
 *     prop (ground, roofs, trees, fence, ...).
 *
 *  B. Hand-written GLSL lighting - the same lights are also uploaded as plain
 *     uniforms so the custom shaders in shaders.js can compute their own
 *     Blinn-Phong lighting for the building and cottage walls.
 *
 * Three.js uses physically-based units: a light contributes
 *     radiance = color * intensity / PI            (directional / hemisphere)
 *     radiance = color * intensity / (PI * d^2)    (point light)
 * so the uniform values handed to the custom shaders are divided by PI (and
 * scaled by POINT_GAIN for the clamped-range falloff the shaders use) to keep
 * the two systems visually consistent.
 */

import { THREE } from "./three-loader.js"
import { LIGHT, SKY, PLOT } from "./config.js"

const INV_PI = 1 / Math.PI
// The shaders use a clamped linear falloff instead of true inverse-square,
// so point lights get a gain factor calibrated at ~12 units distance.
const ORBIT_GAIN = 0.85
const LAMP_GAIN = 0.55

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t

export function createLighting(scene) {
	const buildingCenter = new THREE.Vector3(
		PLOT.building.position[0],
		0,
		PLOT.building.position[2],
	)

	/* --------------------------------------------------- shared GLSL uniforms */
	const uniforms = {
		uAmbientColor: { value: new THREE.Color(LIGHT.ambient.dayColor) },
		uAmbientIntensity: { value: LIGHT.ambient.dayIntensity * INV_PI },
		uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
		uSunColor: { value: new THREE.Color(LIGHT.sun.dayColor) },
		uSunIntensity: { value: LIGHT.sun.dayIntensity * INV_PI },
		uOrbitPos: { value: new THREE.Vector3() },
		uOrbitColor: { value: new THREE.Color(LIGHT.orbit.color) },
		uOrbitIntensity: { value: ORBIT_GAIN },
		uOrbitRange: { value: LIGHT.orbit.range },
		uLampPos: { value: new THREE.Vector3(9, 7.4, 19) },
		uLampColor: { value: new THREE.Color(LIGHT.streetLamp.color) },
		uLampIntensity: { value: 0 },
		uLampRange: { value: LIGHT.streetLamp.distance },
		uFogColor: { value: new THREE.Color(SKY.fogDay) },
		uFogNear: { value: SKY.fogNear },
		uFogFar: { value: SKY.fogFar },
		uNight: { value: 0 },
		uTime: { value: 0 },
	}

	/* ------------------------------------------------------ real Three lights */
	const hemi = new THREE.HemisphereLight(
		LIGHT.ambient.dayColor,
		0x4a4335,
		LIGHT.ambient.dayIntensity,
	)
	scene.add(hemi)

	const sun = new THREE.DirectionalLight(LIGHT.sun.dayColor, LIGHT.sun.dayIntensity)
	sun.castShadow = true
	sun.shadow.mapSize.set(2048, 2048)
	sun.shadow.camera.near = 1
	sun.shadow.camera.far = 260
	sun.shadow.camera.left = -52
	sun.shadow.camera.right = 52
	sun.shadow.camera.top = 52
	sun.shadow.camera.bottom = -52
	sun.shadow.bias = -0.0006
	sun.shadow.normalBias = 0.035
	scene.add(sun)
	scene.add(sun.target)
	sun.target.position.set(0, 3, 0)

	// The star of the show: a point light that orbits the building.
	const orbitLight = new THREE.PointLight(
		LIGHT.orbit.color,
		LIGHT.orbit.intensity,
		0,
		2,
	)
	orbitLight.castShadow = true
	orbitLight.shadow.mapSize.set(1024, 1024)
	orbitLight.shadow.camera.near = 0.6
	orbitLight.shadow.camera.far = 70
	orbitLight.shadow.bias = -0.004
	scene.add(orbitLight)

	const lampLight = new THREE.PointLight(
		LIGHT.streetLamp.color,
		0,
		LIGHT.streetLamp.distance,
		2,
	)
	lampLight.position.copy(uniforms.uLampPos.value)
	scene.add(lampLight)

	/* ---------------------------------------------------------------- state */
	const state = {
		dayTime: LIGHT.cycle.startTime, // 0..1 around the sky
		cycleRunning: true,
		orbitAngle: 0,
		orbitRunning: true,
		night: 0,
		shadowsOn: true,
		bodyIsMoon: false,
	}

	const tmpDir = new THREE.Vector3()
	const dayAmbient = new THREE.Color(LIGHT.ambient.dayColor)
	const nightAmbient = new THREE.Color(LIGHT.ambient.nightColor)
	const daySun = new THREE.Color(LIGHT.sun.dayColor)
	const nightSun = new THREE.Color(LIGHT.sun.nightColor)
	const fogDay = new THREE.Color(SKY.fogDay)
	const fogNight = new THREE.Color(SKY.fogNight)

	function update(dt, elapsed) {
		uniforms.uTime.value = elapsed

		/* ---- day / night cycle ------------------------------------------- */
		if (state.cycleRunning) {
			state.dayTime = (state.dayTime + dt * LIGHT.cycle.speed) % 1
		}

		// Sun travels a tilted great circle. When it drops below the horizon
		// the same vector is mirrored and becomes the moon, so we always have
		// one celestial body casting shadows.
		const a = state.dayTime * Math.PI * 2
		tmpDir.set(Math.cos(a) * 0.88, Math.sin(a), 0.44).normalize()
		state.bodyIsMoon = tmpDir.y < -0.02
		if (state.bodyIsMoon) tmpDir.negate()

		// Smooth 0..1 night factor from the real (unmirrored) sun height.
		const rawHeight = state.bodyIsMoon ? -tmpDir.y : tmpDir.y
		state.night = 1 - clamp01((rawHeight + 0.13) / 0.34)
		const night = state.night

		uniforms.uSunDir.value.copy(tmpDir)
		uniforms.uNight.value = night

		sun.position.copy(tmpDir).multiplyScalar(LIGHT.sun.distance)
		sun.color.copy(daySun).lerp(nightSun, night)
		sun.intensity = lerp(LIGHT.sun.dayIntensity, LIGHT.sun.nightIntensity, night)
		uniforms.uSunColor.value.copy(sun.color)
		uniforms.uSunIntensity.value = sun.intensity * INV_PI

		hemi.color.copy(dayAmbient).lerp(nightAmbient, night)
		hemi.intensity = lerp(
			LIGHT.ambient.dayIntensity,
			LIGHT.ambient.nightIntensity,
			night,
		)
		uniforms.uAmbientColor.value.copy(hemi.color)
		uniforms.uAmbientIntensity.value = hemi.intensity * INV_PI

		if (scene.fog) {
			scene.fog.color.copy(fogDay).lerp(fogNight, night)
			uniforms.uFogColor.value.copy(scene.fog.color)
		}

		/* ---- required animation: light rotating around the building ------ */
		if (state.orbitRunning) {
			state.orbitAngle += dt * LIGHT.orbit.speed
		}
		const r = LIGHT.orbit.radius
		orbitLight.position.set(
			buildingCenter.x + Math.cos(state.orbitAngle) * r,
			LIGHT.orbit.height + Math.sin(state.orbitAngle * 2) * 1.6,
			buildingCenter.z + Math.sin(state.orbitAngle) * r,
		)
		uniforms.uOrbitPos.value.copy(orbitLight.position)

		/* ---- street lamp only burns after dark --------------------------- */
		lampLight.intensity = LIGHT.streetLamp.intensity * night
		uniforms.uLampIntensity.value = LAMP_GAIN * night
	}

	function setShadows(on) {
		state.shadowsOn = on
		sun.castShadow = on
		orbitLight.castShadow = on
	}

	/** Jump straight to noon / dusk / midnight for the demo. */
	function setTimeOfDay(value) {
		state.dayTime = ((value % 1) + 1) % 1
	}

	return {
		uniforms,
		state,
		sun,
		hemi,
		orbitLight,
		lampLight,
		buildingCenter,
		update,
		setShadows,
		setTimeOfDay,
	}
}
