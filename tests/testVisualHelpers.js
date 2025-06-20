const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const captureVisual = (window, filename) => {
	// Create visual-output directory if it doesn't exist
	const outputDir = path.join(__dirname, "visual-output")
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true })
	}
	
	// Generate paths
	const htmlPath = path.join(outputDir, `${filename}.html`)
	const pngPath = path.join(outputDir, `${filename}.png`)
	
	// Save HTML temporarily, removing script tags to prevent JS re-execution
	const html = window.document.documentElement.outerHTML
	const htmlWithoutScripts = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
	fs.writeFileSync(htmlPath, htmlWithoutScripts)
	
	// Capture screenshot with Chrome headless
	try {
		const absoluteHtmlPath = path.resolve(htmlPath)
		execSync(`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --screenshot="${pngPath}" --window-size=1200,800 "file://${absoluteHtmlPath}"`, { stdio: 'pipe' })
	} catch (e) {
		console.error("Chrome screenshot failed:", e.message)
		throw new Error("Visual capture failed")
	}
	
	// Clean up HTML file
	fs.unlinkSync(htmlPath)
}

module.exports = { captureVisual }