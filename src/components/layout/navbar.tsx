"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  mainNavLinks,
  shopNavLinks,
  type NavLinkItem,
} from "@/config/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { AnimatedMenuButton } from "@/components/layout/animated-menu-button";
import { Logo } from "@/components/layout/logo";
import {
  NavCartIcon,
  NavSearchIcon,
} from "@/components/layout/nav-icons";
import { NavSearch } from "@/components/layout/nav-search";
import { MobileMenuDrawer } from "@/components/layout/mobile-menu-drawer";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";

const NAVBAR_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const HOVER_BG_TRANSITION = {
  type: "spring" as const,
  stiffness: 280,
  damping: 34,
  mass: 0.85,
};

const COLOR_TRANSITION_CLASS =
  "transition-colors duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]";

const SCROLL_SPRING = { stiffness: 110, damping: 28, mass: 0.75 };

export type { NavLinkItem } from "@/config/navigation";

export type NavbarVariant = "transparent" | "solid";

export type NavbarLayout = "default" | "shop" | "hero";

export interface NavbarProps {
  variant?: NavbarVariant;
  layout?: NavbarLayout;
  className?: string;
}

export interface NavMenuItemProps {
  link: NavLinkItem;
  isLight: boolean;
  isActive: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

export interface NavbarActionButtonProps {
  label: string;
  isLight: boolean;
  onClick?: () => void;
  children?: ReactNode;
  showLabelOnDesktop?: boolean;
}

function NavMenuItem({
  link,
  isLight,
  isActive,
  onHoverStart,
  onHoverEnd,
}: NavMenuItemProps) {
  return (
    <li>
        <Link
          href={link.href}
          className={cn(
            "relative z-10 block whitespace-nowrap rounded-sm py-2 text-[clamp(11px,1vw+8px,12px)] font-semibold tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current sm:tracking-[0.22em]",
            COLOR_TRANSITION_CLASS,
            isLight ? "text-black/90" : "text-white/90",
            isActive && "opacity-100",
            !isActive && "opacity-55 hover:opacity-100",
          )}
          onMouseEnter={onHoverStart}
          onMouseLeave={onHoverEnd}
        >
          {link.label}
        </Link>
    </li>
  );
}

function NavbarActionButton({
  label,
  isLight,
  onClick,
  children,
  showLabelOnDesktop = true,
}: NavbarActionButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "relative z-10 flex items-center gap-1.5 rounded-sm text-[11px] font-semibold tracking-[0.22em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current lg:text-xs",
        COLOR_TRANSITION_CLASS,
        isLight ? "text-black/90 hover:text-black" : "text-white/90 hover:text-white",
      )}
    >
      {showLabelOnDesktop && (
        <span className="hidden md:inline">{label.toUpperCase()}</span>
      )}
      {children}
    </motion.button>
  );
}

function AnimatedNavbarLogo({
  isLight,
  className,
}: {
  isLight: boolean;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={cn("relative shrink-0", className)}>
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: isLight ? 0 : 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.45, ease: NAVBAR_EASE }
        }
      >
        <Logo variant="light" size="compact" />
      </motion.div>
      <motion.div
        animate={{ opacity: isLight ? 1 : 0 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.45, ease: NAVBAR_EASE }
        }
      >
        <Logo variant="dark" size="compact" />
      </motion.div>
    </div>
  );
}

