/**
 * materials.js
 * ---------------------------------------------------------------------------
 * Factory helpers that wire the GLSL in shaders.js to real
 * THREE.ShaderMaterial instances.
 *
 * Every lit custom material spreads the shared light uniforms, so the objects
 * `lighting.js` mutates each frame are the exact same objects referenced by
 * all of these materials - one write updates the whole scene.
 */

import { THREE } from "./three-loader.js"
import {
	SKY_VERT,
	SKY_FRAG,
	LIT_VERT,
	FACADE_FRAG,
	COTTAGE_FRAG,
	FOLIAGE_VERT,
	FOLIAGE_FRAG,
	SMOKE_VERT,
	SMOKE_FRAG,
	GLOW_VERT,
	GLOW_FRAG,
} from "./shaders.js"
import { SKY } from "./config.js"

/* -------------------------------------------------------------------- sky */
export function makeSkyMaterial(L) {
	return new THREE.ShaderMaterial({
		name: "SkyDomeShader",
		vertexShader: SKY_VERT,
		fragmentShader: SKY_FRAG,
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: {
			uZenithDay: { value: new THREE.Color(SKY.zenithDay) },
			uHorizonDay: { value: new THREE.Color(SKY.horizonDay) },
			uZenithNight: { value: new THREE.Color(SKY.zenithNight) },
			uHorizonNight: { value: new THREE.Color(SKY.horizonNight) },
			// shared references - the sky follows the real sun automatically
			uSunDir: L.uSunDir,
			uSunTint: L.uSunColor,
			uNight: L.uNight,
			uTime: L.uTime,
		},
	})
}

/* --------------------------------------------------------- building walls */
/**
 * @param L      shared light uniforms
 * @param maps   { mapA, normalA, mapB, normalB, mask }
 * @param repeat [x, y] number of window bays x number of floors
 * @param mixRef shared { value } cross-fade uniform for the facade skin
 */
export function makeFacadeMaterial(L, maps, repeat, mixRef) {
	return new THREE.ShaderMaterial({
		name: "BuildingFacadeShader",
		vertexShader: LIT_VERT,
		fragmentShader: FACADE_FRAG,
		uniforms: {
			...L,
			uMap: { value: maps.mapA },
			uNormalMap: { value: maps.normalA },
			uMapB: { value: maps.mapB },
			uNormalMapB: { value: maps.normalB },
			uWindowMask: { value: maps.mask },
			uMix: mixRef,
			uRepeat: { value: new THREE.Vector2(repeat[0], repeat[1]) },
			uOffset: { value: new THREE.Vector2(0, 0) },
			uNormalStrength: { value: 1.15 },
			uShininess: { value: 26 },
			uSpecStrength: { value: 0.14 },
			uWindowColor: { value: new THREE.Color(0xffd9a2) },
			uWindowGlow: { value: 1.35 },
			uTint: { value: new THREE.Color(0xffffff) },
		},
	})
}

/* ---------------------------------------------------------- cottage walls */
/**
 * All four cottage walls share one skin-uniform bundle, so a single click
 * cross-fades the whole cottage at once. Only uRepeat differs per wall.
 */
export function makeCottageMaterial(L, skinUniforms, repeat) {
	return new THREE.ShaderMaterial({
		name: "CottageWallShader",
		vertexShader: LIT_VERT,
		fragmentShader: COTTAGE_FRAG,
		uniforms: {
			...L,
			...skinUniforms,
			uRepeat: { value: new THREE.Vector2(repeat[0], repeat[1]) },
			uOffset: { value: new THREE.Vector2(0, 0) },
		},
	})
}

/** The uniform bundle shared by every cottage wall material. */
export function makeCottageSkinUniforms(skinA, skinB) {
	return {
		uMapA: { value: skinA.map },
		uNormalA: { value: skinA.normal },
		uTintA: { value: new THREE.Color(skinA.tint) },
		uMapB: { value: skinB.map },
		uNormalB: { value: skinB.normal },
		uTintB: { value: new THREE.Color(skinB.tint) },
		uMix: { value: 0 },
		uShininess: { value: skinA.shininess },
		uSpecStrength: { value: skinA.spec },
		uNormalStrength: { value: 1.1 },
		uHighlight: { value: 0 },
	}
}

/* ---------------------------------------------------------------- foliage */
export function makeFoliageMaterial(L, map, normalMap, seasonRef, windRef) {
	return new THREE.ShaderMaterial({
		name: "FoliageWindShader",
		vertexShader: FOLIAGE_VERT,
		fragmentShader: FOLIAGE_FRAG,
		uniforms: {
			...L,
			uMap: { value: map },
			uNormalMap: { value: normalMap },
			uRepeat: { value: new THREE.Vector2(2, 2) },
			uNormalStrength: { value: 0.9 },
			uShininess: { value: 12 },
			uSpecStrength: { value: 0.06 },
			uSeason: seasonRef,
			uWind: windRef,
			uAutumnColor: { value: new THREE.Color(0xd08a34) },
		},
	})
}

/* ------------------------------------------------------------------ smoke */
export function makeSmokeMaterial(L) {
	return new THREE.ShaderMaterial({
		name: "ChimneySmokeShader",
		vertexShader: SMOKE_VERT,
		fragmentShader: SMOKE_FRAG,
		transparent: true,
		depthWrite: false,
		blending: THREE.NormalBlending,
		uniforms: {
			uTime: L.uTime,
			uSize: { value: 0.55 },
			uRise: { value: 9.5 },
			uSpread: { value: 1.5 },
			uColor: { value: new THREE.Color(0xd9d6d0) },
			uOpacity: { value: 0.42 },
		},
	})
}

/* ------------------------------------------------------------------- glow */
export function makeGlowMaterial(color, { power = 2.2, strength = 1.5 } = {}) {
	return new THREE.ShaderMaterial({
		name: "FresnelGlowShader",
		vertexShader: GLOW_VERT,
		fragmentShader: GLOW_FRAG,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: THREE.FrontSide,
		uniforms: {
			uColor: { value: new THREE.Color(color) },
			uPower: { value: power },
			uStrength: { value: strength },
		},
	})
}
