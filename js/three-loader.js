/**
 * three-loader.js
 * ---------------------------------------------------------------------------
 * Loads the Three.js ES module and re-exports it as `THREE`.
 *
 * Resolution order:
 *   1. ./vendor/three.module.js   (offline copy - created by 1-DOWNLOAD-LIBS.bat)
 *   2. unpkg CDN                  (needs internet)
 *   3. jsDelivr CDN               (needs internet)
 *
 * Because of this fallback chain the project runs in the lab even when there
 * is no internet, as long as the vendor file was downloaded once beforehand.
 */

const SOURCES = [
	{ label: "local vendor copy", url: new URL("../vendor/three.module.js", import.meta.url).href },
	{ label: "unpkg CDN", url: "https://unpkg.com/three@0.169.0/build/three.module.js" },
	{ label: "jsDelivr CDN", url: "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js" },
]

let loaded = null
let loadedFrom = "none"
const errors = []

for (const source of SOURCES) {
	try {
		loaded = await import(/* @vite-ignore */ source.url)
		if (loaded && loaded.Scene) {
			loadedFrom = source.label
			break
		}
		loaded = null
	} catch (err) {
		errors.push(`${source.label}: ${err && err.message ? err.message : err}`)
	}
}

if (!loaded) {
	const message =
		"Three.js could not be loaded.\n\n" +
		"Fix: run 1-DOWNLOAD-LIBS.bat once while you have internet, " +
		"then run 2-START-PROJECT.bat again.\n\nDetails:\n" +
		errors.join("\n")
	document.body.innerHTML =
		'<pre style="font:14px/1.6 Consolas,monospace;color:#E97366;background:#191919;' +
		'padding:32px;margin:0;min-height:100vh;white-space:pre-wrap">' +
		message.replace(/</g, "&lt;") +
		"</pre>"
	throw new Error(message)
}

export const THREE = loaded
export const THREE_SOURCE = loadedFrom
export default loaded
