export function ShopBanner() {
  return (
    <section className="relative w-full bg-black">
      <div className="relative aspect-[16/8] min-h-[170px] w-full sm:aspect-[5/1] sm:min-h-[220px] md:min-h-[285px] lg:min-h-[320px]">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#292929_0%,#0a0a0a_72%)]"
        />
      </div>
    </section>
  );
}
