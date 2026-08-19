export type AgeParts = {
  years: number;
  months: number;
  days: number;
};

function parseIsoDateParts(isoDate: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(year, month - 1, day);

  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidBirthDate(
  isoDate: string,
  asOf: Date = new Date(),
): boolean {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) return false;
  if (isoDate > toLocalIsoDate(asOf)) return false;

  const age = getAge(isoDate, asOf);
  return age.years >= 0 && age.years <= 18;
}

export function getAge(birthDate: string, asOf: Date = new Date()): AgeParts {
  const parts = parseIsoDateParts(birthDate);
  if (!parts) {
    return { years: 0, months: 0, days: 0 };
  }

  let years = asOf.getFullYear() - parts.year;
  let months = asOf.getMonth() + 1 - parts.month;
  let days = asOf.getDate() - parts.day;

  if (days < 0) {
    months -= 1;
    const daysInPreviousMonth = new Date(
      asOf.getFullYear(),
      asOf.getMonth(),
      0,
    ).getDate();
    days += daysInPreviousMonth;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

export function formatAge(birthDate: string, asOf: Date = new Date()): string {
  if (!birthDate || !parseIsoDateParts(birthDate)) {
    return "Set birth date";
  }

  const { years, months, days } = getAge(birthDate, asOf);
  return `${years}y ${months}m ${days}d`;
}
