const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const captureVisual = (window, filename) => {
	// Determine output directory: capture-baseline if CAPTURE_BASELINE env var, otherwise capture
	const dirName = process.env.CAPTURE_BASELINE ? "capture-baseline" : "capture"
	const outputDir = path.join(__dirname, dirName)
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true })
	}
	
	// Determine mode suffix
	const mode = process.env.DARK_MODE === "true" ? "dark" : "light"
	
	// Generate paths with mode suffix
	const htmlPath = path.join(outputDir, `${filename}-${mode}.html`)
	const pngPath = path.join(outputDir, `${filename}-${mode}.png`)
	
	// Save HTML temporarily, removing script tags to prevent JS re-execution
	const html = window.document.documentElement.outerHTML
	const html_without_scripts = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
	fs.writeFileSync(htmlPath, html_without_scripts)
	
	// Capture screenshot with Chrome headless
	const absoluteHtmlPath = path.resolve(htmlPath)
	const start_time = new Date()
	execSync(
		[
			`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`,
			"--headless",
			"--force-device-scale-factor=1",
			"--hide-scrollbars",
			`--screenshot="${pngPath}"`,
			`--window-size=1200,800 "file://${absoluteHtmlPath}"`,
		].join(" "),
		{ stdio: "pipe" }
	)
	execSync(`convert "${pngPath}" -crop 1200x720+0+0 "${pngPath}"`, { stdio: "pipe" })
	const end_time = new Date()
	console.log(`Screenshot captured in ${end_time - start_time}ms`)
	
	// Clean up HTML file
	fs.unlinkSync(htmlPath)
}

module.exports = { captureVisual }