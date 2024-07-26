const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const object_client = new S3Client({
  region: "us-east-1",
});

module.exports = async (req, res) => {
  const mp3_uuid = req.path.substr(3);

  try {
    const response = await object_client.send(
      new GetObjectCommand({
        Bucket: "truce.net",
        Key: `${mp3_uuid}.mp3`,
      }),
    );
    const object_value = await response.Body.transformToByteArray();
    res.statusCode = 200;
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.end(object_value, "binary");
  } catch (error) {
    console.error(error);
    res.end("Error reading file\n");
  }
};
