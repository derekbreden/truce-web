const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window
		
		// Read 1024x1024 PNG that will get resized to itself and return the same at the end
		const fs = require("fs")
		const path = require("path")
		const processed_data_file = path.join(__dirname, "../data", "1024_base64.txt")
		const valid_png_base64 = await fs.promises.readFile(processed_data_file, "utf8")
		const binary_string = window.atob(valid_png_base64)
		const bytes = new Uint8Array(binary_string.length)
		for (let i = 0; i < binary_string.length; i++) {
			bytes[i] = binary_string.charCodeAt(i)
		}
		const file = new window.File([bytes], "test.png", { type: "image/png" })

		// Add the image to the file input and trigger change
		const $file_input = $("add-new[post] input[image]")
		Object.defineProperty($file_input, "files", {
			value: {
				0: file,
				length: 1,
				item: (i) => i === 0 ? file : null
			}
		})
		await $file_input.dispatchEvent(new window.Event("change", { bubbles: true }))
		await new Promise(resolve => setTimeout(resolve, 0))

		// Verify thumbnail has same image
		await window.waitForElement("add-new[post] image-previews preview img")
		assertEquals(
			"data:image/png;base64," + valid_png_base64,
			$("add-new[post] image-previews preview img").src,
			"Should have thumbnail from canvas resize",
		)
		
		// Fill in the post form
		$("add-new[post] input[title]").value = "Newly Created Post Title"
		$("add-new[post] textarea[body]").value = "This is the body content of the newly created post. It needs to be longer than the title to pass validation."

		// Submit the post
		$("add-new[post] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Verify the form was cleared after successful creation
		assertEquals(
			"",
			$("add-new[post] input[title]").value,
			"Title field should be cleared after successful post creation",
		)

		// Verify the new post is rendered instantly (getMoreRecent was triggered)
		assertEquals(
			"Newly Created Post Title", 
			$("main-content-2 posts post:first-child h2").textContent.trim(),
			"New post should be rendered with correct title",
		)
		assertEquals(
			"This is the body content of the newly created post. It needs to be longer than the title to pass validation.",
			$("main-content-2 posts post:first-child p span").textContent,
			"New post should be rendered with correct body content",
		)

		// Verify round-trip image is the same calling our endpoint that pulls it from S3
		const $image_element = $("main-content-2 posts post:first-child p[img] img")
		const image_response = await window.fetch($image_element.getAttribute("src"), { method: "GET" })
		const response_data = await image_response.json()
		assertEquals(valid_png_base64, response_data, "Retrieved image data should match input data")
	},
}

runTests(path.basename(__filename), Object.values(tests))