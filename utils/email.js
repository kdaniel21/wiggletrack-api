const nodemailer = require('nodemailer');
const nodemailerSendgrid = require('nodemailer-sendgrid');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url, templateData) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `${process.env.EMAIL_NAME} <${process.env.EMAIL_ADDRESS}>`;
    this.templateData = templateData;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production')
      return nodemailer.createTransport(
        nodemailerSendgrid({ apiKey: process.env.SENDGRID_API_KEY })
      );

    return nodemailer.createTransport({
      host: process.env.EMAIL_DEV_HOST,
      port: process.env.EMAIL_DEV_PORT,
      auth: {
        user: process.env.EMAIL_DEV_USERNAME,
        pass: process.env.EMAIL_DEV_PASSWORD,
      },
    });
  }

  sendEmail(template, subject) {
    const html = pug.renderFile(
      `${__dirname}/email-templates/${template}.pug`,
      { ...this.templateData, firstName: this.firstName, url: this.url }
    );

    const text = htmlToText.fromString(html);

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      text,
      html,
    };

    return this.newTransport().sendMail(mailOptions);
  }

  sendRegistrationConfirmEmail() {
    return this.sendEmail(
      'registration-confirm',
      'Welcome to Wiggle Price Comparison!'
    );
  }

  sendPasswordResetEmail() {
    return this.sendEmail('password-reset', 'Reset Your Password');
  }

  sendPriceNotificationEmail() {
    return this.sendEmail(
      'price-notification',
      'One product has reached the price you are looking for'
    );
  }
};
