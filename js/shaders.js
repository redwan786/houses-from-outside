/**
 * shaders.js
 * ---------------------------------------------------------------------------
 * All custom GLSL used by the project (requirement #1: Custom shaders).
 *
 * The lighting model is written by hand in GLSL - it is NOT Three.js'
 * built-in material lighting. Every custom shader receives the same set of
 * light uniforms (see LIGHT_UNIFORMS below) which `lighting.js` updates once
 * per frame, so the hand-written Blinn-Phong lighting stays in sync with the
 * real Three.js lights used by the standard-material props.
 *
 * Shaders in this file:
 *   1. SKY          - procedural sky dome, sun/moon disk, stars
 *   2. FACADE       - building walls: diffuse + normal map + emissive windows
 *   3. COTTAGE      - cottage walls: cross-fades between two texture sets
 *   4. FOLIAGE      - vertex-displacement wind sway + seasonal tint
 *   5. SMOKE        - GPU point sprites for the chimney
 *   6. GLOW         - fresnel rim glow for the orbiting light orb
 */

/* ------------------------------------------------------------------------ */
/* Shared GLSL helper functions                                             */
/* ------------------------------------------------------------------------ */

export const GLSL_COMMON = /* glsl */ `
	// --- colour space -----------------------------------------------------
	// Three.js does not auto-decode textures for a raw ShaderMaterial, so we
	// convert sRGB texels to linear light, do the lighting maths in linear
	// space, then encode back to sRGB at the very end of the shader.
	vec3 sRGBToLinear(vec3 c) { return pow(max(c, vec3(0.0)), vec3(2.2)); }
	vec3 linearToSRGB(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }

	// --- normal mapping ---------------------------------------------------
	// Our meshes are axis-aligned boxes / planes without generated tangents,
	// so we build an orthonormal tangent basis on the fly from the face
	// normal:  T = normalize(cross(up, N)),  B = cross(N, T).
	// That is enough for box faces and keeps the geometry data small.
	vec3 applyNormalMap(vec3 N, sampler2D nmap, vec2 uv, float strength) {
		vec3 t = texture2D(nmap, uv).xyz * 2.0 - 1.0;
		t.xy *= strength;
		t = normalize(t);
		vec3 up = abs(N.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
		vec3 T = normalize(cross(up, N));
		vec3 B = normalize(cross(N, T));
		return normalize(T * t.x + B * t.y + N * t.z);
	}

	// --- Blinn-Phong for a single light ----------------------------------
	// diffuse = albedo * max(N.L, 0)
	// specular = pow(max(N.H, 0), shininess),  H = normalize(L + V)
	vec3 blinnPhong(vec3 N, vec3 L, vec3 V, vec3 lightColor, vec3 albedo,
	                float shininess, float specStrength) {
		float ndl = max(dot(N, L), 0.0);
		vec3 H = normalize(L + V);
		float spec = ndl > 0.0
			? pow(max(dot(N, H), 0.0), shininess) * specStrength
			: 0.0;
		return lightColor * (albedo * ndl + spec);
	}

	// --- cheap hash, used for the star field ------------------------------
	float hash12(vec2 p) {
		return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
	}
`

/**
 * Uniform block shared by every lit custom shader. `lighting.js` owns these
 * uniform objects and mutates `.value`, so all materials update together.
 */
export const LIGHT_UNIFORMS = /* glsl */ `
	uniform vec3  uAmbientColor;
	uniform float uAmbientIntensity;
	uniform vec3  uSunDir;          // normalised, points TOWARDS the sun
	uniform vec3  uSunColor;
	uniform float uSunIntensity;
	uniform vec3  uOrbitPos;        // world position of the orbiting light
	uniform vec3  uOrbitColor;
	uniform float uOrbitIntensity;
	uniform float uOrbitRange;
	uniform vec3  uLampPos;         // street lamp
	uniform vec3  uLampColor;
	uniform float uLampIntensity;
	uniform float uLampRange;
	uniform vec3  uFogColor;
	uniform float uFogNear;
	uniform float uFogFar;
	uniform float uNight;           // 0.0 = full day, 1.0 = full night
	uniform float uTime;
`

