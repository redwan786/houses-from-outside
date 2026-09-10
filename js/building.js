/**
 * building.js
 * ---------------------------------------------------------------------------
 * 3D Object #1 - the multi-storey building (Serial 08 requirement).
 *
 * The four walls are BoxGeometry faces driven by the custom facade shader,
 * one ShaderMaterial per face so each face gets the correct number of window
 * bays (no stretched textures on the narrow sides). The roof furniture,
 * plinth, canopy and entrance use MeshStandardMaterial so they receive real
 * Three.js shadow maps.
 *
 * Material index order for BoxGeometry is: +x, -x, +y, -y, +z, -z
 */

import { THREE } from "./three-loader.js"
import { PLOT, BUILDING_SKINS } from "./config.js"
import { makeFacadeMaterial } from "./materials.js"

export function createBuilding(tex, L) {
	const cfg = PLOT.building
	const W = cfg.width
	const D = cfg.depth
	const H = cfg.floors * cfg.floorHeight

	const group = new THREE.Group()
	group.name = "Building"
	group.position.set(cfg.position[0], cfg.position[1], cfg.position[2])
	group.rotation.y = cfg.rotation

	/* ------------------------------------------------- facade skin switching */
	// One shared cross-fade uniform: 0 = red brick, 1 = grey concrete.
	const skinMix = { value: 0 }
	const maps = {
		mapA: tex.color[BUILDING_SKINS[0].map],
		normalA: tex.normal[BUILDING_SKINS[0].map],
		mapB: tex.color[BUILDING_SKINS[1].map],
		normalB: tex.normal[BUILDING_SKINS[1].map],
		mask: tex.mask["facade_brick_mask"],
	}

	const frontMat = makeFacadeMaterial(L, maps, [cfg.baysFront, cfg.floors], skinMix)
	const backMat = makeFacadeMaterial(L, maps, [cfg.baysFront, cfg.floors], skinMix)
	const rightMat = makeFacadeMaterial(L, maps, [cfg.baysSide, cfg.floors], skinMix)
	const leftMat = makeFacadeMaterial(L, maps, [cfg.baysSide, cfg.floors], skinMix)
	const facadeMaterials = [frontMat, backMat, rightMat, leftMat]

	const concrete = tex.standard("plaster_white", {
		repeat: [3, 3],
		roughness: 0.9,
		color: 0xd9d5cc,
	})

	const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [
		rightMat, // +x
		leftMat, // -x
		concrete, // +y (hidden by the roof slab)
		concrete, // -y
		frontMat, // +z
		backMat, // -z
	])
	shell.position.y = H / 2
	shell.castShadow = true
	shell.name = "BuildingShell"
	group.add(shell)

	/* ----------------------------------------------------------- helpers */
	const box = (w, h, d, mat, x, y, z, name) => {
		const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
		m.position.set(x, y, z)
		m.castShadow = true
		m.receiveShadow = true
		if (name) m.name = name
		group.add(m)
		return m
	}

	/* ------------------------------------------------------------- plinth */
	const plinthMat = tex.standard("cobble_path", { repeat: [8, 1], roughness: 0.95 })
	box(W + 1.1, 0.75, D + 1.1, plinthMat, 0, 0.375, 0, "Plinth")

	/* ------------------------------------------------- roof slab + parapet */
	const roofMat = tex.standard("roof_shingle", { repeat: [6, 5], roughness: 0.92 })
	const roofSlab = box(W, 0.34, D, roofMat, 0, H + 0.17, 0, "RoofSlab")
	roofSlab.receiveShadow = true

	const parapetMat = tex.standard("plaster_white", {
		repeat: [8, 1],
		roughness: 0.88,
		color: 0xe2ded4,
	})
	const pt = 0.32 // parapet thickness
	const ph = 1.05 // parapet height
	const py = H + 0.34 + ph / 2
	box(W, ph, pt, parapetMat, 0, py, D / 2 - pt / 2)
	box(W, ph, pt, parapetMat, 0, py, -D / 2 + pt / 2)
	box(pt, ph, D - pt * 2, parapetMat, W / 2 - pt / 2, py, 0)
	box(pt, ph, D - pt * 2, parapetMat, -W / 2 + pt / 2, py, 0)

	/* --------------------------------------------------- roof furniture */
	// Stair head / roof access room
	const stairMat = tex.standard("brick_red", { repeat: [2, 1], roughness: 0.9 })
	box(3.4, 2.6, 3.0, stairMat, -W / 2 + 3.0, H + 0.34 + 1.3, -D / 2 + 2.6, "StairHead")
	box(3.9, 0.22, 3.5, roofMat, -W / 2 + 3.0, H + 0.34 + 2.7, -D / 2 + 2.6)

	// Water tank on legs
	const tankMat = tex.standard("plaster_white", {
		repeat: [3, 2],
		roughness: 0.6,
		metalness: 0.15,
		color: 0x9fb6c4,
	})
	const legMat = tex.standard("roof_shingle", { repeat: [1, 2], roughness: 0.5, metalness: 0.5 })
	const tankBaseY = H + 0.34
	for (const [lx, lz] of [
		[-0.75, -0.75],
		[0.75, -0.75],
		[-0.75, 0.75],
		[0.75, 0.75],
	]) {
		const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.5, 0.18), legMat)
		leg.position.set(W / 2 - 3.2 + lx, tankBaseY + 0.75, D / 2 - 3.0 + lz)
		leg.castShadow = true
		group.add(leg)
	}
	const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.7, 24), tankMat)
	tank.position.set(W / 2 - 3.2, tankBaseY + 1.5 + 0.85, D / 2 - 3.0)
	tank.castShadow = true
	tank.name = "WaterTank"
	group.add(tank)

	// Air-conditioner outdoor units clinging to the side wall
	const acMat = tex.standard("plaster_white", {
		repeat: [1, 1],
		roughness: 0.55,
		metalness: 0.25,
		color: 0xcfd4d8,
	})
	for (let i = 0; i < 4; i += 1) {
		box(0.95, 0.7, 0.42, acMat, W / 2 + 0.24, 4.6 + i * 3.6, -D / 2 + 2.4 + (i % 2) * 3.2)
	}

	// Antenna mast
	const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 10), legMat)
	mast.position.set(-W / 2 + 1.4, H + 0.34 + 2.1, D / 2 - 1.6)
	mast.castShadow = true
	group.add(mast)
	for (let i = 0; i < 3; i += 1) {
		const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5 - i * 0.35, 0.06, 0.06), legMat)
		bar.position.set(-W / 2 + 1.4, H + 1.6 + i * 0.85, D / 2 - 1.6)
		group.add(bar)
	}

	/* ------------------------------------------------------ entrance block */
	const doorMat = tex.standard("door_wood", { repeat: [1, 1], roughness: 0.62 })
	const glassMat = new THREE.MeshStandardMaterial({
		map: tex.tiled("color", "plaster_white", 1, 1),
		color: 0x8fb7cc,
		roughness: 0.14,
		metalness: 0.55,
	})

	// canopy over the entrance
	box(6.2, 0.3, 2.6, parapetMat, 0, 3.55, D / 2 + 1.3, "Canopy")
	box(0.26, 3.4, 0.26, legMat, -2.7, 1.7, D / 2 + 2.3)
	box(0.26, 3.4, 0.26, legMat, 2.7, 1.7, D / 2 + 2.3)

	// glass shopfront + wooden double door
	box(5.4, 2.9, 0.18, glassMat, 0, 2.15, D / 2 + 0.1, "Shopfront")
	box(1.5, 2.5, 0.14, doorMat, -0.78, 1.95, D / 2 + 0.22, "EntranceDoorLeft")
	box(1.5, 2.5, 0.14, doorMat, 0.78, 1.95, D / 2 + 0.22, "EntranceDoorRight")

	// three steps down to the path
	for (let i = 0; i < 3; i += 1) {
		box(6.0 + i * 0.5, 0.25, 0.9 + i * 0.35, plinthMat, 0, 0.62 - i * 0.25, D / 2 + 0.9 + i * 0.55)
	}

	/* ------------------------------------------------------------- API */
	let skinIndex = 0
	let fading = null

	/** Cross-fade the facade between brick and concrete. */
	function setSkin(index, animate = true) {
		const next = ((index % BUILDING_SKINS.length) + BUILDING_SKINS.length) % BUILDING_SKINS.length
		if (next === skinIndex) return BUILDING_SKINS[skinIndex].name
		skinIndex = next
		const target = skinIndex === 1 ? 1 : 0
		if (!animate) {
			skinMix.value = target
			fading = null
		} else {
			fading = { from: skinMix.value, to: target, t: 0, dur: 0.55 }
		}
		return BUILDING_SKINS[skinIndex].name
	}

	function cycleSkin() {
		return setSkin(skinIndex + 1)
	}

	function update(dt) {
		if (!fading) return
		fading.t = Math.min(1, fading.t + dt / fading.dur)
		// smoothstep for a soft transition
		const e = fading.t * fading.t * (3 - 2 * fading.t)
		skinMix.value = fading.from + (fading.to - fading.from) * e
		if (fading.t >= 1) fading = null
	}

	return {
		group,
		shell,
		height: H,
		width: W,
		depth: D,
		facadeMaterials,
		setSkin,
		cycleSkin,
		update,
		get skinName() {
			return BUILDING_SKINS[skinIndex].name
		},
	}
}
