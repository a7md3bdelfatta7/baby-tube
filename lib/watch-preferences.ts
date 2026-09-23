const THEATER_MODE_KEY = "babytube.watch.theaterMode";
const FULLSCREEN_KEY = "babytube.watch.fullscreen";
const SHUFFLE_KEY = "babytube.watch.shuffle";

function getFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(key) === "1";
}

function setFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) window.sessionStorage.setItem(key, "1");
  else window.sessionStorage.removeItem(key);
}

function getPersistedFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}

function setPersistedFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(key, "1");
  else window.localStorage.removeItem(key);
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

export function getShufflePreference(): boolean {
  return getPersistedFlag(SHUFFLE_KEY);
}

export function setShufflePreference(value: boolean): void {
  setPersistedFlag(SHUFFLE_KEY, value);
}