/** Point-light attenuation + linear fog, shared by the lit shaders. */
export const GLSL_LIT_HELPERS = /* glsl */ `
	// Inverse-square-ish falloff clamped to a finite range so the light can
	// never leak across the whole plot.
	vec3 pointLight(vec3 lightPos, vec3 lightColor, float intensity, float range,
	                vec3 N, vec3 V, vec3 posW, vec3 albedo,
	                float shininess, float specStrength) {
		vec3 toL = lightPos - posW;
		float dist = length(toL);
		if (dist > range) return vec3(0.0);
		vec3 L = toL / max(dist, 0.0001);
		float att = clamp(1.0 - dist / range, 0.0, 1.0);
		att = att * att;
		return blinnPhong(N, L, V, lightColor * intensity * att, albedo,
		                  shininess, specStrength);
	}

	vec3 applyFog(vec3 col, float dist) {
		float f = clamp((dist - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
		return mix(col, uFogColor, f * 0.9);
	}
`

/* ------------------------------------------------------------------------ */
/* 1. Sky dome                                                              */
/* ------------------------------------------------------------------------ */

export const SKY_VERT = /* glsl */ `
	varying vec3 vDir;
	void main() {
		vec4 wp = modelMatrix * vec4(position, 1.0);
		vDir = normalize(wp.xyz);
		gl_Position = projectionMatrix * viewMatrix * wp;
	}
`

export const SKY_FRAG = /* glsl */ `
	uniform vec3  uZenithDay;
	uniform vec3  uHorizonDay;
	uniform vec3  uZenithNight;
	uniform vec3  uHorizonNight;
	uniform vec3  uSunDir;
	uniform vec3  uSunTint;
	uniform float uNight;
	uniform float uTime;
	varying vec3 vDir;

	${GLSL_COMMON}

	void main() {
		vec3 d = normalize(vDir);

		// Vertical gradient. pow() compresses the gradient near the horizon
		// which is what a real sky looks like.
		float t = pow(clamp(d.y, 0.0, 1.0), 0.55);
		vec3 day   = mix(uHorizonDay,   uZenithDay,   t);
		vec3 night = mix(uHorizonNight, uZenithNight, t);
		vec3 col   = mix(day, night, uNight);

		// Warm band around the sun near sunrise / sunset.
		float sd = max(dot(d, normalize(uSunDir)), 0.0);
		float horizonWarm = pow(1.0 - abs(d.y), 6.0) * pow(sd, 2.0);
		col += vec3(0.95, 0.45, 0.18) * horizonWarm * (1.0 - uNight) * 0.9;

		// Sun / moon disk plus glow.
		float disk = smoothstep(0.9976, 0.9990, sd);
		float glow = pow(sd, 120.0) * 0.55 + pow(sd, 10.0) * 0.14;
		col += uSunTint * (disk * 2.6 + glow);

		// Star field, only at night and only above the horizon.
		if (uNight > 0.02 && d.y > 0.01) {
			vec2 sph = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0)));
			vec2 cell = floor(sph * 150.0);
			float r = hash12(cell);
			float star = step(0.9972, r);
			float twinkle = 0.55 + 0.45 * sin(uTime * 2.6 + r * 90.0);
			col += vec3(0.92, 0.95, 1.0) * star * twinkle * uNight *
			       smoothstep(0.0, 0.22, d.y);
		}

		gl_FragColor = vec4(linearToSRGB(col), 1.0);
	}
`

/* ------------------------------------------------------------------------ */
/* 2. Building facade                                                       */
/* ------------------------------------------------------------------------ */

export const LIT_VERT = /* glsl */ `
	uniform vec2 uRepeat;
	uniform vec2 uOffset;
	varying vec2 vUv;
	varying vec3 vNormalW;
	varying vec3 vPosW;
	void main() {
		vUv = uv * uRepeat + uOffset;
		vec4 wp = modelMatrix * vec4(position, 1.0);
		vPosW = wp.xyz;
		// Meshes are built at real size (never non-uniformly scaled), so the
		// upper-left 3x3 of modelMatrix is a safe normal matrix.
		vNormalW = normalize(mat3(modelMatrix) * normal);
		gl_Position = projectionMatrix * viewMatrix * wp;
	}
`

