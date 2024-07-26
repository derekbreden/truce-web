const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const object_client = new S3Client({
  region: "us-east-1",
});

module.exports = async (req, res) => {
  const image_uuid = req.path.substr(5);
  try {
    const response = await object_client.send(
      new GetObjectCommand({
        Bucket: "truce",
        Key: `${image_uuid}.png`,
      }),
    );
    const base64_string = await response.Body.transformToString();

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    const base64_data = base64_string.replace(/^data:image\/png;base64,/, "");
    res.end(base64_data, "base64");

  } catch (err) {
    console.error(err);
    res.end("Error reading file\n");
  }
};
