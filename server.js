/**
 * server.js
 * ---------------------------------------------------------------------------
 * Tiny static file server for running the project locally.
 * Use it when Python is not installed on the machine.
 *
 *   node server.js          (port 8204 by default)
 *   node server.js 8500     (any other port)
 *
 * ES modules cannot be loaded from file:// because of browser CORS rules,
 * so the project must be served over http://localhost.
 */

const http = require("http")
const fs = require("fs")
const path = require("path")
const url = require("url")

const port = Number(process.argv[2]) || 8204
const root = __dirname

const TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".md": "text/markdown; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
}

http
	.createServer((req, res) => {
		let pathname = decodeURIComponent(url.parse(req.url).pathname)
		if (pathname === "/") pathname = "/index.html"

		// keep everything inside the project folder
		const filePath = path.join(root, path.normalize(pathname).replace(/^(\.\.[/\\])+/, ""))
		if (!filePath.startsWith(root)) {
			res.writeHead(403)
			res.end("Forbidden")
			return
		}

		fs.readFile(filePath, (err, data) => {
			if (err) {
				res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
				res.end("404 Not Found: " + pathname)
				return
			}
			res.writeHead(200, {
				"Content-Type": TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
				"Cache-Control": "no-cache",
			})
			res.end(data)
		})
	})
	.listen(port, () => {
		console.log(`CSE4204 project server running on http://localhost:${port}/index.html`)
		console.log("Press Ctrl+C to stop.")
	})