export const FACADE_FRAG = /* glsl */ `
	uniform sampler2D uMap;
	uniform sampler2D uNormalMap;
	uniform sampler2D uWindowMask;
	uniform sampler2D uMapB;
	uniform sampler2D uNormalMapB;
	uniform float uMix;             // 0 = skin A, 1 = skin B (cross-fade)
	uniform float uNormalStrength;
	uniform float uShininess;
	uniform float uSpecStrength;
	uniform vec3  uWindowColor;
	uniform float uWindowGlow;
	uniform vec3  uTint;
	${LIGHT_UNIFORMS}
	varying vec2 vUv;
	varying vec3 vNormalW;
	varying vec3 vPosW;

	${GLSL_COMMON}
	${GLSL_LIT_HELPERS}

	void main() {
		vec3 albedoA = sRGBToLinear(texture2D(uMap,  vUv).rgb);
		vec3 albedoB = sRGBToLinear(texture2D(uMapB, vUv).rgb);
		vec3 albedo  = mix(albedoA, albedoB, uMix) * uTint;

		vec3 Ngeo = normalize(vNormalW);
		vec3 nA = applyNormalMap(Ngeo, uNormalMap,  vUv, uNormalStrength);
		vec3 nB = applyNormalMap(Ngeo, uNormalMapB, vUv, uNormalStrength);
		vec3 N  = normalize(mix(nA, nB, uMix));

		vec3 V = normalize(cameraPosition - vPosW);

		// Glass is shinier than masonry, so drive specular with the mask.
		float win = texture2D(uWindowMask, vUv).r;
		float spec = uSpecStrength * (0.25 + 1.75 * win);
		float shin = uShininess * (1.0 + 2.0 * win);

		// Hemisphere-ish ambient: a little brighter on up-facing surfaces.
		float sky = 0.55 + 0.45 * clamp(N.y, 0.0, 1.0);
		vec3 col = albedo * uAmbientColor * uAmbientIntensity * sky;

		// Sun (directional).
		col += blinnPhong(N, normalize(uSunDir), V,
		                  uSunColor * uSunIntensity, albedo, shin, spec);

		// The orbiting light - this is what makes the required animation
		// clearly visible as it sweeps across the walls.
		col += pointLight(uOrbitPos, uOrbitColor, uOrbitIntensity, uOrbitRange,
		                  N, V, vPosW, albedo, shin, spec);

		// Street lamp.
		col += pointLight(uLampPos, uLampColor, uLampIntensity, uLampRange,
		                  N, V, vPosW, albedo, shin, spec);

		// Emissive windows after dark, with a subtle per-window flicker so the
		// building reads as "lived in".
		float cell = floor(vUv.x) * 7.0 + floor(vUv.y) * 13.0;
		float occupied = step(0.28, hash12(vec2(cell, 3.7)));
		float flicker = 0.88 + 0.12 * sin(uTime * 1.7 + cell);
		col += uWindowColor * win * uWindowGlow * uNight * occupied * flicker;

		col = applyFog(col, length(cameraPosition - vPosW));
		gl_FragColor = vec4(linearToSRGB(col), 1.0);
	}
`

/* ------------------------------------------------------------------------ */
/* 3. Cottage walls (mouse-driven texture cross-fade)                       */
/* ------------------------------------------------------------------------ */

