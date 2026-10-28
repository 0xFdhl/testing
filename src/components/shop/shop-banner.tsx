import { shopBannerImage } from "@/config/assets";
import Image from "next/image";

export function ShopBanner() {
  return (
    <section className="relative w-full bg-black">
      <div className="relative aspect-[16/8] min-h-[170px] w-full sm:aspect-[5/1] sm:min-h-[220px] md:min-h-[285px] lg:min-h-[320px]">
        <Image
          src={shopBannerImage.src}
          alt={shopBannerImage.alt}
          fill
          priority
          className="object-cover object-[center_46%]"
          sizes="100vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/15"
        />
      </div>
    </section>
  );
}
