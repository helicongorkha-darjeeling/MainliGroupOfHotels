export function brandedPhoto(source: string, crop: "full" | "card" | "hero" | "hero-mobile" = "full") {
  const filename = source.split("/").pop()!;
  return "/branded-images/" + (crop === "full" ? filename : filename.replace(/\.webp$/, "-" + crop + ".webp"));
}