export const COTTAGE_FRAG = /* glsl */ `
	uniform sampler2D uMapA;
	uniform sampler2D uMapB;
	uniform sampler2D uNormalA;
	uniform sampler2D uNormalB;
	uniform float uMix;            // animated 0 -> 1 on every mouse click
	uniform vec3  uTintA;
	uniform vec3  uTintB;
	uniform float uShininess;
	uniform float uSpecStrength;
	uniform float uNormalStrength;
	uniform float uHighlight;      // hover feedback from the raycaster
	${LIGHT_UNIFORMS}
	varying vec2 vUv;
	varying vec3 vNormalW;
	varying vec3 vPosW;

	${GLSL_COMMON}
	${GLSL_LIT_HELPERS}

	void main() {
		// Cross-fade both the colour and the normal map so the switch looks
		// like a real material change, not a hard texture swap.
		vec3 aCol = sRGBToLinear(texture2D(uMapA, vUv).rgb) * uTintA;
		vec3 bCol = sRGBToLinear(texture2D(uMapB, vUv).rgb) * uTintB;
		vec3 albedo = mix(aCol, bCol, uMix);

		vec3 Ngeo = normalize(vNormalW);
		vec3 nA = applyNormalMap(Ngeo, uNormalA, vUv, uNormalStrength);
		vec3 nB = applyNormalMap(Ngeo, uNormalB, vUv, uNormalStrength);
		vec3 N  = normalize(mix(nA, nB, uMix));

		vec3 V = normalize(cameraPosition - vPosW);

		float sky = 0.55 + 0.45 * clamp(N.y, 0.0, 1.0);
		vec3 col = albedo * uAmbientColor * uAmbientIntensity * sky;

		col += blinnPhong(N, normalize(uSunDir), V,
		                  uSunColor * uSunIntensity, albedo,
		                  uShininess, uSpecStrength);
		col += pointLight(uOrbitPos, uOrbitColor, uOrbitIntensity, uOrbitRange,
		                  N, V, vPosW, albedo, uShininess, uSpecStrength);
		col += pointLight(uLampPos, uLampColor, uLampIntensity, uLampRange,
		                  N, V, vPosW, albedo, uShininess, uSpecStrength);

		// Hover feedback: a thin fresnel rim so the user can see the cottage
		// is clickable.
		float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.5);
		col += vec3(0.22, 0.48, 0.85) * rim * uHighlight;

		col = applyFog(col, length(cameraPosition - vPosW));
		gl_FragColor = vec4(linearToSRGB(col), 1.0);
	}
`

/* ------------------------------------------------------------------------ */
/* 4. Foliage - vertex displacement wind                                    */
/* ------------------------------------------------------------------------ */

export const FOLIAGE_VERT = /* glsl */ `
	uniform vec2  uRepeat;
	uniform float uTime;
	uniform float uWind;
	varying vec2 vUv;
	varying vec3 vNormalW;
	varying vec3 vPosW;
	void main() {
		vUv = uv * uRepeat;

		// Per-vertex phase so the canopy bends instead of sliding rigidly.
		float phase = position.x * 0.7 + position.y * 0.45 + position.z * 0.6;
		vec3 p = position;
		float s1 = sin(uTime * 1.25 + phase);
		float s2 = sin(uTime * 2.10 + phase * 1.7);
		// Amplitude grows with height so the top moves more than the base.
		float amp = uWind * (0.35 + 0.65 * clamp(position.y * 0.5 + 0.5, 0.0, 1.0));
		p.x += (s1 * 0.7 + s2 * 0.3) * amp;
		p.z += (cos(uTime * 1.05 + phase) * 0.6) * amp;
		p.y += s2 * amp * 0.18;

		vec4 wp = modelMatrix * vec4(p, 1.0);
		vPosW = wp.xyz;
		vNormalW = normalize(mat3(modelMatrix) * normal);
		gl_Position = projectionMatrix * viewMatrix * wp;
	}
`

