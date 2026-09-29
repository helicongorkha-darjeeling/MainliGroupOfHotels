import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mainali Group of Hotels",
    short_name: "Mainali Hotels",
    description: "Direct stays with Mainali Group of Hotels.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf8",
    theme_color: "#0f392e",
  };
}
