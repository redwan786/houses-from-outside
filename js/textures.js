/**
 * textures.js
 * ---------------------------------------------------------------------------
 * Loads every image in assets/textures once and hands out configured
 * THREE.Texture objects (requirement #4: texture for each object).
 *
 * Notes
 *  - Colour maps are tagged SRGBColorSpace; normal maps must stay linear.
 *  - Anisotropic filtering is set to the hardware maximum so the grass and
 *    the road stay sharp at grazing angles.
 */

import { THREE } from "./three-loader.js"

const BASE = new URL("../assets/textures/", import.meta.url).href

const NAMES = [
	"brick_red",
	"brick_beige",
	"wood_planks",
	"stone_wall",
	"plaster_white",
	"roof_tiles",
	"roof_shingle",
	"grass",
	"cobble_path",
	"bark",
	"leaves",
	"door_wood",
	"facade_brick",
	"facade_concrete",
]

const MASKS = ["facade_brick_mask", "facade_concrete_mask"]
const PLAIN = ["shadow_blob"]

export class TextureLibrary {
	constructor(renderer) {
		this.loader = new THREE.TextureLoader()
		this.maxAniso = renderer.capabilities.getMaxAnisotropy()
		this.color = {}
		this.normal = {}
		this.mask = {}
		this.plain = {}
		this.count = 0
	}

	#configure(tex, { srgb, repeat }) {
		tex.wrapS = THREE.RepeatWrapping
		tex.wrapT = THREE.RepeatWrapping
		tex.anisotropy = this.maxAniso
		tex.generateMipmaps = true
		tex.minFilter = THREE.LinearMipmapLinearFilter
		tex.magFilter = THREE.LinearFilter
		if (srgb) tex.colorSpace = THREE.SRGBColorSpace
		if (repeat) tex.repeat.set(repeat[0], repeat[1])
		tex.needsUpdate = true
		this.count += 1
		return tex
	}

	#load(file, opts) {
		return this.#configure(this.loader.load(BASE + file), opts)
	}

	/** Kicks off every load. Textures stream in; the scene renders meanwhile. */
	loadAll() {
		for (const name of NAMES) {
			this.color[name] = this.#load(`${name}.png`, { srgb: true })
			this.normal[name] = this.#load(`${name}_n.png`, { srgb: false })
		}
		for (const name of MASKS) {
			this.mask[name] = this.#load(`${name}.png`, { srgb: false })
		}
		for (const name of PLAIN) {
			const tex = this.loader.load(`${BASE}${name}.png`)
			tex.colorSpace = THREE.SRGBColorSpace
			tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
			this.plain[name] = tex
			this.count += 1
		}
		return this
	}

	/**
	 * A cloned texture with its own repeat, because two meshes that need
	 * different tiling cannot share one THREE.Texture instance.
	 */
	tiled(kind, name, repeatX, repeatY) {
		const src = kind === "normal" ? this.normal[name] : this.color[name]
		if (!src) throw new Error(`unknown texture: ${kind}/${name}`)
		const tex = src.clone()
		tex.wrapS = tex.wrapT = THREE.RepeatWrapping
		tex.repeat.set(repeatX, repeatY)
		tex.anisotropy = this.maxAniso
		tex.needsUpdate = true
		return tex
	}

	/**
	 * A textured MeshStandardMaterial. Used for every prop that should
	 * receive Three.js shadow maps (the custom-shader walls cast shadows but
	 * do not receive them).
	 */
	standard(name, { repeat = [1, 1], roughness = 0.85, metalness = 0.04, color = 0xffffff, normalScale = 1 } = {}) {
		const mat = new THREE.MeshStandardMaterial({
			map: this.tiled("color", name, repeat[0], repeat[1]),
			normalMap: this.tiled("normal", name, repeat[0], repeat[1]),
			roughness,
			metalness,
			color,
		})
		mat.normalScale.set(normalScale, normalScale)
		return mat
	}
}
