const ASSESSMENT_URL =
  "https://recaptchaenterprise.googleapis.com/v1/projects/brightboard-app/assessments";
const SITE_KEY = "6LfKupcsAAAAAFjtAAYI191p9gV13VpHkenZ-KJe";

export interface RecaptchaAssessment {
  valid: boolean;
  score?: number;
  reason?: string;
}

export async function verifyRecaptchaToken(
  token: string,
  expectedAction: string
): Promise<RecaptchaAssessment> {
  const apiKey = process.env.RECAPTCHA_API_KEY;

  if (!apiKey) {
    console.warn("RECAPTCHA_API_KEY not set — skipping server-side verification");
    return { valid: true };
  }

  if (!token) {
    return { valid: false, reason: "Missing reCAPTCHA token" };
  }

  const requestBody = {
    event: {
      token,
      expectedAction,
      siteKey: SITE_KEY,
    },
  };

  try {
    const response = await fetch(`${ASSESSMENT_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("reCAPTCHA assessment error:", err);
      // Fail-open: if Google's API rejects our key, don't block legitimate users
      return { valid: true, reason: "reCAPTCHA assessment unavailable — allowed" };
    }

    const assessment = await response.json();
    const { tokenProperties, riskAnalysis } = assessment;

    if (!tokenProperties?.valid) {
      return {
        valid: false,
        reason: `Invalid token: ${tokenProperties?.invalidReason ?? "unknown"}`,
      };
    }

    if (tokenProperties.action !== expectedAction) {
      return {
        valid: false,
        reason: `Action mismatch: expected ${expectedAction}, got ${tokenProperties.action}`,
      };
    }

    const score: number = riskAnalysis?.score ?? 0;

    if (score < 0.5) {
      return { valid: false, score, reason: "Low reCAPTCHA score — possible bot" };
    }

    return { valid: true, score };
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    // Fail-open: network/unexpected errors should not block legitimate users
    return { valid: true, reason: "reCAPTCHA check skipped due to error" };
  }
}
