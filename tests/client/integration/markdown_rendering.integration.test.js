const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testMarkdownRendering() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Mock responses for navigating to a post with markdown content
	window.setMockFetchResponseForPaths({
		"/posts": {
			path: "/posts",
			posts: [
				{
					slug: "markdown-test-post",
					title: "Markdown Test",
					body: `# Header Test

This is a paragraph with **bold text** and *italic text*.

> This is a quote block

Here's an auto-link: https://example.com/test

[This is a link](https://example.com)

![Test Image](https://example.com/image.jpg)

Here's a list:

- Item one

And a numbered list:

1. First item

---

/mp3/test-audio.mp3`,
					user_slug: "testuser",
					display_name: "Test User",
					topics: "general",
					reply_count: 0,
					favorite_count: 0,
					favorited: false,
					replyed: false,
					image_uuids: null,
					profile_picture_uuid: null,
					display_name_index: 0,
					user_verified: false,
					note: "",
					poll_1: null
				}
			],
			replies: [],
			activities: [],
			notifications: [],
			user_slug: null,
			subscribed_to_users: 0,
			user_id: null,
			email: null,
			display_name: null,
			profile_picture_uuid: null,
			display_name_index: 0,
			has_more: false
		}
	})

	// Navigate from welcome to posts
	const $joinButton = $("a[href='/posts'][big]")
	$joinButton.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Test markdown rendering
	assertEquals("/posts", state.path, "Should be on posts page")
	assertEquals("Header Test", $("p[bold] span").innerText.trim(), "Should render header with bold attribute")
	assertEquals("This is a quote block", $("p[quote] span").innerText.trim(), "Should render quote with quote attribute")
	assertEquals("https://example.com/test", $("a[href='https://example.com/test']").getAttribute("href"), "Should auto-link plain URLs")
	assertEquals("This is a link", $("a[href='https://example.com']").innerText.trim(), "Should render explicit markdown links")
	assertEquals("Test Image", $("post img").alt, "Image should have alt")
	assertEquals("https://example.com/image.jpg", $("post img").src, "Image should have src")
	assertEquals("Item one", $("ul li").innerText.trim(), "Should render unordered lists")
	assertEquals("First item", $("ol li").innerText.trim(), "Should render ordered lists")
	assertEquals(true, Boolean($("p[hr]")), "Should render horizontal rule")
	assertEquals("http://localhost/mp3/test-audio.mp3", $("audio").src, "Should render audio elements")
}

async function testComplexMarkdownCombinations() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Mock responses for a post with complex markdown patterns
	window.setMockFetchResponseForPaths({
		"/posts": {
			path: "/posts",
			posts: [
				{
					slug: "complex-markdown-post",
					title: "Complex Markdown",
					body: `**Bold paragraph**

*Italic paragraph*

Mixed content with **bold** and *italic* and [a link](https://example.com) in one paragraph.

Multiple paragraphs

With spacing between them

![Image with spaces in alt text](https://example.com/image space.jpg)

https://very-long-url-that-should-be-abbreviated.com/some/very/long/path/that/exceeds/thirty-two/characters

https://example.com/file.pdf`,
					user_slug: "testuser2",
					display_name: "Test User 2",
					topics: "general",
					reply_count: 0,
					favorite_count: 0,
					favorited: false,
					replyed: false,
					image_uuids: null,
					profile_picture_uuid: null,
					display_name_index: 0,
					user_verified: false,
					note: "",
					poll_1: null
				}
			],
			replies: [],
			activities: [],
			notifications: [],
			user_slug: null,
			subscribed_to_users: 0,
			user_id: null,
			email: null,
			display_name: null,
			profile_picture_uuid: null,
			display_name_index: 0,
			has_more: false
		}
	})

	// Navigate from welcome to posts
	const $joinButton = $("a[href='/posts'][big]")
	$joinButton.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Test markdown rendering in the posts list
	assertEquals("Bold paragraph", $("p[bold] span").innerText.trim(), "Should render bold paragraph")
	assertEquals("Italic paragraph", $("p[italic] span").innerText.trim(), "Should render italic paragraph")
	assertEquals(true, $("p span").length > 0, "Should render mixed content with spans")
	assertEquals(3, $("post p a").length, "Should render links in mixed content")
	assertEquals("Image with spaces in alt text", $("post img").alt, "Should handle images with spaces in alt text")
	assertEquals(true, $("a[href*='very-long-url-that-should-be-abbreviated.com']").innerText.trim().length < $("a[href*='very-long-url-that-should-be-abbreviated.com']").getAttribute("href").length, "Should abbreviate long URLs")
	assertEquals(true, $("a[href*='file.pdf']").innerText.trim().includes("pdf"), "Should preserve file extensions in abbreviated URLs")
}

runTests("markdown_rendering.integration.test.js", [testMarkdownRendering, testComplexMarkdownCombinations])