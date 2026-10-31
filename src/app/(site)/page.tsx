import { HeroStatic } from "@/components/home/hero-static";
import { NewArrivals } from "@/components/home/new-arrivals";
import { FeaturedBanner } from "@/components/home/featured-banner";
import { Navbar } from "@/components/layout/navbar";
import { getNewArrivals } from "@/lib/products/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const newArrivalProducts = await getNewArrivals();

  return (
    <main id="main-content" className="relative bg-white">
      <Navbar variant="transparent" layout="hero" />
      <HeroStatic />
      <div className="relative bg-white">
        <NewArrivals products={newArrivalProducts.slice(0, 10)} />
        <FeaturedBanner products={newArrivalProducts.slice(10, 30)} />
      </div>
    </main>
  );
}
