"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

const informationLinks = [
  { label: "Terms Of Service", href: "/terms-of-service" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Contact Us", href: "/contact" },
];

const findUsLinks = [
  { label: "Instagram", href: "https://www.instagram.com/be.betterdvl?igsh=bzEzbjV2OTg4dTNn" },
  { label: "TikTok", href: "https://www.tiktok.com/@be.betterstd" },
];

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-sans text-xl font-bold tracking-tight text-white sm:text-2xl">
        {title}
      </h3>
      <div className="mt-3 flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-sm font-sans text-sm text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {label}
    </a>
  );
}

export function SiteFooter() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Hook up to your newsletter provider here
    console.log("subscribe:", email);
  };

  return (
    <footer className="w-full snap-start bg-black">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 sm:py-10 lg:px-16">
        <div className="grid grid-cols-1 items-start gap-8 sm:grid-cols-2 lg:grid-cols-[0.8fr_0.8fr_1.2fr_1.4fr] lg:items-center">
          <FooterColumn title="Information">
            {informationLinks.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </FooterColumn>

          <FooterColumn title="Find Us">
            {findUsLinks.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </FooterColumn>

          <div>
            <h3 className="font-sans text-xl font-bold tracking-tight text-white sm:text-2xl">
              Newsletter
            </h3>
            <p className="mt-3 font-sans text-sm text-white/90">
              Subscribe for store updates and new drops.
            </p>
          </div>

          <form
            onSubmit={handleSubscribe}
            className="flex w-full items-center justify-between gap-3 rounded-full border border-white/40 bg-transparent px-5 py-2.5"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Adress"
              className="w-full rounded-full bg-transparent font-sans text-sm text-white placeholder:text-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            />
            <button
              type="submit"
              aria-label="Subscribe"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </form>
        </div>

        <div className="mt-10 flex justify-end border-t border-white/10 pt-5">
          <p className="font-sans text-sm text-white/80">
            Copyright © {new Date().getFullYear()} bebetter. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}