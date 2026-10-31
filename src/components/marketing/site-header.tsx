"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

const links = [
  ["#tour", "Ürün turu"],
  ["#why", "Neden ForgePilot"],
  ["#features", "Özellikler"],
  ["#github", "GitHub"],
  ["#pricing", "Fiyatlandırma"],
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
      <div className="container">
        <Link href="/" aria-label="ForgePilot ana sayfa">
          <Logo />
        </Link>
        <nav className="site-nav" aria-label="Ana menü">
          {links.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="site-actions">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hide-sm">
            <Link href="/login">Giriş yap</Link>
          </Button>
          <Button asChild>
            <Link href="/register">
              Ücretsiz başla <ArrowRight size={14} />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
