import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { proxy, config } from "@/proxy";

// The middleware signature is `proxy()` (Next.js injects the request at runtime).
// We call it without args since it only returns NextResponse.next() with headers.
const runProxy = proxy as () => ReturnType<
  typeof NextResponse.next
> & { headers: Headers };

describe("proxy middleware security headers", () => {
  function headersFor(): Headers {
    return runProxy().headers;
  }

  it("sets Content-Security-Policy with strict directives", () => {
    const csp = headersFor().get("Content-Security-Policy");
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it("sets X-Content-Type-Options to nosniff", () => {
    expect(headersFor().get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets X-Frame-Options to DENY", () => {
    expect(headersFor().get("X-Frame-Options")).toBe("DENY");
  });

  it("sets Strict-Transport-Security with long max-age + preload", () => {
    const hsts = headersFor().get("Strict-Transport-Security");
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).toContain("preload");
  });

  it("sets Referrer-Policy", () => {
    expect(headersFor().get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("sets Permissions-Policy restricting camera/mic/geolocation", () => {
    const pp = headersFor().get("Permissions-Policy");
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
    expect(pp).toContain("geolocation=()");
  });

  it("config matcher excludes static assets", () => {
    const matcher = config.matcher.join("|");
    expect(matcher).toContain("_next/static");
    expect(matcher).toContain("favicon.ico");
  });
});