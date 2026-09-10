/**
 * hud.js
 * ---------------------------------------------------------------------------
 * Thin wrapper around the overlay markup that already exists in index.html.
 * It only reads/writes DOM nodes - no scene logic lives here, so the overlay
 * can be opened on its own in a browser to check the layout.
 */

const $ = (id) => document.getElementById(id)

export function createHUD(handlers = {}) {
	const el = {
		loading: $("loading"),
		loadBar: $("load-bar"),
		loadText: $("load-text"),
		loadError: $("load-error"),
		hud: $("hud"),
		fps: $("stat-fps"),
		time: $("stat-time"),
		light: $("stat-light"),
		cottage: $("stat-cottage"),
		building: $("stat-building"),
		fov: $("stat-fov"),
		cam: $("stat-cam"),
		tris: $("stat-tris"),
		shadow: $("stat-shadow"),
		source: $("stat-source"),
		tooltip: $("tooltip"),
		toast: $("toast"),
		help: $("help-overlay"),
		helpClose: $("help-close"),
		btnCottage: $("btn-cottage"),
		btnFacade: $("btn-facade"),
		btnDayNight: $("btn-daynight"),
		btnLight: $("btn-light"),
		btnSnap: $("btn-snap"),
		btnHelp: $("btn-help"),
	}

	/* ------------------------------------------------------------- buttons */
	const wire = (node, fn) => {
		if (!node || !fn) return
		node.addEventListener("click", (e) => {
			e.preventDefault()
			fn()
			// Give focus back to the canvas so the keyboard keeps working.
			node.blur()
		})
	}
	wire(el.btnCottage, handlers.onCottage)
	wire(el.btnFacade, handlers.onFacade)
	wire(el.btnDayNight, handlers.onDayNight)
	wire(el.btnLight, handlers.onLight)
	wire(el.btnSnap, handlers.onSnapshot)
	wire(el.btnHelp, () => toggleHelp())
	wire(el.helpClose, () => toggleHelp(false))
	el.help?.addEventListener("click", (e) => {
		if (e.target === el.help) toggleHelp(false)
	})

	/* ------------------------------------------------------------ loading */
	function setLoadProgress(fraction, text) {
		if (el.loadBar) {
			const pct = Math.round(Math.min(1, Math.max(0.06, fraction)) * 100)
			el.loadBar.style.width = `${pct}%`
		}
		if (text && el.loadText) el.loadText.textContent = text
	}

	function hideLoading() {
		if (!el.loading || el.loading.classList.contains("fade-out")) return
		setLoadProgress(1, "Ready")
		el.loading.classList.add("fade-out")
		window.setTimeout(() => el.loading?.classList.add("hidden"), 520)
	}

	function showLoadError(message) {
		if (!el.loadError) return
		el.loadError.textContent = message
		el.loadError.classList.remove("hidden")
		if (el.loadText) el.loadText.textContent = "Could not start"
		el.loading?.classList.remove("fade-out", "hidden")
	}

	function setSource(label) {
		if (el.source) el.source.textContent = label
	}

	/* --------------------------------------------------------------- stats */
	function setStats(s) {
		if (el.fps) el.fps.textContent = `${s.fps} fps`
		if (el.time) el.time.textContent = s.time
		if (el.light) el.light.textContent = s.light
		if (el.cottage) el.cottage.textContent = s.cottage
		if (el.building) el.building.textContent = s.building
		if (el.fov) el.fov.textContent = s.fov
		if (el.cam) el.cam.textContent = s.cam
		if (el.tris) el.tris.textContent = s.triangles
		if (el.shadow) el.shadow.textContent = s.shadows
	}

	function setButtonLabels({ dayNight, light }) {
		if (el.btnDayNight) {
			el.btnDayNight.textContent = dayNight ? "Pause day / night" : "Resume day / night"
		}
		if (el.btnLight) {
			el.btnLight.textContent = light ? "Pause orbit light" : "Resume orbit light"
		}
	}

	/* ------------------------------------------------------------- tooltip */
	function setTooltip(visible, x = 0, y = 0, text) {
		if (!el.tooltip) return
		if (!visible) {
			el.tooltip.classList.add("hidden")
			return
		}
		if (text) el.tooltip.textContent = text
		el.tooltip.style.left = `${x}px`
		el.tooltip.style.top = `${y}px`
		el.tooltip.classList.remove("hidden")
	}

	/* --------------------------------------------------------------- toast */
	let toastTimer = 0
	function toast(message, ms = 1900) {
		if (!el.toast) return
		el.toast.textContent = message
		el.toast.classList.remove("hidden")
		// restart the entry animation
		el.toast.style.animation = "none"
		void el.toast.offsetWidth
		el.toast.style.animation = ""
		window.clearTimeout(toastTimer)
		toastTimer = window.setTimeout(() => el.toast?.classList.add("hidden"), ms)
	}

	/* ---------------------------------------------------------------- help */
	function toggleHelp(force) {
		if (!el.help) return false
		const show = force === undefined ? el.help.classList.contains("hidden") : force
		el.help.classList.toggle("hidden", !show)
		return show
	}

	function helpVisible() {
		return !!el.help && !el.help.classList.contains("hidden")
	}

	/* ----------------------------------------------------------- hud hide */
	let hudOn = true
	function toggleHud(force) {
		hudOn = force === undefined ? !hudOn : force
		el.hud?.classList.toggle("hud-off", !hudOn)
		return hudOn
	}

	/** Hide the whole overlay for one frame so snapshots stay clean. */
	function withHudHidden(fn) {
		const was = hudOn
		toggleHud(false)
		try {
			fn()
		} finally {
			toggleHud(was)
		}
	}

	return {
		el,
		setLoadProgress,
		hideLoading,
		showLoadError,
		setSource,
		setStats,
		setButtonLabels,
		setTooltip,
		toast,
		toggleHelp,
		helpVisible,
		toggleHud,
		withHudHidden,
	}
}
