import type { Workforce, WorkforcePerson } from "../db";

/** Every person on site, in tab order. */
export function allPeople(workforce: Workforce): WorkforcePerson[] {
  return [...workforce.a, ...workforce.b];
}

/** A migrated row may not have a name yet; never invent one. */
export function personName(person: WorkforcePerson): string {
  return person.name.trim() || "Unnamed";
}

export function personInitials(person: WorkforcePerson): string {
  const parts = person.name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export interface RoleCount {
  role: string;
  count: number;
}

/** Role totals always come from the named rows; they are never stored. */
export function roleCounts(people: WorkforcePerson[]): RoleCount[] {
  const byRole = new Map<string, RoleCount>();
  for (const person of people) {
    const role = person.role.trim() || "No role";
    const key = role.toLocaleLowerCase();
    const current = byRole.get(key);
    if (current) current.count++;
    else byRole.set(key, { role, count: 1 });
  }
  return [...byRole.values()].sort(
    (a, b) => b.count - a.count || a.role.localeCompare(b.role)
  );
}

export function roleSummary(people: WorkforcePerson[]): string {
  return roleCounts(people)
    .map(({ role, count }) => `${role} ${count}`)
    .join(" · ");
}
