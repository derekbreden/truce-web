const nodemailer = require("nodemailer");

module.exports = {
  init() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 465,
      secure: true,
      auth: {
        user: process.env["SMTP_USER"],
        pass: process.env["SMTP_PASS"],
      },
    });
  },
  send(to, subject, text, html) {
    this.transporter.sendMail(
      {
        from: '"Derek Bredensteiner" <derek@truce.net>',
        to,
        subject,
        text,
        html,
      },
      (error, info) => {
        if (error) {
          console.error(error);
        } else {
          console.log("Email sent", to, subject, info.response);
        }
      },
    );
  },
};
