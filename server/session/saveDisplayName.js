const ai = require("../ai");

module.exports = async (req, res) => {
  if (!req.writeableEnded && req.session.user_id && req.body.display_name) {
    const ai_response_text = await ai.ask(
      [
        {
          role: "user",
          content: req.body.display_name,
        },
      ],
      "display_name",
    );
    if (ai_response_text === "OK") {
      await require("./updateDisplayName")(req, res);
      res.end(
        JSON.stringify({
          success: true,
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