export const FOLIAGE_FRAG = /* glsl */ `
	uniform sampler2D uMap;
	uniform sampler2D uNormalMap;
	uniform float uNormalStrength;
	uniform float uShininess;
	uniform float uSpecStrength;
	uniform float uSeason;         // 0 = summer green, 1 = autumn amber
	uniform vec3  uAutumnColor;
	${LIGHT_UNIFORMS}
	varying vec2 vUv;
	varying vec3 vNormalW;
	varying vec3 vPosW;

	${GLSL_COMMON}
	${GLSL_LIT_HELPERS}

	void main() {
		vec3 tex = sRGBToLinear(texture2D(uMap, vUv).rgb);
		// Keep the texture's luminance but push the hue towards autumn.
		float lum = dot(tex, vec3(0.299, 0.587, 0.114));
		vec3 autumn = sRGBToLinear(uAutumnColor) * (0.55 + 0.9 * lum);
		vec3 albedo = mix(tex, autumn, uSeason);

		vec3 N = applyNormalMap(normalize(vNormalW), uNormalMap, vUv, uNormalStrength);
		vec3 V = normalize(cameraPosition - vPosW);

		vec3 col = albedo * uAmbientColor * uAmbientIntensity *
		           (0.6 + 0.4 * clamp(N.y, 0.0, 1.0));
		col += blinnPhong(N, normalize(uSunDir), V,
		                  uSunColor * uSunIntensity, albedo,
		                  uShininess, uSpecStrength);

		// Cheap translucency: leaves lit from behind glow slightly.
		float back = max(dot(-N, normalize(uSunDir)), 0.0);
		col += albedo * uSunColor * uSunIntensity * pow(back, 3.0) * 0.35;

		col += pointLight(uOrbitPos, uOrbitColor, uOrbitIntensity, uOrbitRange,
		                  N, V, vPosW, albedo, uShininess, uSpecStrength);
		col += pointLight(uLampPos, uLampColor, uLampIntensity, uLampRange,
		                  N, V, vPosW, albedo, uShininess, uSpecStrength);

		col = applyFog(col, length(cameraPosition - vPosW));
		gl_FragColor = vec4(linearToSRGB(col), 1.0);
	}
`

/* ------------------------------------------------------------------------ */
/* 5. Chimney smoke - GPU point sprites                                     */
/* ------------------------------------------------------------------------ */

export const SMOKE_VERT = /* glsl */ `
	attribute float aSeed;
	attribute float aSpeed;
	uniform float uTime;
	uniform float uSize;
	uniform float uRise;
	uniform float uSpread;
	varying float vLife;
	void main() {
		// Each particle loops through its own 0..1 lifetime.
		float life = fract(uTime * aSpeed + aSeed);
		vLife = life;

		vec3 p = position;
		p.y += life * uRise;
		p.x += sin(uTime * 0.8 + aSeed * 37.0) * uSpread * life;
		p.z += cos(uTime * 0.7 + aSeed * 23.0) * uSpread * life;

		vec4 mv = modelViewMatrix * vec4(p, 1.0);
		gl_Position = projectionMatrix * mv;
		// Perspective-correct point size: puffs grow as they rise and shrink
		// with distance.
		gl_PointSize = uSize * (1.0 + life * 2.6) * (300.0 / max(-mv.z, 0.001));
	}
`

export const SMOKE_FRAG = /* glsl */ `
	uniform vec3  uColor;
	uniform float uOpacity;
	varying float vLife;
	void main() {
		vec2 c = gl_PointCoord - 0.5;
		float d = length(c);
		// Soft round puff that fades out over its lifetime.
		float a = smoothstep(0.5, 0.06, d) * (1.0 - vLife) * uOpacity;
		if (a < 0.004) discard;
		gl_FragColor = vec4(uColor, a);
	}
`

/* ------------------------------------------------------------------------ */
/* 6. Fresnel glow (orbiting light orb, lamp bulb)                          */
/* ------------------------------------------------------------------------ */

export const GLOW_VERT = /* glsl */ `
	varying vec3 vNormalW;
	varying vec3 vPosW;
	void main() {
		vec4 wp = modelMatrix * vec4(position, 1.0);
		vPosW = wp.xyz;
		vNormalW = normalize(mat3(modelMatrix) * normal);
		gl_Position = projectionMatrix * viewMatrix * wp;
	}
`

export const GLOW_FRAG = /* glsl */ `
	uniform vec3  uColor;
	uniform float uPower;
	uniform float uStrength;
	varying vec3 vNormalW;
	varying vec3 vPosW;
	void main() {
		vec3 V = normalize(cameraPosition - vPosW);
		// Fresnel term: 1 at the silhouette, 0 facing the camera.
		float f = pow(1.0 - clamp(dot(normalize(vNormalW), V), 0.0, 1.0), uPower);
		f = clamp(f + 0.18, 0.0, 1.0);
		gl_FragColor = vec4(uColor * f * uStrength, f);
	}
`
