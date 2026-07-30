import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getXenditMode,
  isXenditTestMode,
  setXenditMode,
  getXenditSecretKey,
  getXenditPublicKey,
  getXenditWebhookToken,
  isPublicXenditTestMode,
} from "@/lib/xendit/config";

describe("xendit config", () => {
  beforeEach(() => {
    setXenditMode(null as never);
    vi.stubEnv("XENDIT_TEST_SECRET_KEY", "xnd_test_abc");
    vi.stubEnv("XENDIT_LIVE_SECRET_KEY", "xnd_live_xyz");
    vi.stubEnv("XENDIT_TEST_PUBLIC_KEY", "xnd_test_pub");
    vi.stubEnv("XENDIT_TEST_WEBHOOK_TOKEN", "token-test");
  });

  afterEach(() => {
    setXenditMode(null as never);
    vi.unstubAllEnvs();
  });

  describe("getXenditMode", () => {
    it("defaults to test when XENDIT_MODE unset", () => {
      vi.stubEnv("XENDIT_MODE", "");
      expect(getXenditMode()).toBe("test");
    });

    it("returns live when XENDIT_MODE=live", () => {
      vi.stubEnv("XENDIT_MODE", "live");
      expect(getXenditMode()).toBe("live");
    });

    it("falls back to test for unknown mode value", () => {
      vi.stubEnv("XENDIT_MODE", "sandbox");
      expect(getXenditMode()).toBe("test");
    });

    it("uses cached mode set via setXenditMode", () => {
      setXenditMode("live");
      expect(getXenditMode()).toBe("live");
    });
  });

  describe("isXenditTestMode", () => {
    it("true when mode is test", () => {
      vi.stubEnv("XENDIT_MODE", "test");
      expect(isXenditTestMode()).toBe(true);
    });

    it("false when mode is live", () => {
      vi.stubEnv("XENDIT_MODE", "live");
      expect(isXenditTestMode()).toBe(false);
    });
  });

  describe("getXenditSecretKey", () => {
    it("returns test key in test mode", () => {
      vi.stubEnv("XENDIT_MODE", "test");
      expect(getXenditSecretKey()).toBe("xnd_test_abc");
    });

    it("returns live key in live mode", () => {
      vi.stubEnv("XENDIT_MODE", "live");
      expect(getXenditSecretKey()).toBe("xnd_live_xyz");
    });

    it("falls back to XENDIT_SECRET_KEY when specific key missing", () => {
      vi.stubEnv("XENDIT_MODE", "test");
      vi.stubEnv("XENDIT_TEST_SECRET_KEY", "");
      vi.stubEnv("XENDIT_SECRET_KEY", "generic-key");
      expect(getXenditSecretKey()).toBe("generic-key");
    });

    it("throws when no key configured", () => {
      vi.stubEnv("XENDIT_MODE", "test");
      vi.stubEnv("XENDIT_TEST_SECRET_KEY", "");
      vi.stubEnv("XENDIT_SECRET_KEY", "");
      expect(() => getXenditSecretKey()).toThrow(/is not configured/);
    });
  });

  describe("getXenditPublicKey", () => {
    it("returns undefined when not set", () => {
      vi.stubEnv("XENDIT_MODE", "live");
      vi.stubEnv("XENDIT_LIVE_PUBLIC_KEY", "");
      vi.stubEnv("XENDIT_PUBLIC_KEY", "");
      expect(getXenditPublicKey()).toBeUndefined();
    });
  });

  describe("getXenditWebhookToken", () => {
    it("returns token based on mode", () => {
      vi.stubEnv("XENDIT_MODE", "test");
      expect(getXenditWebhookToken()).toBe("token-test");
    });
  });

  describe("isPublicXenditTestMode", () => {
    it("defaults to true when NEXT_PUBLIC_XENDIT_MODE unset", () => {
      vi.stubEnv("NEXT_PUBLIC_XENDIT_MODE", "");
      expect(isPublicXenditTestMode()).toBe(true);
    });

    it("false when NEXT_PUBLIC_XENDIT_MODE=live", () => {
      vi.stubEnv("NEXT_PUBLIC_XENDIT_MODE", "live");
      expect(isPublicXenditTestMode()).toBe(false);
    });
  });
});