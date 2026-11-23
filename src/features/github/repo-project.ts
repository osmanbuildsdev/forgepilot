// Suggested project name and key for a repository:
// "acme/forge-mobile" -> name "forge-mobile", key "FORGE".
export function projectFromRepo(fullName: string) {
  const name = fullName.split("/").pop() ?? fullName;
  const key =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, " ")
      .trim()
      .split(/\s+/)[0]
      ?.replace(/^[0-9]+/, "")
      .slice(0, 6) || "PROJ";
  return { name, key: key.length >= 2 ? key : "PROJ" };
}
