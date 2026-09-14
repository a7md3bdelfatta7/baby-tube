const THEATER_MODE_KEY = "babytube.watch.theaterMode";
const FULLSCREEN_KEY = "babytube.watch.fullscreen";

function getFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(key) === "1";
}

function setFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) window.sessionStorage.setItem(key, "1");
  else window.sessionStorage.removeItem(key);
}

export function getTheaterModePreference(): boolean {
  return getFlag(THEATER_MODE_KEY);
}

export function setTheaterModePreference(value: boolean): void {
  setFlag(THEATER_MODE_KEY, value);
}

export function getFullscreenPreference(): boolean {
  return getFlag(FULLSCREEN_KEY);
}

export function setFullscreenPreference(value: boolean): void {
  setFlag(FULLSCREEN_KEY, value);
}
