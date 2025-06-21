const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

const tests = {
	testFlow: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window
		
		// Add an image first
		const $fileInput = $("add-new[post] input[image]")
		const validPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
		const binaryString = window.atob(validPngBase64)
		const bytes = new Uint8Array(binaryString.length)
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i)
		}
		const file = new window.File([bytes], 'test.png', { type: 'image/png' })
		
		Object.defineProperty($fileInput, 'files', {
			value: {
				0: file,
				length: 1,
				item: (i) => i === 0 ? file : null
			}
		})
		
		$fileInput.dispatchEvent(new window.Event('change', { bubbles: true }))
		await new Promise(resolve => setTimeout(resolve, 10))
		
		// Verify image preview appears
		assertEquals(
			1,
			$("add-new[post] image-previews preview").length,
			"Should show one image preview"
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
		
		// Verify the image is displayed in the created post
		assertEquals(
			1,
			$("main-content-2 posts post:first-child p[img]").length,
			"New post should display the uploaded image"
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))