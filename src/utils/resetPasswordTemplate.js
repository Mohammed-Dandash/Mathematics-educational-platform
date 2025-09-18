export function resetPasswordTemplate(code) {
  return `
    <div style="
      font-family: Arial, sans-serif;
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 10px;
      max-width: 400px;
      margin: auto;
      border: 1px solid #ddd;
    ">
      <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
      <p style="color: #555; text-align: center;">
        Use the following code to reset your password:
      </p>
      <div style="
        font-size: 24px;
        font-weight: bold;
        color: #fff;
        background-color: #4CAF50;
        padding: 10px 20px;
        border-radius: 8px;
        text-align: center;
        letter-spacing: 3px;
        margin: 20px 0;
      ">
        ${code}
      </div>
      <p style="color: #777; font-size: 14px; text-align: center;">
        If you didn’t request a password reset, please ignore this email.
      </p>
    </div>
  `;
}
