import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Matches user agents for TV / set-top browsers that struggle with heavy GPU
 * effects (Samsung Tizen, LG webOS, generic smart TVs, consoles). Used to opt
 * these devices into a lighter "reduce-fx" rendering mode.
 */
const TV_USER_AGENT = /\b(SMART-?TV|SmartTV|Tizen|Web0S|webOS|HbbTV|NetCast|VIDAA|BRAVIA|AppleTV|CrKey|GoogleTV|PlayStation|Xbox)\b/i;

export function isTvUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return TV_USER_AGENT.test(userAgent);
}
