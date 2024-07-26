const crypto = require("node:crypto");
const {
  DeleteObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const object_client = new S3Client({
  region: "us-east-1",
});

module.exports = async (req, res) => {
  if (!res.writableEnded && req.session.user_id && req.body.remove_account) {

    // Delete images
    const images = await req.client.query(
      `
      SELECT image_uuid
      FROM comment_images
      WHERE comment_id IN (
        SELECT comment_id
        FROM comments
        WHERE user_id = $1
      )
      UNION
      SELECT image_uuid
      FROM topic_images
      WHERE topic_id IN (
        SELECT topic_id
        FROM topics
        WHERE user_id = $1
      )
      `,
      [ req.session.user_id ]
    );
    for (const existing_image of images.rows) {
      try {
        await object_client.send(
          new DeleteObjectCommand({
            Bucket: "truce.net",
            Key: `${existing_image.image_uuid}.png`,
          }),
        );
      } catch (err) {
        console.error(err);
      }
    }
    await req.client.query(
      `
      DELETE FROM comment_images
      WHERE comment_id IN (
        SELECT comment_id
        FROM comments
        WHERE user_id = $1
      )
      `,
      [ req.session.user_id ]
    );
    await req.client.query(
      `
      DELETE FROM topic_images
      WHERE topic_id IN (
        SELECT topic_id
        FROM topics
        WHERE user_id = $1
      )
      `,
      [ req.session.user_id ]
    );
    
    // Delete comment ancestors
    await req.client.query(
      `
      DELETE FROM comment_ancestors
      WHERE comment_id IN (
        SELECT comment_id
        FROM comments
        WHERE user_id = $1
      )
      `,
      [ req.session.user_id ]
    );

    // Sessions
    await req.client.query(
      `
      DELETE FROM sessions WHERE session_id IN (
        SELECT session_id
        FROM user_sessions
        WHERE user_id = $1
      )
      `,
      [ req.session.user_id ]
    );
    await req.client.query(
      `
      DELETE FROM user_sessions WHERE user_id = $1
      `,
      [ req.session.user_id ]
    );

    // Comments / Topics / User
    await req.client.query(
      `
      DELETE FROM comments WHERE user_id = $1
      `,
      [ req.session.user_id ]
    );
    await req.client.query(
      `
      DELETE FROM topics WHERE user_id = $1
      `,
      [ req.session.user_id ]
    );
    await req.client.query(
      `
      DELETE FROM users WHERE user_id = $1
      `,
      [ req.session.user_id ]
    );


    // Also sign out
    req.session.session_uuid = crypto.randomUUID();
    const insert_session = await req.client.query(
      `
      INSERT INTO sessions (session_uuid)
      VALUES ($1) returning session_id;
      `,
      [req.session.session_uuid],
    );
    req.session.session_id = insert_session.rows[0].session_id;

    // Set the cookie like a sane person
    res.setHeader(
      "Set-Cookie",
      `session_uuid=${req.session.session_uuid}; HttpOnly; Secure; Path=/session; Max-Age=315360000`,
    );

    // Respond success
    res.end(
      JSON.stringify({
        success: true,
        session_uuid: req.session.session_uuid,
      }),
    );
  }
};
