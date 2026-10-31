import Link from "next/link";

const informationLinks = [
  { label: "Terms of service", href: "/terms-of-service" },
  { label: "Privacy policy", href: "/privacy-policy" },
];

const contactLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/be.betterdvl?igsh=bzEzbjV2OTg4dTNn",
  },
  { label: "TikTok", href: "https://www.tiktok.com/@be.betterstd" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-none tracking-[-0.075em] text-white">
        {title}
      </h2>
      <ul className="mt-4 space-y-1">
        {links.map((link) => {
          const external = link.href.startsWith("https://");
          return (
            <li key={link.label}>
              <a
                href={link.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                className="text-xs text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:text-sm" >
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// export function SiteFooter() {
//   return (
//     <footer className="relative isolate w-full overflow-hidden bg-[#171717] text-white">
//       <div
//         aria-hidden
//         className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-[60%] opacity-25"
//         style={{
//           backgroundImage:
//             "radial-gradient(circle, rgba(255,255,255,.8) 1px, transparent 1.4px)",
//           backgroundSize: "6px 6px",
//           maskImage:
//             "radial-gradient(ellipse at 62% 45%, #000 4%, transparent 72%)",
//         }}/>
//     <div className="relative mx-auto grid min-h-[280px] max-w-[1600px] grid-cols-2 gap-8 px-[5vw] pt-10 pb-14 sm:gap-16 sm:pt-12 sm:pb-16 md:min-h-[30px] md:pt-14 md:pb-20">
//         <FooterColumn title="information" links={informationLinks} />
//         <FooterColumn title="contact" links={contactLinks} />

//         <p className="self-end text-[11px] text-white/55 sm:text-xs">
//           © {new Date().getFullYear()} · bebetter
//         </p>
//         <Link
//           href="/"
//           aria-label="varcasvi_ home"
//           className="self-end justify-self-end text-3xl font-black leading-none tracking-[-0.1em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:text-4xl" >
//           bbr
//         </Link>
//       </div>
//     </footer>
//   );
// }

export function SiteFooter() {
  return (
    <footer className="relative isolate w-full overflow-hidden bg-[#1a1a1a] text-white md:h-[11vw] md:min-h-[160px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-[60%] opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,.8) 1px, transparent 1.4px)",
          backgroundSize: "6px 6px",
          maskImage:
            "radial-gradient(ellipse at 62% 45%, #000 4%, transparent 72%)",
        }}
      />

   <div className="relative mx-auto grid h-full max-w-[1600px] grid-cols-[auto_auto_1fr] grid-rows-[1fr_auto] gap-x-12 gap-y-3 px-[5vw] py-5 sm:gap-x-16 md:py-6">
      <FooterColumn title="information" links={informationLinks} />
      <FooterColumn title="contact" links={contactLinks} />
      <div className="hidden sm:block" />

      <p className="col-span-2 self-end text-[11px] text-white/55 sm:text-xs">
        © {new Date().getFullYear()} · bebetter
      </p>
      <Link
        href="/"
        aria-label="varcasvi_ home"
        className="self-end justify-self-end text-3xl font-black leading-none tracking-[-0.1em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:text-4xl"
      >
        bbr
      </Link>
    </div>
    </footer>
  );
}