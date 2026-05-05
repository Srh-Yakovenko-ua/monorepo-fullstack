type ConfirmEmailInput = {
  confirmLink: string;
  login: string;
};

type PasswordRecoveryEmailInput = {
  recoveryLink: string;
};

export function renderConfirmEmail({ confirmLink, login }: ConfirmEmailInput): {
  html: string;
  subject: string;
  text: string;
} {
  return {
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome, ${login}</h2>
        <p>Please confirm your email by clicking the link below:</p>
        <p><a href="${confirmLink}" style="display:inline-block;padding:10px 18px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;">Confirm email</a></p>
        <p>If the button doesn't work, copy this URL: ${confirmLink}</p>
        <p>The link will expire in 1 hour.</p>
      </div>
    `,
    subject: "Confirm your email",
    text: `Welcome, ${login}\n\nConfirm your email by opening this link: ${confirmLink}\n\nThe link will expire in 1 hour.`,
  };
}

export function renderPasswordRecoveryEmail({ recoveryLink }: PasswordRecoveryEmailInput): {
  html: string;
  subject: string;
  text: string;
} {
  return {
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Password recovery</h2>
        <p>To reset your password, click the link below:</p>
        <p><a href="${recoveryLink}" style="display:inline-block;padding:10px 18px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;">Reset password</a></p>
        <p>If the button doesn't work, copy this URL: ${recoveryLink}</p>
        <p>The link will expire in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
      </div>
    `,
    subject: "Password recovery",
    text: `Password recovery\n\nReset your password by opening this link: ${recoveryLink}\n\nThe link will expire in 1 hour. If you didn't request a password reset, you can ignore this email.`,
  };
}
