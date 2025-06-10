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
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Test markdown rendering
	assertEquals("/posts", state.path, "Should be on posts page")
	assertEquals("Header Test", $("p[bold] span").innerText.trim(), "Should render header with bold attribute")
	assertEquals("This is a quote block", $("p[quote] span").innerText.trim(), "Should render quote with quote attribute")
	assertEquals("https://example.com/test", $(`a[href="https://example.com/test"]`).getAttribute("href"), "Should auto-link plain URLs")
	assertEquals("This is a link", $(`a[href="https://example.com"]`).innerText.trim(), "Should render explicit markdown links")
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
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Test markdown rendering in the posts list
	assertEquals("Bold paragraph", $("p[bold] span").innerText.trim(), "Should render bold paragraph")
	assertEquals("Italic paragraph", $("p[italic] span").innerText.trim(), "Should render italic paragraph")
	assertEquals(true, $("p span").length > 0, "Should render mixed content with spans")
	assertEquals(3, $("post p a").length, "Should render links in mixed content")
	assertEquals("Image with spaces in alt text", $("post img").alt, "Should handle images with spaces in alt text")
	assertEquals(true, $(`a[href*="very-long-url-that-should-be-abbreviated.com"]`).innerText.trim().length < $(`a[href*="very-long-url-that-should-be-abbreviated.com"]`).getAttribute("href").length, "Should abbreviate long URLs")
	assertEquals(true, $(`a[href*="file.pdf"]`).innerText.trim().includes("pdf"), "Should preserve file extensions in abbreviated URLs")
}

async function testComplexMarkdownParsing() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Test complex mixed image and link parsing that exercises both parsing loops
	window.setMockFetchResponseForPaths({
		"/posts": {
			path: "/posts",
			posts: [
				{
					slug: "complex-parsing-test",
					title: "Complex Parsing Test",
					body: `Mixed content: ![image1](img1.jpg) with text [link1](url1.com) more text.

![image2](img2.jpg)[link2](url2.com)

Text ![img3](img3.jpg) between [link3](url3.com) elements ![img4](img4.jpg) and [link4](url4.com) end.

[Link with (parens)](http://example.com/path(param)) and ![Image (alt)](image(name).jpg)

Multiple: ![a](1.jpg) ![b](2.jpg) [x](u1.com) [y](u2.com) ![c](3.jpg) [z](u3.com)`,
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

	// Navigate to posts to trigger markdown rendering
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify complex parsing worked correctly
	const $post = $("post[trimmed]")
	
	// Test basic parsing worked - check total counts
	const $allImages = $post.querySelectorAll("img")
	const $allLinks = $post.querySelectorAll("a")
	assertEquals(8, $allImages.length, "Should parse all 8 images from complex markdown")
	assertEquals(8, $allLinks.length, "Should parse all 8 links from complex markdown")

	// Test specific elements to verify parsing accuracy
	assertEquals("img1.jpg", $allImages[0].getAttribute("src"), "First image should be parsed correctly")
	assertEquals("url1.com", $allLinks[0].getAttribute("href"), "First link should be parsed correctly")
	assertEquals("img2.jpg", $allImages[1].getAttribute("src"), "Second image (adjacent) should be parsed")
	assertEquals("url2.com", $allLinks[1].getAttribute("href"), "Second link (adjacent) should be parsed")
	
	// Test parentheses handling
	assertEquals("Link with (parens)", $allLinks[4].innerText.trim(), "Should handle parentheses in link text")
	assertEquals("http://example.com/path(param)", $allLinks[4].getAttribute("href"), "Should handle parentheses in URL")
	assertEquals("Image (alt)", $allImages[4].getAttribute("alt"), "Should handle parentheses in image alt")
	assertEquals("image(name).jpg", $allImages[4].getAttribute("src"), "Should handle parentheses in image src")

	// Test sequence preservation in complex alternating paragraph
	assertEquals("1.jpg", $allImages[5].getAttribute("src"), "First image in alternating sequence")
	assertEquals("2.jpg", $allImages[6].getAttribute("src"), "Second image in alternating sequence")
	assertEquals("3.jpg", $allImages[7].getAttribute("src"), "Third image in alternating sequence")
	assertEquals("u1.com", $allLinks[5].getAttribute("href"), "First link in alternating sequence")
	assertEquals("u2.com", $allLinks[6].getAttribute("href"), "Second link in alternating sequence")
	assertEquals("u3.com", $allLinks[7].getAttribute("href"), "Third link in alternating sequence")
	
	// Verify text spans are created properly around elements
	const $allSpans = $post.querySelectorAll("p span")
	assertEquals(true, $allSpans.length > 0, "Should create text spans around parsed elements")
	assertEquals("Mixed content: ", $allSpans[0].innerText, "Should preserve text before first image")
	assertEquals(" with text ", $allSpans[1].innerText, "Should preserve text between elements")
}

runTests("markdown_rendering.integration.test.js", [testMarkdownRendering, testComplexMarkdownCombinations, testComplexMarkdownParsing])