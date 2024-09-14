const ai = require("../ai");
const prompts = require("../prompts");
const crypto = require("node:crypto");
const {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const object_client = new S3Client({
  region: "us-east-1",
});

module.exports = async (req, res) => {
  if (!res.writableEnded && req.session.user_id && req.body.profile_picture) {
    const ai_response = await ai.ask(
      [
        {
          role: "user",
          name: (req.session.display_name || "Anonymous").replace(
            /[^a-z0-9_\-]/gi,
            "",
          ),
          content: [
            {
              image_url: {
                url: req.body.profile_picture,
              },
              type: "image_url",
            },
          ],
        },
      ],
      "profile_picture",
      prompts.profile_picture_response_format,
    );
    let ai_response_parsed = { keyword: "OK" };
    try {
      ai_response_parsed = JSON.parse(ai_response);
    } catch (e) {
      console.error("Failed to parse AI JSON", ai_response, e);
    }
    const first_word = ai_response_parsed.keyword;
    console.log("Profile picture AI response", ai_response_parsed.keyword);
    if (["Spam", "Violent", "Hateful", "Sexual"].indexOf(first_word) === -1) {
      const profile_picture_uuid = crypto.randomUUID();
      try {
        // Upload the new picture
        await object_client.send(
          new PutObjectCommand({
            Bucket: "truce.net",
            Key: `${profile_picture_uuid}.png`,
            Body: req.body.profile_picture,
          }),
        );

        // Find any existing picture
        const existing_image = await req.client.query(
          `
          SELECT profile_picture_uuid
          FROM users
          WHERE user_id = $1
          `,
          [req.session.user_id],
        );

        // Delete the existing picture
        if (existing_image.rows[0].profile_picture_uuid) {
          await object_client.send(
            new DeleteObjectCommand({
              Bucket: "truce.net",
              Key: `${existing_image.rows[0].profile_picture_uuid}.png`,
            }),
          );
        }

        // Save the new picture uuid to the database
        await req.client.query(
          `
          UPDATE users
          SET
            profile_picture_uuid = $1
          WHERE
            user_id = $2
          `,
          [profile_picture_uuid, req.session.user_id],
        );
        res.end(
          JSON.stringify({
            success: true,
            profile_picture_uuid,
          }),
        );
      } catch (error) {
        console.error(error);
        res.end(
          JSON.stringify({
            error: "Server error saving picture",
          }),
        );
      }
    } else {
      res.end(
        JSON.stringify({
          error: ai_response_parsed.keyword,
        }),
      );
    }
  }
};
