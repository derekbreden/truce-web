const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

/**
 * Compare baseline and capture images, generate diffs
 */
const main = async () => {
	const allArgs = process.argv.splice(2)
	const searchArgs = allArgs.filter(arg => arg !== "capture" && arg !== "capture-baseline" && arg !== "dark" && arg !== "visual")
	const pathArg = searchArgs.join(" ")

	const baselineDir = path.join(__dirname, "..", "capture-baseline")
	const captureDir = path.join(__dirname, "..", "capture") 
	const diffDir = path.join(__dirname, "..", "capture-diff")

	// Create diff directory
	if (!fs.existsSync(diffDir)) {
		fs.mkdirSync(diffDir, { recursive: true })
	}

	// Clean existing diff files
	if (fs.existsSync(diffDir)) {
		const files = fs.readdirSync(diffDir)
		files.forEach(file => {
			fs.unlinkSync(path.join(diffDir, file))
		})
	}

	// Check if baseline and capture directories exist
	if (!fs.existsSync(baselineDir)) {
		console.log("❌ No capture-baseline directory found. Run: npm test visual capture-baseline")
		return
	}

	if (!fs.existsSync(captureDir)) {
		console.log("❌ No capture directory found. Run: npm test visual capture")
		return
	}

	// Get baseline files
	let baselineFiles = fs.readdirSync(baselineDir).filter(f => f.endsWith('.png'))
	const captureFiles = fs.readdirSync(captureDir).filter(f => f.endsWith('.png'))

	// Filter based on pathArg
	if (pathArg) {
		const searchTerms = pathArg.split(" ")
		baselineFiles = baselineFiles
			.filter(filename => searchTerms.some(term => filename.includes(term)))
	}

	console.log(`\n📊 Visual Diff Report`)
	console.log(`Baseline images: ${baselineFiles.length}`)
	console.log(`Capture images: ${captureFiles.length}`)

	const results = []

	// Compare each baseline file with corresponding capture file
	for (const baselineFile of baselineFiles) {
		const capturePath = path.join(captureDir, baselineFile)
		
		if (!fs.existsSync(capturePath)) {
			console.log(`⚠️  Missing capture for: ${baselineFile}`)
			continue
		}

		const baselinePath = path.join(baselineDir, baselineFile)
		const diffPath = path.join(diffDir, `diff-${baselineFile}`)

		try {
			// Use ImageMagick compare command to generate diff
			const result = execSync(
				`compare -metric AE "${baselinePath}" "${capturePath}" "${diffPath}" 2>&1 || true`,
				{ encoding: 'utf8' }
			)

			const diffPixels = parseInt(result.trim()) || 0
			const status = diffPixels === 0 ? "✅ IDENTICAL" : `🔄 ${diffPixels} pixels different`

			if (diffPixels === 0) {
				// If identical, remove the diff file
				if (fs.existsSync(diffPath)) {
					fs.unlinkSync(diffPath)
				}
			}
			
			console.log(`${status}: ${baselineFile}`)
			
			results.push({
				file: baselineFile,
				diffPixels,
				identical: diffPixels === 0
			})

		} catch (error) {
			console.log(`❌ Error comparing ${baselineFile}: ${error.message}`)
		}
	}

	// Summary
	const identical = results.filter(r => r.identical).length
	const different = results.filter(r => !r.identical).length
	
	console.log(`\n📋 Summary:`)
	console.log(`  Identical: ${identical}`)
	console.log(`  Different: ${different}`)

	if (different > 0) {
		console.log(`\n🔍 Files with differences:`)
		results.filter(r => !r.identical).forEach(r => {
			console.log(`  - ${r.file}: ${r.diffPixels} pixels`)
		})
		console.log(`\nDiff images saved to: tests/diff/`)
	} else {
		console.log(`\n✅ All images are identical - no visual changes detected.`)
	}
}

main().catch(error => {
	console.error("Error in generateDiff:", error)
	process.exit(1)
})