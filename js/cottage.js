/**
 * cottage.js
 * ---------------------------------------------------------------------------
 * 3D Object #2 - the cottage (Serial 08 requirement) and the target of the
 * mouse interaction requirement: "Texture of the cottage will change".
 *
 * All four walls plus the two gable triangles share ONE uniform bundle
 * (uMapA/uMapB/uMix ...), so a single click cross-fades the entire cottage
 * from one material to the next in COTTAGE_SKINS.
 */

import { THREE } from "./three-loader.js"
import { PLOT, COTTAGE_SKINS } from "./config.js"
import {
	makeCottageMaterial,
	makeCottageSkinUniforms,
	makeSmokeMaterial,
} from "./materials.js"

/** A flat gable triangle with explicit UVs (ShapeGeometry UVs are unusable). */
function gableGeometry(width, height) {
	const g = new THREE.BufferGeometry()
	const hw = width / 2
	const positions = new Float32Array([-hw, 0, 0, hw, 0, 0, 0, height, 0])
	const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])
	const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1])
	g.setAttribute("position", new THREE.BufferAttribute(positions, 3))
	g.setAttribute("normal", new THREE.BufferAttribute(normals, 3))
	g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2))
	return g
}

export function createCottage(tex, L) {
	const cfg = PLOT.cottage
	const W = cfg.width
	const D = cfg.depth
	const WH = cfg.wallHeight
	const RH = cfg.roofHeight

	const group = new THREE.Group()
	group.name = "Cottage"
	group.position.set(cfg.position[0], cfg.position[1], cfg.position[2])
	group.rotation.y = cfg.rotation

	/* ------------------------------------------------ shared skin uniforms */
	const skinRef = (i) => {
		const s = COTTAGE_SKINS[i]
		return {
			map: tex.color[s.map],
			normal: tex.normal[s.map],
			tint: s.tint,
			shininess: s.shininess,
			spec: s.spec,
		}
	}
	const skinUniforms = makeCottageSkinUniforms(skinRef(0), skinRef(1))

	// Roughly 2.5 world units per texture tile keeps the plank/brick scale
	// believable on every wall.
	const TILE = 2.5
	const repFrontBack = [W / TILE, WH / TILE]
	const repSides = [D / TILE, WH / TILE]

	const wallFront = makeCottageMaterial(L, skinUniforms, repFrontBack)
	const wallBack = makeCottageMaterial(L, skinUniforms, repFrontBack)
	const wallRight = makeCottageMaterial(L, skinUniforms, repSides)
	const wallLeft = makeCottageMaterial(L, skinUniforms, repSides)
	const gableMat = makeCottageMaterial(L, skinUniforms, [W / TILE, RH / TILE])
	gableMat.side = THREE.DoubleSide

	const floorMat = tex.standard("wood_planks", { repeat: [4, 3], roughness: 0.8 })

	const walls = new THREE.Mesh(new THREE.BoxGeometry(W, WH, D), [
		wallRight, // +x
		wallLeft, // -x
		floorMat, // +y (hidden by the roof)
		floorMat, // -y
		wallFront, // +z
		wallBack, // -z
	])
	walls.position.y = WH / 2
	walls.castShadow = true
	walls.name = "CottageWalls"
	group.add(walls)

	// Gable triangles that close the roof at both ends.
	const gableGeo = gableGeometry(W, RH)
	const gableFront = new THREE.Mesh(gableGeo, gableMat)
	gableFront.position.set(0, WH, D / 2)
	gableFront.name = "CottageGableFront"
	group.add(gableFront)
	const gableBack = new THREE.Mesh(gableGeo, gableMat)
	gableBack.position.set(0, WH, -D / 2)
	gableBack.rotation.y = Math.PI
	gableBack.name = "CottageGableBack"
	group.add(gableBack)

	/* -------------------------------------------------------------- helper */
	const box = (w, h, d, mat, x, y, z, name) => {
		const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
		m.position.set(x, y, z)
		m.castShadow = true
		m.receiveShadow = true
		if (name) m.name = name
		group.add(m)
		return m
	}

	/* ---------------------------------------------------------- foundation */
	const stoneBase = tex.standard("stone_wall", { repeat: [5, 1], roughness: 0.95 })
	box(W + 0.7, 0.55, D + 0.7, stoneBase, 0, 0.275, 0, "CottageBase")

	/* --------------------------------------------------------- gable roof */
	const roofMat = tex.standard("roof_tiles", { repeat: [5, 3], roughness: 0.85 })
	const theta = Math.atan2(RH, D / 2)
	const slant = Math.hypot(D / 2, RH) + 0.75 // + eave overhang

	const roofA = new THREE.Mesh(new THREE.BoxGeometry(W + 1.4, 0.26, slant), roofMat)
	roofA.position.set(0, WH + RH / 2, D / 4)
	roofA.rotation.x = theta
	roofA.castShadow = true
	roofA.receiveShadow = true
	roofA.name = "RoofSlopeFront"
	group.add(roofA)

	const roofB = new THREE.Mesh(new THREE.BoxGeometry(W + 1.4, 0.26, slant), roofMat)
	roofB.position.set(0, WH + RH / 2, -D / 4)
	roofB.rotation.x = -theta
	roofB.castShadow = true
	roofB.receiveShadow = true
	roofB.name = "RoofSlopeBack"
	group.add(roofB)

	// ridge cap
	const ridgeMat = tex.standard("roof_tiles", { repeat: [6, 1], roughness: 0.8, color: 0xe8ded8 })
	box(W + 1.5, 0.28, 0.42, ridgeMat, 0, WH + RH + 0.1, 0, "RoofRidge")

	/* ------------------------------------------------------------ chimney */
	const brickMat = tex.standard("brick_red", { repeat: [1, 3], roughness: 0.92 })
	const chimneyX = -W / 2 + 2.2
	const chimneyTop = WH + RH + 1.6
	box(0.95, 3.6, 0.95, brickMat, chimneyX, WH + 1.9, -1.5, "Chimney")
	box(1.25, 0.22, 1.25, ridgeMat, chimneyX, chimneyTop - 0.05, -1.5, "ChimneyCap")

	/* ------------------------------------------------- chimney smoke (GPU) */
	const COUNT = 240
	const smokeGeo = new THREE.BufferGeometry()
	const pos = new Float32Array(COUNT * 3)
	const seed = new Float32Array(COUNT)
	const speed = new Float32Array(COUNT)
	for (let i = 0; i < COUNT; i += 1) {
		pos[i * 3 + 0] = chimneyX + (Math.random() - 0.5) * 0.35
		pos[i * 3 + 1] = chimneyTop + 0.15
		pos[i * 3 + 2] = -1.5 + (Math.random() - 0.5) * 0.35
		seed[i] = Math.random()
		speed[i] = 0.09 + Math.random() * 0.07
	}
	smokeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
	smokeGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1))
	smokeGeo.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1))
	const smokeMat = makeSmokeMaterial(L)
	const smoke = new THREE.Points(smokeGeo, smokeMat)
	smoke.frustumCulled = false
	smoke.name = "ChimneySmoke"
	group.add(smoke)

	/* -------------------------------------------------------------- porch */
	const postMat = tex.standard("wood_planks", { repeat: [1, 3], roughness: 0.78, color: 0xe8ddcf })
	box(5.6, 0.22, 2.6, floorMat, 0, 0.62, D / 2 + 1.3, "PorchFloor")
	box(0.24, 2.9, 0.24, postMat, -2.5, 2.18, D / 2 + 2.4)
	box(0.24, 2.9, 0.24, postMat, 2.5, 2.18, D / 2 + 2.4)
	// railings
	box(2.0, 0.14, 0.14, postMat, -1.7, 1.55, D / 2 + 2.4)
	box(2.0, 0.14, 0.14, postMat, 1.7, 1.55, D / 2 + 2.4)
	// porch canopy
	const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.2, 3.1), roofMat)
	porchRoof.position.set(0, 3.75, D / 2 + 1.35)
	porchRoof.rotation.x = 0.19
	porchRoof.castShadow = true
	group.add(porchRoof)
	// two steps
	box(2.6, 0.2, 0.55, stoneBase, 0, 0.42, D / 2 + 2.85)
	box(2.9, 0.2, 0.55, stoneBase, 0, 0.22, D / 2 + 3.35)

	/* --------------------------------------------------------- door + windows */
	const doorMat = tex.standard("door_wood", { repeat: [1, 1], roughness: 0.6 })
	box(1.35, 2.4, 0.14, doorMat, 0, 1.93, D / 2 + 0.08, "CottageDoor")
	box(1.75, 0.16, 0.2, postMat, 0, 3.2, D / 2 + 0.1)

	const glassMat = new THREE.MeshStandardMaterial({
		map: tex.tiled("color", "plaster_white", 1, 1),
		color: 0x93bccf,
		roughness: 0.12,
		metalness: 0.5,
	})
	const frameMat = tex.standard("wood_planks", { repeat: [1, 1], roughness: 0.7, color: 0xf2ebe0 })

	const addWindow = (x, y, z, rotY, w = 1.5, h = 1.4) => {
		const holder = new THREE.Group()
		holder.position.set(x, y, z)
		holder.rotation.y = rotY
		const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), glassMat)
		pane.castShadow = false
		holder.add(pane)
		const f = 0.11
		for (const [fw, fh, fx, fy] of [
			[w + 0.28, f, 0, h / 2 + f / 2],
			[w + 0.28, f, 0, -h / 2 - f / 2],
			[f, h + 0.28, -w / 2 - f / 2, 0],
			[f, h + 0.28, w / 2 + f / 2, 0],
			[f * 0.8, h, 0, 0],
			[w, f * 0.8, 0, 0],
		]) {
			const bar = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.16), frameMat)
			bar.position.set(fx, fy, 0.02)
			bar.castShadow = true
			holder.add(bar)
		}
		// window sill
		const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.45, 0.12, 0.3), frameMat)
		sill.position.set(0, -h / 2 - 0.2, 0.06)
		sill.castShadow = true
		holder.add(sill)
		group.add(holder)
		return holder
	}

	addWindow(-3.2, 2.6, D / 2 + 0.06, 0)
	addWindow(3.2, 2.6, D / 2 + 0.06, 0)
	addWindow(W / 2 + 0.06, 2.6, 1.6, Math.PI / 2)
	addWindow(W / 2 + 0.06, 2.6, -1.9, Math.PI / 2)
	addWindow(-W / 2 - 0.06, 2.6, 0, -Math.PI / 2)

	/* ------------------------------------------------------- garden fence */
	const fenceMat = tex.standard("wood_planks", { repeat: [1, 1], roughness: 0.85, color: 0xf0e6d6 })
	const fenceRing = [
		[-W / 2 - 2.6, D / 2 + 4.6],
		[W / 2 + 2.6, D / 2 + 4.6],
	]
	for (const [x0, z0] of fenceRing) {
		for (let i = 0; i < 6; i += 1) {
			const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.15, 0.14), fenceMat)
			p.position.set(x0, 0.85, z0 - i * 1.15)
			p.castShadow = true
			group.add(p)
		}
		const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 6.0), fenceMat)
		rail.position.set(x0, 1.15, z0 - 2.85)
		group.add(rail)
	}

	/* ------------------------------------------------------------- API */
	// Meshes the raycaster is allowed to hit for the click interaction.
	const clickTargets = [walls, gableFront, gableBack]

	let skinIndex = 0
	let fade = null

	function applySkinInstantly(i) {
		const s = skinRef(i)
		skinUniforms.uMapA.value = s.map
		skinUniforms.uNormalA.value = s.normal
		skinUniforms.uTintA.value.set(s.tint)
		skinUniforms.uShininess.value = s.shininess
		skinUniforms.uSpecStrength.value = s.spec
		skinUniforms.uMix.value = 0
	}

	/**
	 * Cross-fade to `index`. Slot A always holds the currently visible skin;
	 * slot B receives the incoming skin and uMix animates 0 -> 1. When the
	 * tween finishes, B is copied into A and uMix resets to 0, so the next
	 * click can reuse the same two slots.
	 */
	function setSkin(index, animate = true) {
		const next = ((index % COTTAGE_SKINS.length) + COTTAGE_SKINS.length) % COTTAGE_SKINS.length
		if (next === skinIndex && !fade) return COTTAGE_SKINS[skinIndex].name
		if (fade) {
			// finish the running tween first so we never lose a click
			applySkinInstantly(fade.target)
			skinIndex = fade.target
			fade = null
			if (next === skinIndex) return COTTAGE_SKINS[skinIndex].name
		}
		const s = skinRef(next)
		skinUniforms.uMapB.value = s.map
		skinUniforms.uNormalB.value = s.normal
		skinUniforms.uTintB.value.set(s.tint)
		if (!animate) {
			skinIndex = next
			applySkinInstantly(next)
		} else {
			skinUniforms.uMix.value = 0
			fade = { t: 0, dur: 0.6, target: next, shinFrom: skinUniforms.uShininess.value, specFrom: skinUniforms.uSpecStrength.value }
		}
		return COTTAGE_SKINS[next].name
	}

	function cycleSkin() {
		return setSkin(skinIndex + 1)
	}

	let highlightTarget = 0
	function setHover(on) {
		highlightTarget = on ? 1 : 0
	}

	function update(dt) {
		// hover rim fade
		const h = skinUniforms.uHighlight.value
		skinUniforms.uHighlight.value = h + (highlightTarget - h) * Math.min(1, dt * 8)

		if (!fade) return
		fade.t = Math.min(1, fade.t + dt / fade.dur)
		const e = fade.t * fade.t * (3 - 2 * fade.t)
		skinUniforms.uMix.value = e
		const s = COTTAGE_SKINS[fade.target]
		skinUniforms.uShininess.value = fade.shinFrom + (s.shininess - fade.shinFrom) * e
		skinUniforms.uSpecStrength.value = fade.specFrom + (s.spec - fade.specFrom) * e
		if (fade.t >= 1) {
			skinIndex = fade.target
			applySkinInstantly(skinIndex)
			fade = null
		}
	}

	return {
		group,
		walls,
		clickTargets,
		setSkin,
		cycleSkin,
		setHover,
		update,
		get skinIndex() {
			return fade ? fade.target : skinIndex
		},
		get skinName() {
			return COTTAGE_SKINS[fade ? fade.target : skinIndex].name
		},
	}
}
