import { HeroCarousel } from "@/components/home/hero-carousel";
import { HomeScrollSnap } from "@/components/home/home-scroll-snap";
import { NewArrivals } from "@/components/home/new-arrivals";
import { Navbar } from "@/components/layout/navbar";
import { getNewArrivals } from "@/lib/products/db";

export default async function HomePage() {
  const newArrivalProducts = await getNewArrivals();

  return (
    <main id="main-content" className="relative bg-white">
      <HomeScrollSnap />
      <Navbar variant="transparent" layout="hero" />
      <HeroCarousel />
      <div className="relative flex min-h-[100svh] snap-start snap-always flex-col bg-white">
        <NewArrivals products={newArrivalProducts} />
      </div>
    </main>
  );
}
