/**
 * config.js
 * ---------------------------------------------------------------------------
 * Every tunable number for the scene lives here, so the report and the code
 * always agree and nothing is hidden as a "magic number" deep inside a file.
 *
 * CSE4204 | Group 07 (Section C2) | Assigned Serial 08 - "Houses from outside"
 */

export const PROJECT = {
	course: "Computer Graphics Lab (CSE 4204)",
	title: "Houses from outside",
	serial: 8,
	section: "C2",
	group: 7,
	members: [
		{ id: "20220104141", name: "Jakaria Mahmud" },
		{ id: "20220104147", name: "Md. Redwan Hossen" },
	],
}

/* ------------------------------------------------------------------ camera */
// Perspective projection parameters (requirement #3).
export const CAMERA = {
	fov: 55, // vertical field of view in degrees
	near: 0.1, // near clipping plane
	far: 1200, // far clipping plane
	fovMin: 25,
	fovMax: 95,
	// Spherical orbit rig around the two houses.
	start: { radius: 46, theta: -0.62, phi: 1.15, target: [0, 4.5, 0] },
	radiusMin: 12,
	radiusMax: 130,
	phiMin: 0.14, // keep the camera above the ground plane
	phiMax: 1.52,
	moveSpeed: 20, // units / second (W,S)
	orbitSpeed: 0.95, // radians / second (A,D)
	elevSpeed: 0.75, // radians / second (Q,E)
	panSpeed: 14, // units / second (arrow keys, R, F)
	sprint: 2.4, // Shift multiplier
	damping: 9.0, // higher = snappier camera
}

/* -------------------------------------------------------------------- plot */
export const PLOT = {
	groundSize: 260,
	// The multi-storey building.
	building: {
		position: [-12.5, 0, -3],
		width: 15,
		depth: 11,
		floors: 5,
		floorHeight: 3.6,
		baysFront: 5, // window bays across the 15 unit wide facade
		baysSide: 4, // window bays across the 11 unit deep facade
		rotation: 0,
	},
	// The cottage.
	cottage: {
		position: [13.5, 0, 6],
		width: 10,
		depth: 8.4,
		wallHeight: 4.6,
		roofHeight: 3.6,
		rotation: -0.32,
	},
}

/* ------------------------------------------------------------------- light */
export const LIGHT = {
	// The required animation: a light that orbits the building.
	orbit: {
		radius: 17.5,
		height: 13.5,
		speed: 0.42, // radians / second
		intensity: 220,
		range: 62, // custom-shader falloff distance
		color: 0xffb469,
		orbSize: 0.75,
	},
	sun: {
		dayColor: 0xfff0d6,
		nightColor: 0x7f96c8,
		dayIntensity: 2.15,
		nightIntensity: 0.22,
		distance: 90,
	},
	ambient: {
		dayColor: 0xbcd2f0,
		nightColor: 0x2a3550,
		dayIntensity: 0.78,
		nightIntensity: 0.30,
	},
	// Day/night cycle. dayTime runs 0..1 (0 = sunrise, 0.5 = sunset).
	cycle: { speed: 0.018, startTime: 0.27 },
	streetLamp: { color: 0xffd9a0, intensity: 90, distance: 34 },
}

/* ------------------------------------------------------------------ colors */
export const SKY = {
	zenithDay: 0x2f6fc0,
	horizonDay: 0xbcd8ee,
	zenithNight: 0x050a1c,
	horizonNight: 0x1b2947,
	fogDay: 0xc3d8e8,
	fogNight: 0x141d33,
	fogNear: 70,
	fogFar: 235,
}

/* ---------------------------------------------------- cottage texture sets */
// Mouse requirement: clicking the cottage cross-fades to the next set.
export const COTTAGE_SKINS = [
	{ name: "Wooden Planks", map: "wood_planks", tint: 0xffffff, shininess: 22, spec: 0.16 },
	{ name: "Stone Masonry", map: "stone_wall", tint: 0xf2f2ee, shininess: 14, spec: 0.10 },
	{ name: "White Plaster", map: "plaster_white", tint: 0xfffaf0, shininess: 30, spec: 0.13 },
	{ name: "Beige Brick", map: "brick_beige", tint: 0xfff4e2, shininess: 18, spec: 0.12 },
]

/* ---------------------------------------------- building facade skin pair */
export const BUILDING_SKINS = [
	{ name: "Red Brick", map: "facade_brick" },
	{ name: "Grey Concrete", map: "facade_concrete" },
]

/* ------------------------------------------------------------------ camera presets */
export const PRESETS = [
	{ key: "1", label: "Front view (both houses)", radius: 46, theta: -0.62, phi: 1.15, target: [0, 4.5, 0] },
	{ key: "2", label: "Cottage close-up", radius: 17, theta: 0.55, phi: 1.28, target: [13.5, 3.2, 6] },
	{ key: "3", label: "Building close-up", radius: 25, theta: -1.35, phi: 1.18, target: [-12.5, 8.5, -3] },
	{ key: "4", label: "Aerial overview", radius: 74, theta: -0.9, phi: 0.55, target: [0, 6, 0] },
	{ key: "5", label: "Street level", radius: 30, theta: 0.1, phi: 1.48, target: [0, 2.2, 14] },
]
