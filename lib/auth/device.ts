/** Browser / device identification for login security alerts. */

export type DeviceInfo = {
  fingerprint: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  language: string;
  timezone: string;
  screen: string;
  platform: string;
};

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function detectBrowser(ua: string) {
  if (/edg\//i.test(ua)) return "Microsoft Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "Safari";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/msie|trident/i.test(ua)) return "Internet Explorer";
  return "Unknown browser";
}

function detectOs(ua: string) {
  if (/windows nt/i.test(ua)) return "Windows";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  if (/cros/i.test(ua)) return "Chrome OS";
  return "Unknown OS";
}

function detectDeviceType(ua: string): DeviceInfo["deviceType"] {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  if (/windows|macintosh|linux|cros/i.test(ua)) return "desktop";
  return "unknown";
}

/** Snapshot of the current browser for audit + security emails. */
export function captureDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      fingerprint: "server",
      userAgent: "",
      browser: "Unknown",
      os: "Unknown",
      deviceType: "unknown",
      language: "en",
      timezone: "UTC",
      screen: "",
      platform: ""
    };
  }
  const ua = navigator.userAgent || "";
  const language = navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage || "en";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const screenSize =
    typeof window.screen !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "";
  const platform = navigator.platform || "";
  const fingerprint = hashString([ua, language, timezone, screenSize, platform].join("|"));
  return {
    fingerprint,
    userAgent: ua.slice(0, 400),
    browser: detectBrowser(ua),
    os: detectOs(ua),
    deviceType: detectDeviceType(ua),
    language,
    timezone,
    screen: screenSize,
    platform
  };
}

export function formatDeviceLabel(device: DeviceInfo) {
  return `${device.browser} on ${device.os} (${device.deviceType})`;
}
