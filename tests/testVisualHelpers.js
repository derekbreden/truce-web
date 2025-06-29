const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const findChromeExecutable = () => {
	const possiblePaths = [
		// Mac
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		// Linux
		"/usr/bin/google-chrome",
		"/usr/bin/chromium-browser",
		"/usr/bin/chromium",
		// Windows
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
	]
	
	for (const chromePath of possiblePaths) {
		if (fs.existsSync(chromePath)) {
			return chromePath
		}
	}
	
	// Fallback to which command
	try {
		const result = execSync("which google-chrome || which chromium-browser || which chromium", {
			encoding: "utf8",
			stdio: "pipe"
		})
		return result.trim()
	} catch (e) {
		throw new Error("Chrome/Chromium not found on this system")
	}
}

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
	const chromePath = findChromeExecutable()
	const start_time = new Date()
	execSync(
		[
			`"${chromePath}"`,
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--force-device-scale-factor=1",
			"--hide-scrollbars",
			`--screenshot="${pngPath}"`,
			`--window-size=1200,720 "file://${absoluteHtmlPath}"`,
		].join(" "),
		{ stdio: "pipe" }
	)
	const end_time = new Date()
	console.log(`Screenshot captured in ${end_time - start_time}ms`)
	
	// Clean up HTML file
	fs.unlinkSync(htmlPath)
}

module.exports = { captureVisual }