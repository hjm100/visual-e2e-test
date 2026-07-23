import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RecorderNormalizer, sanitizeRecordedUrl } from "./normalizer.js";

describe("sanitizeRecordedUrl", () => {
  it("redacts sensitive query params", () => {
    const sanitized = sanitizeRecordedUrl("https://example.com/callback?access_token=abc&state=ok#done");
    assert.equal(sanitized, "https://example.com/callback?access_token=%7Bredacted%7D&state=ok#done");
  });

  it("keeps normal query params", () => {
    assert.equal(
      sanitizeRecordedUrl("https://example.com/address?postal_code=100000&countryCode=CN"),
      "https://example.com/address?postal_code=100000&countryCode=CN",
    );
  });
});

describe("RecorderNormalizer", () => {
  it("inserts wait between actions", () => {
    const normalizer = new RecorderNormalizer();
    normalizer.push({ type: "click", selector: "#a", timestamp: 0 });
    normalizer.push({ type: "click", selector: "#b", timestamp: 900 });
    const steps = normalizer.flush();
    assert.equal(steps.length, 3);
    assert.equal(steps[1].type, "wait");
    assert.equal(steps[1].value, 900);
  });

  it("does not emit link steps for navigation", () => {
    const normalizer = new RecorderNormalizer();
    normalizer.push({ type: "click", selector: "#go", timestamp: 0 });
    normalizer.push({ type: "navigation", url: "https://example.com/a", timestamp: 100 });
    normalizer.push({ type: "navigation", url: "https://example.com/b", timestamp: 500 });
    const steps = normalizer.flush();
    assert.equal(steps.filter((s) => s.type === "link").length, 0);
    assert.equal(steps.some((s) => s.type === "click"), true);
  });

  it("commits pending input on navigation without link step", () => {
    const normalizer = new RecorderNormalizer();
    normalizer.push({
      type: "input",
      selector: "#email",
      value: "a@b.com",
      password: false,
      timestamp: 0,
    });
    normalizer.push({ type: "navigation", url: "https://example.com/next", timestamp: 200 });
    const steps = normalizer.flush();
    assert.equal(steps.some((s) => s.type === "input" && s.value === "a@b.com"), true);
    assert.equal(steps.filter((s) => s.type === "link").length, 0);
  });

  it("redacts password inputs", () => {
    const normalizer = new RecorderNormalizer();
    normalizer.push({
      type: "input",
      selector: "input[type=password]",
      value: "secret",
      password: true,
      timestamp: 0,
    });
    normalizer.push({ type: "focusout", selector: "input[type=password]", timestamp: 50 });
    normalizer.push({ type: "click", selector: "#submit", timestamp: 400 });
    const steps = normalizer.flush();
    const input = steps.find((s) => s.type === "input");
    assert.equal(input?.value, "{password}");
  });

  it("keeps only click when navigation follows click", () => {
    const normalizer = new RecorderNormalizer();
    normalizer.push({ type: "click", selector: "#link", timestamp: 0 });
    normalizer.push({ type: "navigation", url: "https://example.com/next", timestamp: 200 });
    const steps = normalizer.flush();
    assert.equal(steps.some((s) => s.type === "link"), false);
    assert.equal(steps.some((s) => s.type === "click"), true);
  });

  it("records click then input when switching form fields", () => {
    const normalizer = new RecorderNormalizer();
    normalizer.push({ type: "click", selector: "#email", timestamp: 0 });
    normalizer.push({ type: "input", selector: "#email", value: "a@b.com", password: false, timestamp: 100 });
    normalizer.push({ type: "focusout", selector: "#email", timestamp: 500 });
    normalizer.push({ type: "click", selector: "#password", timestamp: 600 });
    normalizer.push({
      type: "input",
      selector: "#password",
      value: "secret",
      password: true,
      timestamp: 700,
    });
    normalizer.push({ type: "focusout", selector: "#password", timestamp: 1200 });
    const steps = normalizer.flush();
    assert.deepEqual(
      steps.filter((s) => s.type !== "wait").map((s) => s.type),
      ["click", "input", "click", "input"],
    );
    assert.equal(steps.filter((s) => s.type === "click").length, 2);
  });

  it("commits pending input on focus to another field", () => {
    const normalizer = new RecorderNormalizer();
    normalizer.push({ type: "click", selector: "#email", timestamp: 0 });
    normalizer.push({ type: "input", selector: "#email", value: "user@test.com", password: false, timestamp: 100 });
    normalizer.push({ type: "focus", selector: "#password", timestamp: 800 });
    const steps = normalizer.flush();
    assert.equal(steps.some((s) => s.type === "input" && s.selector === "#email"), true);
    assert.equal(steps.some((s) => s.type === "click" && s.selector === "#password"), true);
  });

  it("seeds entry link once at recording start", () => {
    const normalizer = new RecorderNormalizer();
    normalizer.seedEntryRoute("https://example.com/app?token=secret", 0);
    normalizer.seedEntryRoute("https://example.com/other", 100);
    normalizer.push({ type: "click", selector: "#btn", timestamp: 200 });
    const steps = normalizer.flush();
    assert.equal(steps[0].type, "link");
    assert.equal(steps[0].url, "https://example.com/app?token=%7Bredacted%7D");
    assert.equal(steps.filter((s) => s.type === "link").length, 1);
    assert.equal(steps[0].stepId, "s1");
  });
});
