// Template placeholders resolved from project data before any AI is involved.
export const PLACEHOLDERS = [
  "project_name",
  "project_description",
  "workspace_name",
  "current_sprint",
  "project_progress",
  "team_members",
  "created_date",
  "milestones",
  "tech_stack",
] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

const pattern = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function findPlaceholders(markdown: string) {
  return [...new Set([...markdown.matchAll(pattern)].map((m) => m[1]))];
}

// Known placeholders with a value are replaced; unknown or unavailable ones
// stay in place so the author can see what still needs filling.
export function resolvePlaceholders(
  markdown: string,
  values: Partial<Record<Placeholder, string>>,
) {
  const unresolved = new Set<string>();
  const content = markdown.replace(pattern, (whole, name: string) => {
    const value = values[name as Placeholder];
    if (value === undefined || value === "") {
      unresolved.add(name);
      return whole;
    }
    return value;
  });
  return { content, unresolved: [...unresolved] };
}
