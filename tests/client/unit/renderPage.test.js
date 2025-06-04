const path = require('path');
const { assertEquals, runTests } = require('../shared/testUtils.js');
const { loadClientScript, createMockDocument, createMockWindow, createMockFunction } = require('../shared/testHelpers.js');

const mockDocument = createMockDocument();
const mockWindow = createMockWindow();

let mockState;
let mockHistory;
let mockRenderUsers, mockRenderTopics, mockRenderComments, mockRenderActivities, mockRenderNotifications, mockRenderImages, mockRenderTags, mockRenderForward, mockRenderMarkAllAsRead;
let mock$;
let renderPage;
let specificRemoveMock; // Declare here for wider scope

function beforeEach() {
  mockState = {
    path: '/initial/path',
    path_index: 0,
    path_history: ['/initial/path'],
  };

  mockHistory = {
    replaceState: createMockFunction('history.replaceState'),
  };

  mockRenderUsers = createMockFunction('renderUsers');
  mockRenderTopics = createMockFunction('renderTopics');
  mockRenderComments = createMockFunction('renderComments');
  mockRenderActivities = createMockFunction('renderActivities');
  mockRenderNotifications = createMockFunction('renderNotifications');
  mockRenderImages = createMockFunction('renderImages');
  mockRenderTags = createMockFunction('renderTags');
  mockRenderForward = createMockFunction('renderForward');
  mockRenderMarkAllAsRead = createMockFunction('renderMarkAllAsRead');

  specificRemoveMock = createMockFunction('$.remove'); // Assign to the wider scoped variable
  const dispatchEventMock = createMockFunction('$.dispatchEvent');
  mock$ = createMockFunction('$');
  mock$.customBehavior = selector => {
    if (selector === "main-content-wrapper[active] topics-loading") {
      return { remove: specificRemoveMock }; // Use it here
    }
    if (selector === "body") {
      return { dispatchEvent: dispatchEventMock };
    }
    return { remove: createMockFunction('$.remove.generic'), dispatchEvent: createMockFunction('$.dispatchEvent.generic')};
  };


  global.window = mockWindow;
  global.document = mockDocument;
  global.state = mockState;
  global.history = mockHistory;
  global.$ = mock$;
  global.renderUsers = mockRenderUsers;
  global.renderTopics = mockRenderTopics;
  global.renderComments = mockRenderComments;
  global.renderActivities = mockRenderActivities;
  global.renderNotifications = mockRenderNotifications;
  global.renderImages = mockRenderImages;
  global.renderTags = mockRenderTags;
  global.renderForward = mockRenderForward;
  global.renderMarkAllAsRead = mockRenderMarkAllAsRead;

  // Reset mocks that might have been set by loadClientScript in a previous test run
  if (global.CustomEvent) {
    delete global.CustomEvent; // Or reset its mock if it's a Jest mock
  }
  // Mock CustomEvent for these tests
  const actualCustomEventMock = function(type, detail) {
    actualCustomEventMock.called = true;
    actualCustomEventMock.calls.push([type, detail]);
    this.type = type;
    this.detail = detail;
    this.constructed = true;
    // If `new` is used, `this` is the new object.
    // If called as a regular function, `this` might be global or undefined in strict mode.
    // To be safe and ensure it works whether called with `new` or not (though `new` is expected):
    return { type: this.type, detail: this.detail, constructed: this.constructed };
  };
  actualCustomEventMock.called = false;
  actualCustomEventMock.calls = [];
  actualCustomEventMock.reset = () => {
    actualCustomEventMock.called = false;
    actualCustomEventMock.calls = [];
  };
  global.CustomEvent = actualCustomEventMock;


  renderPage = loadClientScript(path.resolve(__dirname, '../../../client/renderPage.js'), {}); // Pass empty object for globalMocks
}

// --- Test Cases ---

function testStatePathUpdateWhenDifferent() {
  beforeEach();
  const data = { path: '/new/path' };
  renderPage(data);
  assertEquals(data.path, mockState.path, 'state.path should be updated to data.path');
}

function testStatePathNotUpdatedWhenSame() {
  beforeEach();
  const data = { path: mockState.path }; // Same as initial
  renderPage(data);
  assertEquals('/initial/path', mockState.path, 'state.path should not be updated');
}

