const pool = require("./pool");

module.exports = async (req, res) => {
  try {
    // Common for all responses from /session
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");

    // Init req state
    req.client = await pool.pool.connect();
    req.body = JSON.parse(req.body);
    req.session = {
      session_uuid: "",
      session_id: "",
      admin: false,
      email: "",
      user_id: "",
      display_name: "",
    };
    req.results = {
      topics: [],
      comments: [],
      activities: [],
      notifications: [],
      path: req.body.path,
    };

    // Call all middleware in a specific order
    await require("./session/validateSessionUuid")(req, res);
    await require("./session/getNotifications")(req, res);
    await require("./session/createUserIfNotExists")(req, res);
    await require("./session/handleRemoveAccount")(req, res);
    await require("./session/signUpOrSignIn")(req, res);
    await require("./session/generateResetToken")(req, res);
    await require("./session/useResetToken")(req, res);
    await require("./session/saveSubscription")(req, res);
    await require("./session/saveTopic")(req, res);
    await require("./session/saveComment")(req, res);
    await require("./session/saveDisplayName")(req, res);
    await require("./session/getAdminImage")(req, res);
    await require("./session/createSessionIfNotExists")(req, res);
    await require("./session/getSingleTopic")(req, res);
    await require("./session/getSingleThread")(req, res);
    await require("./session/getRecentActivity")(req, res);
    await require("./session/getFavorites")(req, res);
    await require("./session/getPageTopics")(req, res);
    await require("./session/getUpdatedCounts")(req, res);
    await require("./session/saveFavorite")(req, res);
    await require("./session/promptToUsePasswordReset")(req, res);

    // Default response if nothing else responded sooner
    if (!res.writableEnded) {
      req.results.user_id = req.session.user_id;
      req.results.email = req.session.email;
      req.results.display_name = req.session.display_name;
      req.results.display_name_index = req.session.display_name_index;
      res.end(JSON.stringify(req.results));
    }
  } catch (err) {
    console.error("Session error", err);
    res.end(JSON.stringify({ error: "Database error" }));
  } finally {
    req.client.release();
  }
}