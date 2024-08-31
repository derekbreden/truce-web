module.exports = async (req, res) => {
  if (!res.writableEnded && req.body.path === "/tags") {
    req.results.path = req.body.path;
    const tags = await req.client.query(
      `
      SELECT
        ts.tag_name,
        ts.subtitle,
        COUNT(tt.tag_id) AS topics
      FROM
        tags ts
        LEFT JOIN topic_tags tt ON ts.tag_id = tt.tag_id
      GROUP BY
        ts.tag_id,
        ts.tag_name,
        ts.subtitle
      ORDER BY ts.tag_id ASC
      `,
    );
    req.results.tags = tags.rows;
  }

  if (!res.writableEnded && req.body.path.substr(0, 5) === "/tag/") {
    const tag = await req.client.query(
      `
      SELECT
        ts.tag_name,
        ts.subtitle
      FROM
        tags ts
      WHERE
        ts.tag_name = $1
      `,
      [req.body.path.substr(5)],
    );
    req.results.tag = tag.rows[0] || {};
  }
};
