import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mainali Hospitality",
    short_name: "Mainali Hospitality",
    description: "Direct stays with Mainali Hospitality.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf8",
    theme_color: "#0f392e",
  };
}
