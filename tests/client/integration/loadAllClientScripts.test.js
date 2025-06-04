const path = require('path');
const { loadAllClientScripts } = require('../shared/testHelpers.js');
const { assertEquals, runTests } = require('../shared/testUtils.js');

const tests = {
    testRealIndexHtmlLoads: () => {
        const window = loadAllClientScripts();
        assertEquals(false, window.is_android);
    },

    testEditProfilePictureShowsErrorModal: () => {
        const nativeSetTimeout = setTimeout; // Capture original setTimeout
        const window = loadAllClientScripts(); // This might alter global setTimeout

        // Mock imageToPng on the window object
        const originalImageToPng = window.imageToPng; // Save original
        window.imageToPng = (src, callback, size, crop) => {
            // console.log("TEST_DEBUG: Mock window.imageToPng called with src:", src);
            callback({ url: "mock_png_data_url", width: 100, height: 100 });
        };

        // Mock FileReader on the window object
        const originalFileReader = window.FileReader; // Save original
        window.FileReader = function() {
            // console.log("TEST_DEBUG: Mock window.FileReader constructor executed");
            this.readAsDataURL = (file) => {
                // console.log("TEST_DEBUG: Mock window.FileReader.readAsDataURL called with file:", file ? file.name : 'no file');
                if (this.onload) {
                    // console.log("TEST_DEBUG: Mock window.FileReader.onload is being triggered.");
                    this.onload({ target: { result: "mock_filereader_data_url" } });
                } else {
                    // console.log("TEST_DEBUG: Mock window.FileReader.onload is undefined.");
                }
            };
            this.onerror = null;
        };

        const profilePictureContainer = window.document.createElement('div');
        profilePictureContainer.setAttribute('profile-picture', '');

        const fileInput = window.document.createElement('input');
        fileInput.setAttribute('type', 'file');
        fileInput.setAttribute('image', '');

        const imagePreviewArea = window.document.createElement('div');
        imagePreviewArea.setAttribute('id', 'testImagePreviewArea'); // ID for stable selection
        imagePreviewArea.setAttribute('image', ''); // Keep if original flint selector needs it
        const initialImg = window.document.createElement('img');
        initialImg.setAttribute('src', 'placeholder-for-test.png');
        imagePreviewArea.appendChild(initialImg);

        profilePictureContainer.appendChild(fileInput);
        profilePictureContainer.appendChild(imagePreviewArea);
        window.document.body.appendChild(profilePictureContainer);

        const mockFile = new window.File(["dummy file content"], "test-image.png", { type: "image/png" });
        Object.defineProperty(fileInput, 'files', { value: [mockFile], writable: true });

        if (typeof window.editProfilePicture !== 'function') {
            assertEquals(true, false, "window.editProfilePicture function is not defined.");
            window.document.body.removeChild(profilePictureContainer);
            // Restore mocks
            window.imageToPng = originalImageToPng;
            window.FileReader = originalFileReader;
            return;
        }

        // console.log("TEST_DEBUG: Calling window.editProfilePicture()");
        window.editProfilePicture();

        nativeSetTimeout(() => {
            // console.log("TEST_DEBUG: nativeSetTimeout callback executing. Checking for modal.");
            // console.log("TEST_DEBUG: Body HTML:", window.document.body.innerHTML);
            const errorModalContentElement = window.document.querySelector("modal[error] error");

            assertEquals(
                true,
                !!errorModalContentElement,
                "Error modal content element ('modal[error] error') should be found."
            );

            if (errorModalContentElement) {
                assertEquals(
                    "Test error",
                    errorModalContentElement.textContent.trim(),
                    "Error message in modal should be 'Test error'."
                );
            }
            window.document.body.removeChild(profilePictureContainer);
            // Restore mocks
            window.imageToPng = originalImageToPng;
            window.FileReader = originalFileReader;
        }, 100); // Using a slightly longer delay
    }
};

runTests(path.basename(__filename), Object.values(tests));
