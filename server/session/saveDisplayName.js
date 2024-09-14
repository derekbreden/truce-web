const ai = require("../ai");
const prompts = require("../prompts");

module.exports = async (req, res) => {
  if (!res.writableEnded && req.session.user_id && req.body.display_name) {
    // Validate manually
    req.body.display_name = req.body.display_name
      .replace(/[^a-zA-Z]/g, " ")
      .replace(/ {1,}/g, " ")
      .trim();

    if (!req.body.display_name) {
      res.end(
        JSON.stringify({
          error: "Empty",
        }),
      );
      return;
    }

    // Validate with AI
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
      if (!req.session.user_slug) {
        res.end(
          JSON.stringify({
            error: "Display name was not changed",
          }),
        );
        return;
      }
      res.end(
        JSON.stringify({
          success: true,
          user_id: req.session.user_id,
          display_name: req.session.display_name,
          display_name_index: req.session.display_name_index,
          user_slug: req.session.user_slug,
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
