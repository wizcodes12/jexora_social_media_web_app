// templates/emailTemplates.js
const getBaseTemplate = (bodyContent, title) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: #000000;
          padding: 20px;
          position: relative;
          border-radius: 10px 10px 0 0;
        }
        .brand {
          position: absolute;
          top: 20px;
          left: 20px;
          color: #ffffff;
          font-weight: bold;
          font-size: 18px;
        }
        .date {
          position: absolute;
          top: 20px;
          right: 20px;
          color: #ffffff;
          font-size: 14px;
        }
        .content {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .heading {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #333333;
        }
        .subheading {
          font-size: 14px;
          color: #666666;
          margin-bottom: 20px;
        }
        .instruction {
          margin-bottom: 30px;
          font-size: 14px;
          color: #333333;
          line-height: 1.6;
        }
        .code-container {
          text-align: center;
          margin: 20px 0;
        }
        .code {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }
        .code-digit {
          color: #ff3366;
          font-size: 24px;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #999999;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">JEXORA</div>
          <div class="date">${new Date().toLocaleDateString()}</div>
        </div>
        
        <div class="content">
          ${bodyContent}
        </div>
      </div>
    </body>
    </html>
  `;
};

// OTP verification email template
exports.otpEmailTemplate = (otp) => {
  // Split the OTP into individual digits
  const digits = otp.toString().split('');
  
  const content = `
    <div class="heading">Your OTP</div>
    <div class="subheading">One Time Password</div>
    
    <div class="instruction">
      Thanks for choosing Jexora! We have received a sign-up attempt from you. 
      To complete verification, please enter the following OTP code in the browser window 
      where you started the process.
    </div>
    
    <div class="code-container">
      <div class="code">
        ${digits.map(digit => `<div class="code-digit">${digit}</div>`).join('')}
      </div>
    </div>
    
    <div class="footer">
      If you did not attempt to sign up but received this email, please disregard it.
      This code will remain active for 10 minutes.
    </div>
  `;
  
  return getBaseTemplate(content, 'Your Jexora Verification Code');
};

// Password reset email template
exports.passwordResetTemplate = (otp) => {
  // Split the OTP into individual digits
  const digits = otp.toString().split('');
  
  const content = `
    <div class="heading">Reset Password</div>
    <div class="subheading">One Time Password</div>
    
    <div class="instruction">
      We received a request to reset your password. Please enter the following
      verification code to continue with the password reset process.
    </div>
    
    <div class="code-container">
      <div class="code">
        ${digits.map(digit => `<div class="code-digit">${digit}</div>`).join('')}
      </div>
    </div>
    
    <div class="footer">
      If you didn't request this password reset, you can safely ignore this email.
      This code will expire in ${process.env.OTP_EXPIRE || 10} minutes.
    </div>
  `;
  
  return getBaseTemplate(content, 'Reset Your Jexora Password');
};

// Welcome email template
exports.welcomeEmailTemplate = (username) => {
  const content = `
    <div class="heading">Welcome to Jexora!</div>
    <div class="subheading">Hi ${username}</div>
    
    <div class="instruction">
      Your account has been successfully created. We're excited to have you join our community!
      <br><br>
      You can now access all Jexora features and start connecting with friends, sharing content,
      and exploring our platform.
    </div>
    
    <div style="text-align: center; margin-top: 20px;">
      <a href="#" style="background-color: #000000; color: #ffffff; padding: 10px 25px; border-radius: 5px; text-decoration: none; font-weight: bold;">Go to Jexora</a>
    </div>
    
    <div class="footer">
      © ${new Date().getFullYear()} Jexora. All rights reserved.
    </div>
  `;
  
  return getBaseTemplate(content, 'Welcome to Jexora');
};

// Warning notification email template
exports.warningEmailTemplate = (username, warningMessage) => {
  const content = `
    <div class="heading">Account Notice</div>
    <div class="subheading">Hi ${username}</div>
    
    <div class="instruction">
      We need to bring something to your attention regarding your account activity:
    </div>
    
    <div style="background-color: #fff9e6; padding: 15px; border-left: 4px solid #ff3366; margin: 20px 0; border-radius: 4px; color: #333333;">
      ${warningMessage}
    </div>
    
    <div class="instruction">
      Please review our community guidelines to ensure your account remains in good standing.
      If you believe this notice was sent in error, please contact our support team.
    </div>
    
    <div class="footer">
      © ${new Date().getFullYear()} Jexora. All rights reserved.
    </div>
  `;
  
  return getBaseTemplate(content, 'Important Notice - Jexora');
};