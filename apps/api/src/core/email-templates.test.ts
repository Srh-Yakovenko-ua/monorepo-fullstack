import { describe, expect, it } from "vitest";

import { renderConfirmEmail, renderPasswordRecoveryEmail } from "./email-templates.js";

describe("renderConfirmEmail", () => {
  it("returns html, subject and text fields", () => {
    const { html, subject, text } = renderConfirmEmail({
      confirmLink: "https://example.com/confirm?code=abc",
      login: "alice",
    });

    expect(typeof html).toBe("string");
    expect(typeof subject).toBe("string");
    expect(typeof text).toBe("string");
  });

  it("sets the subject to 'Confirm your email'", () => {
    const { subject } = renderConfirmEmail({
      confirmLink: "https://example.com/confirm?code=abc",
      login: "alice",
    });

    expect(subject).toBe("Confirm your email");
  });

  it("interpolates login and confirmLink into the html body", () => {
    const { html } = renderConfirmEmail({
      confirmLink: "https://example.com/confirm?code=abc",
      login: "alice",
    });

    expect(html).toContain("alice");
    expect(html).toContain("https://example.com/confirm?code=abc");
  });

  it("interpolates login and confirmLink into the text body", () => {
    const { text } = renderConfirmEmail({
      confirmLink: "https://example.com/confirm?code=abc",
      login: "alice",
    });

    expect(text).toContain("alice");
    expect(text).toContain("https://example.com/confirm?code=abc");
  });

  it("accepts URLs with query strings and ampersands without crashing", () => {
    const confirmLink = "https://example.com/confirm?code=abc&user=alice&ref=email";
    const { html, text } = renderConfirmEmail({ confirmLink, login: "alice" });

    expect(html).toContain(confirmLink);
    expect(text).toContain(confirmLink);
  });
});

describe("renderPasswordRecoveryEmail", () => {
  it("returns html, subject and text fields", () => {
    const { html, subject, text } = renderPasswordRecoveryEmail({
      recoveryLink: "https://example.com/recover?code=xyz",
    });

    expect(typeof html).toBe("string");
    expect(typeof subject).toBe("string");
    expect(typeof text).toBe("string");
  });

  it("sets the subject to 'Password recovery'", () => {
    const { subject } = renderPasswordRecoveryEmail({
      recoveryLink: "https://example.com/recover?code=xyz",
    });

    expect(subject).toBe("Password recovery");
  });

  it("interpolates recoveryLink into the html body", () => {
    const recoveryLink = "https://example.com/recover?code=xyz";
    const { html } = renderPasswordRecoveryEmail({ recoveryLink });

    expect(html).toContain(recoveryLink);
  });

  it("interpolates recoveryLink into the text body", () => {
    const recoveryLink = "https://example.com/recover?code=xyz";
    const { text } = renderPasswordRecoveryEmail({ recoveryLink });

    expect(text).toContain(recoveryLink);
  });

  it("accepts URLs with query strings and ampersands without crashing", () => {
    const recoveryLink = "https://example.com/recover?code=xyz&tenant=acme&ref=email";
    const { html, text } = renderPasswordRecoveryEmail({ recoveryLink });

    expect(html).toContain(recoveryLink);
    expect(text).toContain(recoveryLink);
  });
});