export function Navbar({
  variant = "transparent",
  layout = "default",
  className,
}: NavbarProps) {
  const pathname = usePathname();
  const { openCart, itemCount, dismissAddedToast } = useCart();
  const prefersReducedMotion = useReducedMotion();
  const isTransparent = variant === "transparent";
  const isShopLayout = layout === "shop";
  const isHeroLayout = layout === "hero";
  const navLinks = isShopLayout ? shopNavLinks : mainNavLinks;
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  const [isHovered, setIsHovered] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [heroHeight, setHeroHeight] = useState(720);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { scrollY } = useScroll();
  const smoothScrollY = useSpring(scrollY, SCROLL_SPRING);

  const scrollBackdropOpacity = useTransform(smoothScrollY, [0, 32, 112], [0, 0.55, 1]);

  const pastHeroOpacity = useTransform(smoothScrollY, (y) => {
    if (pathnameRef.current !== "/") return 0;
    const start = heroHeight * 0.82;
    const end = heroHeight * 0.94;
    if (y <= start) return 0;
    if (y >= end) return 1;
    return (y - start) / (end - start);
  });

  const creamOpacity = useTransform(
    [scrollBackdropOpacity, pastHeroOpacity],
    ([backdrop, pastHero]) => (backdrop as number) * (1 - (pastHero as number)),
  );

  const whiteOpacity = useTransform(
    [scrollBackdropOpacity, pastHeroOpacity],
    ([backdrop, pastHero]) => (backdrop as number) * (pastHero as number),
  );

  const shadowOpacity = useTransform(smoothScrollY, [0, 80, 160], [0, 0.35, 0.65]);
  const headerShadow = useTransform(
    shadowOpacity,
    (v) => `0 10px 32px -8px rgba(0,0,0,${v * 0.14})`,
  );

  useMotionValueEvent(smoothScrollY, "change", (y) => {
    setScrolled(y > 14);
    if (pathnameRef.current === "/" && isHeroLayout) {
      setPastHero(y > heroHeight * 0.75);
    } else {
      setPastHero(false);
    }
  });

  const hoverRevealEnabled = isTransparent && !scrolled;

  const handleHoverStart = useCallback(() => {
    if (hoverRevealEnabled) setIsHovered(true);
  }, [hoverRevealEnabled]);

  const handleHoverEnd = useCallback(() => {
    if (isTransparent) setIsHovered(false);
  }, [isTransparent]);

  const handleHeaderLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  useEffect(() => {
    const updateHeroHeight = () => {
      setHeroHeight(window.innerHeight);
    };
    updateHeroHeight();
    window.addEventListener("resize", updateHeroHeight);
    return () => window.removeEventListener("resize", updateHeroHeight);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!isTransparent) {
        setScrolled(false);
        setPastHero(false);
        return;
      }
      setScrolled(window.scrollY > 14);
      if (isHeroLayout && pathname === "/") {
        setPastHero(window.scrollY > window.innerHeight * 0.75);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isTransparent, isHeroLayout, pathname]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setMobileMenuOpen(false);
      setSearchOpen(false);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  const revealBackground = hoverRevealEnabled && isHovered;
  const isLightSurface = isTransparent
    ? isHeroLayout
      ? !pastHero || revealBackground
      : scrolled || revealBackground
    : false;

  const isLinkActive = (href: string): boolean =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const mobileMenuTheme =
    isShopLayout || isHeroLayout || !isTransparent
      ? "dark"
      : isLightSurface
        ? "light"
        : "dark";

  return (
    <>
      <motion.header
        className={cn(
          "fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]",
          className,
        )}
        onMouseLeave={handleHeaderLeave}
        initial={prefersReducedMotion ? false : { y: -24, opacity: 0 }}
        animate={prefersReducedMotion ? undefined : { y: 0, opacity: 1 }}
        transition={
          prefersReducedMotion
            ? undefined
            : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <motion.div
          className={cn(
            "relative h-[var(--navbar-height)] md:h-[var(--navbar-height-md)]",
            !isTransparent && "border-b border-white/5 bg-[#0A0A0A]/90 backdrop-blur-md",
          )}
          style={
            isTransparent && !prefersReducedMotion
              ? { boxShadow: headerShadow }
              : undefined
          }
        >
          {isTransparent && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 bg-white"
              initial={false}
              animate={{ y: revealBackground ? "0%" : "-100%" }}
              transition={
                prefersReducedMotion ? { duration: 0 } : HOVER_BG_TRANSITION
              }
              style={{ willChange: "transform" }}
            />
          )}

          {!isTransparent && (
            <div
              aria-hidden
              className={cn(
                "absolute inset-0 z-0",
                isShopLayout ? "bg-black" : "bg-[#0A0A0A]/90 backdrop-blur-md",
              )}
            />
          )}

          {isTransparent && !revealBackground && (
            isHeroLayout ? (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 bg-black"
                style={{ opacity: pastHeroOpacity }}
              />
            ) : (
              <>
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-0 bg-[#f5f3ef]/92 backdrop-blur-md"
                  style={{ opacity: creamOpacity }}
                />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-0 bg-white/95 backdrop-blur-md"
                  style={{ opacity: whiteOpacity }}
                />
              </>
            )
          )}

          <div className="relative z-10 mx-auto h-full max-w-[1600px] px-4 sm:px-6 md:px-12 lg:px-16">
            {isHeroLayout || isShopLayout ? (
              <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="flex min-w-0 items-center justify-start gap-2">
                  <nav
                    className="hidden min-w-0 overflow-x-auto md:block [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    aria-label="Main navigation"
                    onMouseLeave={isShopLayout ? undefined : handleHoverEnd}
                  >
                    <ul className="flex w-max items-center gap-6 lg:gap-10">
                      {navLinks.map((link) =>
                        isShopLayout ? (
                          <li key={link.id}>
                            <Link
                              href={link.href}
                              className={cn(
                                "block whitespace-nowrap rounded-sm py-2 text-[clamp(11px,1vw+8px,12px)] font-semibold tracking-[0.18em] text-white uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:tracking-[0.2em]",
                                isLinkActive(link.href)
                                  ? "opacity-100"
                                  : "opacity-75 hover:opacity-100",
                              )}
                            >
                              {link.label}
                            </Link>
                          </li>
                        ) : (
                          <NavMenuItem
                            key={link.id}
                            link={link}
                            isLight={isLightSurface}
                            isActive={isLinkActive(link.href)}
                            onHoverStart={handleHoverStart}
                            onHoverEnd={handleHoverEnd}
                          />
                        ),
                      )}
                    </ul>
                  </nav>
                </div>

                <AnimatedNavbarLogo
                  isLight={isLightSurface}
                  className="relative z-10 justify-self-center"
                />

                <div
                  className="relative z-10 flex items-center justify-end gap-2.5 sm:gap-4 md:gap-5 lg:gap-6"
                  onMouseEnter={
                    !isShopLayout && hoverRevealEnabled
                      ? handleHoverStart
                      : undefined
                  }
                  onMouseLeave={
                    !isShopLayout && isTransparent ? handleHoverEnd : undefined
                  }
                >
                  <NavbarActionButton
                    label="Search"
                    isLight={isShopLayout ? false : isLightSurface}
                    showLabelOnDesktop={false}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setSearchOpen(true);
                    }}
                  >
                    <NavSearchIcon />
                  </NavbarActionButton>

                  <UserMenu isLight={isShopLayout ? false : isLightSurface} />

                  <NavbarActionButton
                    label="Cart"
                    isLight={isShopLayout ? false : isLightSurface}
                    showLabelOnDesktop={false}
                    onClick={() => {
                      dismissAddedToast();
                      openCart();
                    }}
                  >
                    <span className="relative">
                      <NavCartIcon />
                      <AnimatePresence>
                        {itemCount > 0 && (
                          <motion.span
                            key={itemCount}
                            initial={
                              prefersReducedMotion
                                ? false
                                : { scale: 0, opacity: 0 }
                            }
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 520,
                              damping: 26,
                            }}
                            className={cn(
                              "absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[clamp(11px,1vw+8px,12px)] font-bold leading-none",
                              isShopLayout || !isLightSurface
                                ? "bg-white text-black"
                                : "bg-black text-white",
                            )}
                          >
                            {itemCount > 9 ? "9+" : itemCount}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </NavbarActionButton>

                  <AnimatedMenuButton
                    open={mobileMenuOpen}
                    onClick={() => {
                      setSearchOpen(false);
                      setMobileMenuOpen((open) => !open);
                    }}
                    className={cn(
                      "md:hidden",
                      COLOR_TRANSITION_CLASS,
                      isShopLayout || !isLightSurface
                        ? "text-white/90 hover:text-white"
                        : "text-black/90 hover:text-black",
                    )}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center">
                <div className="flex min-w-0 shrink-0 items-center">
                  <AnimatedNavbarLogo
                    isLight={isLightSurface}
                    className="relative z-10"
                  />
                </div>

                <nav
                  className="hidden min-w-0 flex-1 overflow-x-auto pl-6 md:block lg:pl-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  aria-label="Main navigation"
                  onMouseLeave={handleHoverEnd}
                >
                  <ul className="flex w-max items-center gap-4 sm:gap-5 md:gap-8 lg:gap-10">
                    {navLinks.map((link) => (
                      <NavMenuItem
                        key={link.id}
                        link={link}
                        isLight={isLightSurface}
                        isActive={isLinkActive(link.href)}
                        onHoverStart={handleHoverStart}
                        onHoverEnd={handleHoverEnd}
                      />
                    ))}
                  </ul>
                </nav>

                <div
                  className="relative z-10 ml-auto flex shrink-0 items-center gap-2.5 sm:gap-4 md:gap-5 lg:gap-6"
                  onMouseEnter={
                    hoverRevealEnabled ? handleHoverStart : undefined
                  }
                  onMouseLeave={isTransparent ? handleHoverEnd : undefined}
                >
                  <NavbarActionButton
                    label="Search"
                    isLight={isLightSurface}
                    showLabelOnDesktop={false}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setSearchOpen(true);
                    }}
                  >
                    <NavSearchIcon />
                  </NavbarActionButton>

                  <UserMenu isLight={isLightSurface} />

                  <NavbarActionButton
                    label="Cart"
                    isLight={isLightSurface}
                    showLabelOnDesktop={false}
                    onClick={() => {
                      dismissAddedToast();
                      openCart();
                    }}
                  >
                    <span className="relative">
                      <NavCartIcon />
                      <AnimatePresence>
                        {itemCount > 0 && (
                          <motion.span
                            key={itemCount}
                            initial={
                              prefersReducedMotion
                                ? false
                                : { scale: 0, opacity: 0 }
                            }
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 520,
                              damping: 26,
                            }}
                            className={cn(
                              "absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[clamp(11px,1vw+8px,12px)] font-bold leading-none",
                              isLightSurface
                                ? "bg-black text-white"
                                : "bg-white text-black",
                            )}
                          >
                            {itemCount > 9 ? "9+" : itemCount}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </NavbarActionButton>

                  <AnimatedMenuButton
                    open={mobileMenuOpen}
                    onClick={() => {
                      setSearchOpen(false);
                      setMobileMenuOpen((open) => !open);
                    }}
                    className={cn(
                      COLOR_TRANSITION_CLASS,
                      isLightSurface
                        ? "text-black/90 hover:text-black"
                        : "text-white/90 hover:text-white",
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {isTransparent && revealBackground && (
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: NAVBAR_EASE }}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-px bg-black/10"
            />
          )}
        </motion.div>
      </motion.header>

      <NavSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        isLight={isShopLayout ? false : isLightSurface}
      />

      <MobileMenuDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={navLinks}
        theme={mobileMenuTheme}
      />
    </>
  );
}
