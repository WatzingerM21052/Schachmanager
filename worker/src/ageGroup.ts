// Single shared implementation of the age-category rule that used to be duplicated
// (and independently maintained) in both source projects: SchuelerligaManager's
// Player.AgeGroup string and SvHofkirchen's MemberDto.AgeCategory computed property.
// Always computed on read, never stored, so it can't go stale across a birthday/season rollover.

/** Chess season conventionally starts in September: Sep 2026-Aug 2027 is "season 2027". */
export function currentSeasonYear(referenceDate: Date = new Date()): number {
  const month = referenceDate.getUTCMonth() + 1; // 1-12
  const year = referenceDate.getUTCFullYear();
  return month >= 9 ? year + 1 : year;
}

export function ageGroupForBirthYear(birthYear: number, seasonYear: number = currentSeasonYear()): string {
  const age = seasonYear - birthYear;
  if (age <= 8) return "U8";
  if (age <= 10) return "U10";
  if (age <= 12) return "U12";
  if (age <= 14) return "U14";
  if (age <= 16) return "U16";
  if (age <= 18) return "U18";
  if (age <= 20) return "U20";
  return "Ue20";
}

export function ageGroupForBirthdate(birthdate: string, seasonYear: number = currentSeasonYear()): string {
  const birthYear = new Date(birthdate).getUTCFullYear();
  return ageGroupForBirthYear(birthYear, seasonYear);
}
