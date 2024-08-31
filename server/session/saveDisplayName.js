const ai = require("../ai");
const prompts = require("../prompts");

module.exports = async (req, res) => {
  if (!res.writableEnded && req.session.user_id && req.body.display_name) {
    const ai_response = await ai.ask(
      [
        {
          role: "user",
          content: req.body.display_name,
        },
      ],
      "display_name",
      prompts.display_name_response_format,
    );
    let ai_response_parsed = { keyword: "OK" };
    try {
      ai_response_parsed = JSON.parse(ai_response);
    } catch (e) {
      console.error("Failed to parse AI JSON", ai_response, e);
    }
    if (ai_response_parsed.keyword === "OK") {
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
          error: ai_response_parsed.keyword,
        }),
      );
    }
  }
};
