/**
 * environment.js
 * ---------------------------------------------------------------------------
 * Everything around the two houses: procedural sky dome, ground, cobbled
 * path, road, trees whose leaves sway in a vertex shader, bushes, flowers,
 * the street lamp, a bench, the boundary fence, and the glowing orb that
 * visualises the orbiting light.
 */

import { THREE } from "./three-loader.js"
import { PLOT, SKY, LIGHT } from "./config.js"
import { makeSkyMaterial, makeFoliageMaterial, makeGlowMaterial } from "./materials.js"

export function createEnvironment(scene, tex, L) {
	const group = new THREE.Group()
	group.name = "Environment"
	scene.add(group)

	// Shared uniform refs so one keypress changes every tree at once.
	const seasonRef = { value: 0 }
	const windRef = { value: 0.13 }

	/* ----------------------------------------------------------- sky dome */
	const skyMat = makeSkyMaterial(L)
	const sky = new THREE.Mesh(new THREE.SphereGeometry(560, 48, 32), skyMat)
	sky.name = "SkyDome"
	sky.frustumCulled = false
	group.add(sky)

	/* ------------------------------------------------------------- ground */
	const groundMat = tex.standard("grass", {
		repeat: [46, 46],
		roughness: 0.96,
		normalScale: 1.1,
	})
	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(PLOT.groundSize, PLOT.groundSize, 1, 1),
		groundMat,
	)
	ground.rotation.x = -Math.PI / 2
	ground.receiveShadow = true
	ground.name = "Ground"
	group.add(ground)

	/* ------------------------------------------------- road and footpaths */
	const asphaltMat = tex.standard("cobble_path", {
		repeat: [40, 2],
		roughness: 0.98,
		color: 0x8e8e8e,
	})
	const road = new THREE.Mesh(new THREE.PlaneGeometry(PLOT.groundSize, 9), asphaltMat)
	road.rotation.x = -Math.PI / 2
	road.position.set(0, 0.02, 26)
	road.receiveShadow = true
	road.name = "Road"
	group.add(road)

	const pathMat = tex.standard("cobble_path", { repeat: [3, 12], roughness: 0.95 })
	const addPath = (w, d, x, z, rotY = 0, repeat = [3, 12]) => {
		const mat = tex.standard("cobble_path", { repeat, roughness: 0.95 })
		const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat)
		p.rotation.x = -Math.PI / 2
		p.rotation.z = rotY
		p.position.set(x, 0.03, z)
		p.receiveShadow = true
		group.add(p)
		return p
	}
	// pavement along the road
	addPath(PLOT.groundSize, 3.4, 0, 20.2, 0, [64, 2])
	// path to the building entrance
	addPath(3.2, 17.5, PLOT.building.position[0], 12.0, 0, [2, 11])
	// path to the cottage
	addPath(2.6, 12.0, PLOT.cottage.position[0] + 0.6, 14.4, 0, [2, 8])
	// connecting path between the two houses
	addPath(20.0, 2.6, 0.5, 12.5, 0, [13, 2])

	/* ------------------------------------------- soft contact shadow decals */
	const blobMat = new THREE.MeshBasicMaterial({
		map: tex.plain["shadow_blob"],
		transparent: true,
		opacity: 0.4,
		depthWrite: false,
		color: 0x2a2a20,
	})
	const addBlob = (x, z, size) => {
		const b = new THREE.Mesh(new THREE.PlaneGeometry(size, size), blobMat)
		b.rotation.x = -Math.PI / 2
		b.position.set(x, 0.045, z)
		group.add(b)
		return b
	}

	/* -------------------------------------------------------------- trees */
	const barkMat = tex.standard("bark", { repeat: [2, 4], roughness: 0.95 })
	const foliageMat = makeFoliageMaterial(
		L,
		tex.color["leaves"],
		tex.normal["leaves"],
		seasonRef,
		windRef,
	)
	const leafGeo = new THREE.IcosahedronGeometry(1, 2)

	function makeTree(x, z, scale = 1, tilt = 0) {
		const t = new THREE.Group()
		t.position.set(x, 0, z)
		t.rotation.z = tilt
		const trunkH = 3.6 * scale
		const trunk = new THREE.Mesh(
			new THREE.CylinderGeometry(0.16 * scale, 0.3 * scale, trunkH, 10),
			barkMat,
		)
		trunk.position.y = trunkH / 2
		trunk.castShadow = true
		t.add(trunk)

		const blobs = [
			[0, trunkH + 0.7 * scale, 0, 1.75 * scale],
			[0.85 * scale, trunkH + 0.1 * scale, 0.3 * scale, 1.15 * scale],
			[-0.7 * scale, trunkH + 0.35 * scale, -0.5 * scale, 1.05 * scale],
			[0.15 * scale, trunkH + 1.75 * scale, -0.2 * scale, 1.0 * scale],
		]
		for (const [bx, by, bz, r] of blobs) {
			const leaf = new THREE.Mesh(leafGeo, foliageMat)
			leaf.position.set(bx, by, bz)
			// Uniform scale only - the shaders rely on mat3(modelMatrix) being
			// a rotation * uniform scale so normals stay correct.
			leaf.scale.setScalar(r)
			leaf.castShadow = true
			t.add(leaf)
		}
		group.add(t)
		addBlob(x, z, 5.5 * scale)
		return t
	}

	const TREES = [
		[-26, 14, 1.15, 0.02],
		[-22, -16, 1.0, -0.03],
		[-4, -18, 1.25, 0.0],
		[6, -14, 0.9, 0.04],
		[24, -8, 1.1, -0.02],
		[27, 12, 1.0, 0.03],
		[2, 16, 0.85, 0.0],
		[-32, -4, 1.2, -0.01],
	]
	for (const [x, z, s, tilt] of TREES) makeTree(x, z, s, tilt)

	/* ------------------------------------------------------------ bushes */
	function makeBush(x, z, r) {
		const b = new THREE.Mesh(leafGeo, foliageMat)
		b.position.set(x, r * 0.72, z)
		b.scale.setScalar(r)
		b.castShadow = true
		group.add(b)
		addBlob(x, z, r * 3.4)
		return b
	}
	const BUSHES = [
		[-19.5, 9.5, 0.85],
		[-5.5, 9.0, 0.7],
		[8.5, 10.5, 0.75],
		[19.0, 3.0, 0.9],
		[20.5, 13.5, 0.8],
		[-13.5, -11.0, 0.95],
		[-28.0, 2.0, 0.8],
		[12.0, -6.0, 0.7],
	]
	for (const [x, z, r] of BUSHES) makeBush(x, z, r)

	/* ----------------------------------------------------- flower patches */
	const FLOWERS = [0xe4576f, 0xf0c04a, 0xd57bd0, 0xf2f2f2]
	FLOWERS.forEach((hex, i) => {
		const mat = tex.standard("leaves", { repeat: [1, 1], roughness: 0.8, color: hex })
		for (let k = 0; k < 9; k += 1) {
			const f = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), mat)
			const ax = 17.5 + (i % 2) * 2.2 + Math.random() * 1.6
			const az = 15.5 + Math.floor(i / 2) * 2.0 + Math.random() * 1.6
			f.position.set(ax, 0.28, az)
			f.castShadow = true
			group.add(f)
		}
	})

	/* --------------------------------------------------------- street lamp */
	const metalMat = tex.standard("roof_shingle", {
		repeat: [1, 4],
		roughness: 0.45,
		metalness: 0.6,
		color: 0x5b6068,
	})
	const lampGroup = new THREE.Group()
	lampGroup.position.set(9, 0, 19)
	const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.5, 14), metalMat)
	base.position.y = 0.25
	base.castShadow = true
	lampGroup.add(base)
	const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7.4, 12), metalMat)
	pole.position.y = 3.7
	pole.castShadow = true
	lampGroup.add(pole)
	const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.14), metalMat)
	arm.position.set(-0.7, 7.35, 0)
	arm.castShadow = true
	lampGroup.add(arm)
	const hood = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 14, 1, true), metalMat)
	hood.position.set(-1.4, 7.2, 0)
	lampGroup.add(hood)
	const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff0cf })
	const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), bulbMat)
	bulb.position.set(-1.4, 6.9, 0)
	lampGroup.add(bulb)
	const bulbGlowMat = makeGlowMaterial(LIGHT.streetLamp.color, { power: 1.6, strength: 1.1 })
	const bulbGlow = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), bulbGlowMat)
	bulbGlow.position.copy(bulb.position)
	lampGroup.add(bulbGlow)
	group.add(lampGroup)

	/* -------------------------------------------------------------- bench */
	const benchWood = tex.standard("wood_planks", { repeat: [3, 1], roughness: 0.8 })
	const bench = new THREE.Group()
	bench.position.set(4.5, 0, 15.5)
	bench.rotation.y = -0.25
	for (let i = 0; i < 3; i += 1) {
		const slat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.32), benchWood)
		slat.position.set(0, 0.62, -0.36 + i * 0.36)
		slat.castShadow = true
		bench.add(slat)
	}
	for (let i = 0; i < 2; i += 1) {
		const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 0.1), benchWood)
		back.position.set(0, 1.05 + i * 0.34, -0.52)
		back.castShadow = true
		bench.add(back)
	}
	for (const lx of [-1.4, 1.4]) {
		const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.9), metalMat)
		leg.position.set(lx, 0.31, -0.1)
		leg.castShadow = true
		bench.add(leg)
	}
	group.add(bench)

	/* ----------------------------------------------------- boundary fence */
	const fenceMat = tex.standard("wood_planks", {
		repeat: [1, 1],
		roughness: 0.86,
		color: 0xe9dcc8,
	})
	const fenceRail = tex.standard("wood_planks", {
		repeat: [8, 1],
		roughness: 0.86,
		color: 0xe9dcc8,
	})
	function fenceRun(x0, z0, x1, z1) {
		const dx = x1 - x0
		const dz = z1 - z0
		const len = Math.hypot(dx, dz)
		const ang = Math.atan2(dx, dz)
		const n = Math.max(2, Math.round(len / 1.6))
		for (let i = 0; i <= n; i += 1) {
			const t = i / n
			const p = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.35, 0.13), fenceMat)
			p.position.set(x0 + dx * t, 0.95, z0 + dz * t)
			p.castShadow = true
			group.add(p)
		}
		for (const h of [0.75, 1.3]) {
			const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, len), fenceRail)
			rail.position.set(x0 + dx / 2, h, z0 + dz / 2)
			rail.rotation.y = ang
			rail.castShadow = true
			group.add(rail)
		}
	}
	// front boundary, split for the two gates
	fenceRun(-38, 18, -16, 18)
	fenceRun(-9, 18, 10.5, 18)
	fenceRun(17, 18, 38, 18)
	fenceRun(-38, 18, -38, -24)
	fenceRun(38, 18, 38, -24)
	fenceRun(-38, -24, 38, -24)

	/* --------------------------------------- orbiting light orb + its path */
	const orb = new THREE.Group()
	const orbCore = new THREE.Mesh(
		new THREE.SphereGeometry(LIGHT.orbit.orbSize, 20, 14),
		new THREE.MeshBasicMaterial({ color: LIGHT.orbit.color }),
	)
	orb.add(orbCore)
	const orbGlow = new THREE.Mesh(
		new THREE.SphereGeometry(LIGHT.orbit.orbSize * 2.5, 24, 16),
		makeGlowMaterial(LIGHT.orbit.color, { power: 2.4, strength: 1.9 }),
	)
	orb.add(orbGlow)
	group.add(orb)

	// A faint ring that shows the animation path (toggle with O).
	const pathRing = new THREE.Mesh(
		new THREE.TorusGeometry(LIGHT.orbit.radius, 0.045, 8, 96),
		new THREE.MeshBasicMaterial({
			color: LIGHT.orbit.color,
			transparent: true,
			opacity: 0.32,
			depthWrite: false,
		}),
	)
	pathRing.rotation.x = Math.PI / 2
	pathRing.position.set(
		PLOT.building.position[0],
		LIGHT.orbit.height,
		PLOT.building.position[2],
	)
	pathRing.visible = false
	group.add(pathRing)

	/* --------------------------------------------------------------- fog */
	scene.fog = new THREE.Fog(SKY.fogDay, SKY.fogNear, SKY.fogFar)

	/* --------------------------------------------------------------- API */
	function syncOrb(position) {
		orb.position.copy(position)
	}

	function setSeason(v) {
		seasonRef.value = Math.min(1, Math.max(0, v))
	}

	function setWind(v) {
		windRef.value = Math.min(0.6, Math.max(0, v))
	}

	function togglePathRing() {
		pathRing.visible = !pathRing.visible
		return pathRing.visible
	}

	function setLampGlow(night) {
		bulbGlowMat.uniforms.uStrength.value = 0.25 + night * 1.6
		bulbMat.color.setRGB(1, 0.94 - night * 0.05, 0.82 - night * 0.03)
	}

	return {
		group,
		ground,
		sky,
		orb,
		pathRing,
		seasonRef,
		windRef,
		foliageMat,
		syncOrb,
		setSeason,
		setWind,
		setLampGlow,
		togglePathRing,
	}
}