function testHistoryReplaceStateCalledWhenPathDifferent() {
  beforeEach();
  const data = { path: '/new/path' };
  renderPage(data);
  assertEquals(true, mockHistory.replaceState.called, 'history.replaceState should be called');
  assertEquals(1, mockHistory.replaceState.calls.length, 'history.replaceState should be called once');
  assertEquals(mockState.path_index, mockHistory.replaceState.calls[0][0].path_index, 'history.replaceState first arg (path_index value) should be state.path_index');
  assertEquals('', mockHistory.replaceState.calls[0][1], 'history.replaceState second arg should be an empty string (title)');
  assertEquals(data.path, mockHistory.replaceState.calls[0][2], 'history.replaceState third arg should be data.path');
}

function testHistoryReplaceStateNotCalledWhenPathSame() {
  beforeEach();
  const data = { path: mockState.path };
  renderPage(data);
  assertEquals(false, mockHistory.replaceState.called, 'history.replaceState should not be called');
}

function testStatePathHistoryPushWhenNoThirdSegment() {
  beforeEach();
  const data = { path: '/new/path' }; // No third segment
  renderPage(data);
  assertEquals(2, mockState.path_history.length, 'state.path_history should have a new path pushed');
  assertEquals(data.path, mockState.path_history[1], 'The new path should be data.path');
}

function testStatePathHistoryNotModifiedWhenThirdSegmentExists() {
  beforeEach();
  const initialHistoryLength = mockState.path_history.length;
  const data = { path: '/new/path/with/segment' }; // Has a third segment "with"
  renderPage(data);
  assertEquals(initialHistoryLength, mockState.path_history.length, 'state.path_history should not be modified');
}

function testLoadingIndicatorRemoval() {
  beforeEach();
  const data = { path: '/some/path' };
  renderPage(data);
  assertEquals(true, mock$.called, 'mock $ should have been called');
  assertEquals("main-content-wrapper[active] topics-loading", mock$.calls[0][0], 'mock $ should be called with loading selector');
  // Access the nested mock for remove
  assertEquals(true, specificRemoveMock.called, '.remove() should have been called on the loading indicator');
}


function testRenderUsersCalled() {
  beforeEach();
  const data = { path: '/p', users: [{ id: 1, name: 'User 1' }] };
  renderPage(data);
  assertEquals(true, mockRenderUsers.called, 'renderUsers should be called');
  assertEquals(1, mockRenderUsers.calls.length, 'renderUsers should be called once');
  assertEquals(data.users, mockRenderUsers.calls[0][0], 'renderUsers should be called with data.users');
}

function testRenderTopicsCalled() {
  beforeEach();
  const data = { path: '/p', topics: [{ id: 1, title: 'Topic 1' }], tag: 'test-tag', user: 'test-user' };
  renderPage(data);
  assertEquals(true, mockRenderTopics.called, 'renderTopics should be called');
  assertEquals(1, mockRenderTopics.calls.length, 'renderTopics should be called once');
  assertEquals(data.topics, mockRenderTopics.calls[0][0], 'renderTopics first arg should be data.topics');
  assertEquals(data.tag, mockRenderTopics.calls[0][1], 'renderTopics second arg should be data.tag');
  assertEquals(data.user, mockRenderTopics.calls[0][2], 'renderTopics third arg should be data.user');
}

function testRenderCommentsCalled() {
  beforeEach();
  const data = { path: '/p', comments: [{ id: 1, text: 'Comment 1' }] };
  renderPage(data);
  assertEquals(true, mockRenderComments.called, 'renderComments should be called');
  assertEquals(1, mockRenderComments.calls.length, 'renderComments should be called once');
  assertEquals(data.comments, mockRenderComments.calls[0][0], 'renderComments should be called with data.comments');
}

function testRenderActivitiesCalled() {
  beforeEach();
  const data = { path: '/p', activities: [{ id: 1, type: 'CREATE' }] };
  renderPage(data);
  assertEquals(true, mockRenderActivities.called, 'renderActivities should be called');
  assertEquals(1, mockRenderActivities.calls.length, 'renderActivities should be called once');
  assertEquals(data.activities, mockRenderActivities.calls[0][0], 'renderActivities should be called with data.activities');
}

