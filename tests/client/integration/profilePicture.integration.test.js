const path = require('path');
const { loadAllClientScripts } = require('../shared/testHelpers.js');
const { assertEquals, runTests } = require('../shared/testUtils.js');

const tests = {
    showsErrorModalOnProfilePictureUploadFailure: async () => { // Ensure async
        const window = loadAllClientScripts(); // This should mock setTimeout and fetch

        const originalImageToPng = window.imageToPng;
        const originalFileReader = window.FileReader;

        try {
            window.imageToPng = (src, callback, size, crop) => {
                callback({ url: "mock_png_data_url", width: 100, height: 100 });
            };

            window.FileReader = function() {
                this.readAsDataURL = (file) => {
                    if (this.onload) {
                        this.onload({ target: { result: "mock_filereader_data_url" } });
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
            imagePreviewArea.setAttribute('id', 'testImagePreviewArea');
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
                return;
            }

            window.editProfilePicture();

            // First await: allow fetch Promise to resolve, modalError to be called,
            // and its (mocked immediate) setTimeout to create modal shell.
            await new Promise(resolve => setTimeout(resolve, 0));
            // Second await: allow any subsequent microtask or immediate setTimeout
            // used by modalError to populate content.
            await new Promise(resolve => setTimeout(resolve, 0));

            const errorModalContentElement = window.document.querySelector("modal[error] error");
            assertEquals(
                true,
                !!errorModalContentElement,
                "Error modal content element ('modal[error] error') should be found."
            );

            if (errorModalContentElement) {
                assertEquals(
                    "Test error: Unmocked fetch path",
                    errorModalContentElement.innerText.trim(),
                    "Error message in modal should be 'Test error: Unmocked fetch path'."
                );
            }
            window.document.body.removeChild(profilePictureContainer);

        } finally {
            window.imageToPng = originalImageToPng;
            window.FileReader = originalFileReader;
        }
    }
};

runTests(path.basename(__filename), Object.values(tests));
