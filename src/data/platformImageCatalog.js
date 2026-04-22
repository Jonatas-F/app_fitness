const personalAvatarModules = import.meta.glob("../assets/platform/personal/*.{svg,png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
  query: "?url",
});

function labelFromPath(path) {
  const fileName = path.split("/").pop()?.replace(/\.[^.]+$/, "") || "avatar";

  return fileName
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stableShuffleValue(value) {
  return Array.from(value).reduce((total, character, index) => {
    return total + character.charCodeAt(0) * (index + 17);
  }, 0);
}

export const personalAvatarCatalog = Object.entries(personalAvatarModules)
  .map(([path, url]) => ({
    id: path.split("/").pop()?.replace(/\.[^.]+$/, "") || path,
    label: labelFromPath(path),
    url,
    path,
  }))
  .sort((first, second) => stableShuffleValue(first.id) - stableShuffleValue(second.id));

export function getPersonalAvatarById(avatarId) {
  return (
    personalAvatarCatalog.find((avatar) => avatar.id === avatarId) ||
    personalAvatarCatalog[0] ||
    null
  );
}
