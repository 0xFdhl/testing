import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "varcasvi_",
    short_name: "varcasvi_",
    description:
      "be better. Editorial — helmets, jackets, goggles, and more from varcasvi_.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
  };
}
