import test from "node:test";
import assert from "node:assert/strict";
import { deliverOwnerAlert, paymentOwnerAlert, referralApplicationOwnerAlert } from "./owner-alerts";

test("payment alert includes customer, original currency, plan and order details", () => {
  const alert = paymentOwnerAlert({
    orderId: "test-order", amount: 12.5, currency: "USD", tier: "monthly",
    customerName: "Test Teacher", customerEmail: "teacher@example.com",
    paymentMethod: "Card", confirmationCode: "CONFIRM",
  });
  for (const value of ["USD 12.50", "Test Teacher", "teacher@example.com", "monthly", "test-order", "Card", "CONFIRM"]) {
    assert.ok(alert.text.includes(value));
    assert.ok(alert.html.includes(value));
  }
  assert.match(alert.subject, /Successful payment/);
});

test("application alert escapes applicant-controlled HTML and includes review link", () => {
  const alert = referralApplicationOwnerAlert({
    name: '<img src=x onerror="alert(1)">', email: "applicant@example.com",
    reason: "Teachers & schools", website: "https://example.com",
    socialMedia: "@teacher", audience: "100 educators",
  });
  assert.ok(!alert.html.includes("<img"));
  assert.ok(alert.html.includes("&lt;img"));
  assert.ok(alert.html.includes("Teachers &amp; schools"));
  assert.ok(alert.text.includes("100 educators"));
  assert.ok(alert.text.includes("/owner-dashboard"));
  assert.match(alert.subject, /New referral program application/);
});

test("founder destination is server controlled and transport gets HTML plus plain text", async () => {
  const alert = referralApplicationOwnerAlert({ name: "Test", email: "test@example.com", reason: "Teaching" });
  let calls = 0;
  await deliverOwnerAlert(alert, async (to, subject, html, text) => {
    calls++;
    assert.equal(to, process.env.OWNER_NOTIFICATION_EMAIL || "kayondoabass@gmail.com");
    assert.equal(subject, alert.subject);
    assert.equal(html, alert.html);
    assert.equal(text, alert.text);
    return { success: true };
  });
  assert.equal(calls, 1);
});

test("delivery rejection is explicit rather than silently reporting success", async () => {
  const alert = referralApplicationOwnerAlert({ name: "Test", email: "test@example.com", reason: "Teaching" });
  await assert.rejects(deliverOwnerAlert(alert, async () => ({ success: false })), /not accepted/);
  await assert.rejects(deliverOwnerAlert(alert, async () => { throw new Error("Unavailable"); }), /Unavailable/);
});
