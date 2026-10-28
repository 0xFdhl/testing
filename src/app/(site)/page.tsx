import { HeroStatic } from "@/components/home/hero-static";
import { HomeScrollSnap } from "@/components/home/home-scroll-snap";
import { OpeningOverlay } from "@/components/home/opening-overlay";
import { OpeningProvider } from "@/components/home/opening-provider";
import { NewArrivals } from "@/components/home/new-arrivals";
import { FeaturedBanner } from "@/components/home/featured-banner";
import { Navbar } from "@/components/layout/navbar";
import { getNewArrivals } from "@/lib/products/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const newArrivalProducts = await getNewArrivals();

  return (
    <main id="main-content" className="relative bg-white">
      <HomeScrollSnap />
      {/* Intro diputar sekali per tab session (OpeningProvider tandai
          sessionStorage saat complete). Klik home / navigasi kembali
          setelah intro selesai langsung skip — tidak replay lagi. */}
      <OpeningProvider>
        <OpeningOverlay />
        <Navbar variant="transparent" layout="hero" />
      </OpeningProvider>
      <HeroStatic />
      <div className="relative bg-white">
        <NewArrivals products={newArrivalProducts.slice(0, 5)} />
        <FeaturedBanner products={newArrivalProducts.slice(5, 15)} />
      </div>
    </main>
  );
}
