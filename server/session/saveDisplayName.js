const ai = require("../ai");

module.exports = async (req, res) => {
  if (!res.writableEnded && req.session.user_id && req.body.display_name) {
    const ai_response_text = await ai.ask(
      [
        {
          role: "user",
          content: req.body.display_name,
        },
      ],
      "display_name",
    );
    if (ai_response_text.replace(/[^a-z\-]/ig, "") === "OK") {
      await require("./updateDisplayName")(req, res);
      res.end(
        JSON.stringify({
          success: true,
          user_id: req.session.user_id,
          display_name: req.session.display_name,
        }),
      );
    } else {
      res.end(
        JSON.stringify({
          error: ai_response_text,
        }),
      );
    }
  }
};