function testRenderNotificationsCalled() {
  beforeEach();
  const data = { path: '/p', notifications: [{ id: 1, message: 'Notification 1' }] };
  renderPage(data);
  assertEquals(true, mockRenderNotifications.called, 'renderNotifications should be called');
  assertEquals(1, mockRenderNotifications.calls.length, 'renderNotifications should be called once');
  assertEquals(data.notifications, mockRenderNotifications.calls[0][0], 'renderNotifications should be called with data.notifications');
}

function testRenderImagesCalled() {
  beforeEach();
  const data = { path: '/p' }; // No specific data needed for renderImages
  renderPage(data);
  assertEquals(true, mockRenderImages.called, 'renderImages should be called');
  assertEquals(1, mockRenderImages.calls.length, 'renderImages should be called once');
  assertEquals(0, mockRenderImages.calls[0].length, 'renderImages should be called with no arguments');
}

function testRenderTagsCalled() {
  beforeEach();
  const data = { path: '/p', tags: [{ name: 'tag1' }, { name: 'tag2' }] };
  renderPage(data);
  assertEquals(true, mockRenderTags.called, 'renderTags should be called');
  assertEquals(1, mockRenderTags.calls.length, 'renderTags should be called once');
  assertEquals(data.tags, mockRenderTags.calls[0][0], 'renderTags should be called with data.tags');
}

function testRenderForwardCalled() {
  beforeEach();
  const data = { path: '/p', parent_topic: { id: 2, title: 'Parent Topic' } };
  renderPage(data);
  assertEquals(true, mockRenderForward.called, 'renderForward should be called');
  assertEquals(1, mockRenderForward.calls.length, 'renderForward should be called once');
  assertEquals(data.parent_topic, mockRenderForward.calls[0][0], 'renderForward should be called with data.parent_topic');
}

function testRenderMarkAllAsReadCalled() {
  beforeEach();
  const data = { path: '/p' }; // No specific data needed
  renderPage(data);
  assertEquals(true, mockRenderMarkAllAsRead.called, 'renderMarkAllAsRead should be called');
  assertEquals(1, mockRenderMarkAllAsRead.calls.length, 'renderMarkAllAsRead should be called once');
  assertEquals(0, mockRenderMarkAllAsRead.calls[0].length, 'renderMarkAllAsRead should be called with no arguments');
}

function testEventDispatch() {
  beforeEach();
  const data = { path: '/some/path' };
  renderPage(data);

  // Check that $ was called for "body"
  // This relies on the mock$ implementation detail that the second call is for "body"
  // A more robust way would be to check all calls to mock$
  let bodyCallFound = false;
  for (const call of mock$.calls) {
    if (call[0] === "body") {
      bodyCallFound = true;
      break;
    }
  }
  assertEquals(true, bodyCallFound, 'mock $ should be called with "body"');

  const dispatchEventMock = mock$("body").dispatchEvent; // Get the specific mock for dispatchEvent on body
  assertEquals(true, dispatchEventMock.called, '.dispatchEvent() should have been called on $("body")');
  assertEquals(1, dispatchEventMock.calls.length, '.dispatchEvent() should be called once');

  const eventArg = dispatchEventMock.calls[0][0];
  assertEquals('object', typeof eventArg, 'Argument to dispatchEvent should be an object (CustomEvent mock)');
  assertEquals("page-rendered", eventArg.type, 'Event type should be "page-rendered"');
  assertEquals(true, eventArg.constructed, 'CustomEvent mock should have been constructed');
}


// Corrected call:
runTests(path.basename(__filename), [
  testStatePathUpdateWhenDifferent,
  testStatePathNotUpdatedWhenSame,
  testHistoryReplaceStateCalledWhenPathDifferent,
  testHistoryReplaceStateNotCalledWhenPathSame,
  testStatePathHistoryPushWhenNoThirdSegment,
  testStatePathHistoryNotModifiedWhenThirdSegmentExists,
  testLoadingIndicatorRemoval,
  testRenderUsersCalled,
  testRenderTopicsCalled,
  testRenderCommentsCalled,
  testRenderActivitiesCalled,
  testRenderNotificationsCalled,
  testRenderImagesCalled,
  testRenderTagsCalled,
  testRenderForwardCalled,
  testRenderMarkAllAsReadCalled,
  testEventDispatch,
]);
