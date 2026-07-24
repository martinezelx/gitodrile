import { describe, expect, it } from "vitest";
import { resolveLanguage } from "./i18n";

describe("resolveLanguage", () => {
  it("resolves any Spanish locale, regardless of region, to Spanish", () => {
    expect(resolveLanguage("es")).toBe("es");
    expect(resolveLanguage("es-ES")).toBe("es");
    expect(resolveLanguage("es-MX")).toBe("es");
    expect(resolveLanguage("es_MX")).toBe("es");
  });

  it("resolves any English locale to English", () => {
    expect(resolveLanguage("en")).toBe("en");
    expect(resolveLanguage("en-US")).toBe("en");
    expect(resolveLanguage("en-GB")).toBe("en");
  });

  it("falls back to English for unsupported locales", () => {
    expect(resolveLanguage("fr-FR")).toBe("en");
    expect(resolveLanguage("de")).toBe("en");
  });

  it("falls back to English when there's no locale at all", () => {
    expect(resolveLanguage(null)).toBe("en");
    expect(resolveLanguage(undefined)).toBe("en");
    expect(resolveLanguage("")).toBe("en");
  });
});
