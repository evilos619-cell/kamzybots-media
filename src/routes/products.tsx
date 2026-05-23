import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Facebook, Instagram, Mail, Music2, Shield, MessageCircle,
  ArrowRight, Search, Twitter, Linkedin, AtSign, Inbox, Gift,
  Send, LifeBuoy, Apple, Phone, Hash, ShoppingCart, Package, Sparkles, Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth, signOut } from "@/hooks/use-auth";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — KAMZYBOT'S MEDIA Service Marketplace" },
      { name: "description", content: "Browse all verified accounts, VPNs, mails, gift cards & more on KAMZYBOT'S MEDIA. Instant delivery, secure checkout." },
      { property: "og:title", content: "Products — KAMZYBOT'S MEDIA" },
      { property: "og:description", content: "All categories: Facebook, Instagram, X, TikTok, VPNs, Mails, Gift Cards & more." },
    ],
  }),
  component: ProductsPage,
});

const CONTACTS = {
  whatsapp: "https://chat.whatsapp.com/your-community-invite",
  telegram: "https://t.me/kamzybot",
  support: "mailto:support@kamzybotsmedia.com",
};

type Product = {
  title: string;
  desc: string;
  price: string;
  stock: number;
};

type Category = {
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  bg: string;
  blurb: string;
  products: Product[];
};

const categories: Category[] = [
  {
    name: "AGED USA FACEBOOK",
    icon: Facebook,
    color: "var(--brand-fb)",
    bg: "oklch(0.95 0.04 255)",
    blurb: "Premium aged USA Facebook accounts with friends, switch profiles & full mail access.",
    products: [
      { title: "USA FACEBOOK | Pure USA (30+ Friends, 2015–2019)", desc: "All has switch profile. Format: uid|password|mail|mail password|backupmail|gender", price: "₦5,500", stock: 0 },
      { title: "RANDOM COUNTRY FACEBOOK (USA chat-able)", desc: "30–1,000 friends, active marketplace, 90% has create profile, all has old post.", price: "₦10", stock: 0 },
      { title: "USA FACEBOOK 0–30 Friends (2016–2023)", desc: "Use VPN to login. Format: uid|pass|2fa|mail|mail pass|backupmail.", price: "₦5,000", stock: 0 },
    ],
  },
  {
    name: "NEW FACEBOOK ACCOUNTS",
    icon: Facebook,
    color: "var(--brand-fb)",
    bg: "oklch(0.95 0.04 255)",
    blurb: "Brand-new Facebook accounts with switch profile already created and editable.",
    products: [
      { title: "FACEBOOK NEW 0–50 FRIENDS", desc: "Created ~3 months ago, interactive account, year 2025. Format: uid|pass|2fa|email|email pass.", price: "₦1,800", stock: 0 },
      { title: "1–8 MONTH FACEBOOK USA", desc: "0–50 friends, can chat & support all countries, switch profile editable.", price: "₦2,500", stock: 0 },
    ],
  },
  {
    name: "INSTAGRAM",
    icon: Instagram,
    color: "var(--brand-ig)",
    bg: "oklch(0.96 0.04 350)",
    blurb: "Aged Instagram accounts ready for growth or warm-up.",
    products: [
      { title: "INSTAGRAM 5–7 yrs Empty", desc: "5–7 year old empty Instagram account, fresh and unused.", price: "₦3,500", stock: 0 },
    ],
  },
  {
    name: "VERIFIED SOCIALS",
    icon: Sparkles,
    color: "oklch(0.6 0.22 50)",
    bg: "oklch(0.96 0.04 50)",
    blurb: "Blue-tick verified Instagram and Facebook accounts.",
    products: [
      { title: "AGED VERIFIED IG (Blue Tick)", desc: "2 months+ verification. Don't change username — you can lose the badge.", price: "₦150,000", stock: 30 },
      { title: "OLD VERIFIED FB", desc: "Confirmed real & official identity badge. Don't change username to keep the badge.", price: "₦150,000", stock: 20 },
    ],
  },
  {
    name: "TWITTER / X",
    icon: Twitter,
    color: "oklch(0.2 0 0)",
    bg: "oklch(0.95 0 0)",
    blurb: "Aged X (Twitter) accounts, verified by email with 2FA enabled.",
    products: [
      { title: "X OLD ACCOUNTS 1–50 FOLLOWERS (2009–2020)", desc: "Verified by email, 2FA opened, 80% USA. Format: username|pass|email|emailpass|2FA.", price: "₦1,200", stock: 0 },
      { title: "X OLD ACCOUNTS 100–500 REAL FOLLOWERS", desc: "Mostly USA, 2009–2020 registration with full mail access.", price: "₦3,000", stock: 0 },
      { title: "USA X 50–100 FOLLOWERS (2007–2009)", desc: "Vintage X accounts, 2FA enabled, full credentials included.", price: "₦2,000", stock: 0 },
    ],
  },
  {
    name: "TIKTOK",
    icon: Music2,
    color: "var(--brand-tiktok)",
    bg: "oklch(0.95 0.005 260)",
    blurb: "Aged USA TikTok accounts with mail access.",
    products: [
      { title: "AGED USA TIKTOK", desc: "Aged USA empty TikTok with mail access. Use VPN while logging in.", price: "₦1,500", stock: 18 },
    ],
  },
  {
    name: "SNAPCHAT",
    icon: Hash,
    color: "oklch(0.85 0.18 95)",
    bg: "oklch(0.97 0.05 95)",
    blurb: "1–6 month aged USA Snapchat accounts.",
    products: [
      { title: "SNAPCHAT 🇺🇸 (1–6 months)", desc: "Aged USA Snapchat ready for use.", price: "₦3,500", stock: 0 },
    ],
  },
  {
    name: "REDDIT",
    icon: MessageCircle,
    color: "var(--brand-reddit)",
    bg: "oklch(0.96 0.04 35)",
    blurb: "Old USA Reddit accounts with email & 2FA included.",
    products: [
      { title: "Old USA Reddit (Email Verified)", desc: "Registered from USA IP, 0–20 karma. Format: username|mail|password|2fa|country.", price: "₦2,500", stock: 0 },
    ],
  },
  {
    name: "QUORA",
    icon: MessageCircle,
    color: "oklch(0.5 0.18 25)",
    bg: "oklch(0.96 0.04 25)",
    blurb: "Foreign Quora accounts (USA, Germany & more).",
    products: [
      { title: "FOREIGN QUORA 2015–2024", desc: "Direct login, no VPN. Format: mail|password|year.", price: "₦2,000", stock: 21 },
    ],
  },
  {
    name: "MAILS",
    icon: Mail,
    color: "var(--brand-gmail)",
    bg: "oklch(0.96 0.04 25)",
    blurb: "High-quality long-term Hotmail and other mail accounts.",
    products: [
      { title: "HOTMAILS — Long Term", desc: "High-quality long-term Hotmail. Usable after skipping the first 7 days.", price: "₦200", stock: 106 },
    ],
  },
  {
    name: "APPLE",
    icon: Apple,
    color: "oklch(0.3 0 0)",
    bg: "oklch(0.94 0 0)",
    blurb: "USA Apple iCloud accounts with token access.",
    products: [
      { title: "USA APPLE ICLOUD", desc: "Old/New USA iCloud with number token for code. Format: mail|password|token|number.", price: "₦4,000", stock: 0 },
    ],
  },
  {
    name: "TEXTING APP",
    icon: Phone,
    color: "oklch(0.55 0.18 200)",
    bg: "oklch(0.96 0.04 200)",
    blurb: "Talkatone, Google Voice, TextNow, TextPlus and more.",
    products: [
      { title: "TALKATONE", desc: "Talkatone account. Use VPN (OvpnSpider — Poland).", price: "₦2,500", stock: 0 },
      { title: "GOOGLE VOICE", desc: "Google Voice with VPN (Express USA). Calling and OTP only. Format: mail|password|number.", price: "₦4,500", stock: 2 },
      { title: "TEXTNOW", desc: "TextNow with VPN (Express USA). Change password after 5 hrs.", price: "₦3,000", stock: 0 },
      { title: "TEXTPLUS", desc: "Text Plus / Next Plus. Login direct on app, use VPN, enable 2FA.", price: "₦1,500", stock: 0 },
    ],
  },
  {
    name: "PREMIUM VPN",
    icon: Shield,
    color: "var(--brand-vpn)",
    bg: "oklch(0.96 0.04 155)",
    blurb: "HMA, IPVanish, Surfshark, NordVPN, PIA — premium VPN logins.",
    products: [
      { title: "HMA VPN (30 days)", desc: "One device, one user. Don't attempt to change details. Format: mail|password.", price: "₦3,000", stock: 8 },
      { title: "IPVANISH VPN", desc: "One device, one user. Don't attempt to change details.", price: "₦3,000", stock: 0 },
      { title: "SURFSHARK VPN (1–6 months)", desc: "One device, one user. Format: mail|password.", price: "₦4,000", stock: 0 },
      { title: "NORD VPN (1 month log)", desc: "Valid for 1 month, 1 device only.", price: "₦4,000", stock: 0 },
      { title: "PIA VPN (1 month log)", desc: "Valid for 1 month, 1 device only.", price: "₦4,000", stock: 0 },
    ],
  },
  {
    name: "9 PROXY",
    icon: Shield,
    color: "oklch(0.45 0.18 270)",
    bg: "oklch(0.96 0.04 270)",
    blurb: "Premium 9 Proxy — strong location-changing proxy service.",
    products: [
      { title: "10 IP 9 PROXY", desc: "Premium VPN that actually changes your location. Stronger than regular VPN.", price: "₦3,000", stock: 0 },
    ],
  },
  {
    name: "SHARP UPDATES",
    icon: Sparkles,
    color: "oklch(0.6 0.2 295)",
    bg: "oklch(0.96 0.04 295)",
    blurb: "Latest tools, flashing updates, and pro PC tools.",
    products: [
      { title: "Coinbase Flashing", desc: "Latest Coinbase flashing — no setup required, just $1–$5 BNB.", price: "₦20,000", stock: 400 },
      { title: "TRUSTWALLET FLASHING", desc: "Latest Trustwallet flashing — no setup, just $1–$5 BNB.", price: "₦25,000", stock: 198 },
      { title: "YELLOW STONE UPDATE", desc: "Sharp and updated Yellow Stone update.", price: "₦10,000", stock: 700 },
      { title: "BTC RECOVERY UPDATE", desc: "Sharp 2025 BTC recovery update with full tools.", price: "₦15,000", stock: 0 },
      { title: "FAKE VIDEO CALL FOR PC", desc: "Latest fake video call for PC. Requires 8GB RAM. Message support for eligibility.", price: "₦45,000", stock: 1000 },
    ],
  },
  {
    name: "LINKEDIN",
    icon: Linkedin,
    color: "oklch(0.45 0.13 240)",
    bg: "oklch(0.95 0.04 240)",
    blurb: "Aged LinkedIn accounts for outreach and networking.",
    products: [
      { title: "LinkedIn Aged Account", desc: "Aged LinkedIn ready for use. Contact support for quantity.", price: "₦5,000", stock: 0 },
    ],
  },
  {
    name: "FIRSTMAIL & YAHOO",
    icon: AtSign,
    color: "oklch(0.55 0.18 200)",
    bg: "oklch(0.96 0.04 200)",
    blurb: "Bulk Firstmail and Yahoo Mail inboxes.",
    products: [
      { title: "Firstmail Inbox", desc: "Bulk Firstmail accounts. Contact support for pricing tiers.", price: "₦150", stock: 0 },
      { title: "Yahoo Mail Aged", desc: "Aged Yahoo Mail with full access.", price: "₦400", stock: 0 },
    ],
  },
  {
    name: "GIFT CARDS",
    icon: Gift,
    color: "oklch(0.6 0.22 15)",
    bg: "oklch(0.96 0.04 15)",
    blurb: "Amazon, Apple, Google Play, Steam, Visa Prepaid & more.",
    products: [
      { title: "Amazon Gift Card", desc: "Available in $25, $50, $100, $250, $500. Instant email delivery.", price: "from ₦40,000", stock: 50 },
      { title: "Apple Gift Card", desc: "Multiple denominations. Delivered instantly.", price: "from ₦40,000", stock: 50 },
      { title: "Google Play Gift Card", desc: "USD denominations available. Instant delivery.", price: "from ₦40,000", stock: 50 },
      { title: "Steam Gift Card", desc: "USD denominations for global Steam accounts.", price: "from ₦40,000", stock: 30 },
    ],
  },
];

function buildOrderLink(productTitle: string) {
  const text = `Hi KAMZYBOT'S MEDIA, I'd like to order: ${productTitle}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function ProductsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageHero />
      <CategoryNav />
      <main className="container mx-auto max-w-7xl px-6 pb-24 space-y-20">
        {categories.map((c) => <CategorySection key={c.name} category={c} />)}
      </main>
      <CTA />
      <Footer />
      <FloatingContact />
    </div>
  );
}

function Header() {
  const { isAuthed } = useAuth();
  const navItems = [
    { label: "Home", href: "/" },
    { label: "Product", href: "/products" },
    { label: "About", href: "/about" },
    { label: "Admin", href: "/admin" },
    { label: "Contact", href: "/#contact" },
    ...(isAuthed
      ? [{ label: "Dashboard", href: "/dashboard" }]
      : [{ label: "Login", href: "/login" }, { label: "Register", href: "/register" }]),
  ];
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="container mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-cta-gradient flex items-center justify-center text-primary-foreground font-bold shadow-soft">K</div>
          <span className="font-display font-bold text-xl tracking-tight">KAMZYBOT'S <span className="text-gradient">MEDIA</span></span>
        </Link>
        <Sheet>
          <SheetTrigger
            aria-label="Open menu"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-border/70 bg-card/60 hover:bg-card transition-colors shadow-soft"
          >
            <Menu className="w-6 h-6 text-foreground" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[88vw] sm:max-w-sm p-0 flex flex-col">
            <SheetHeader className="px-6 py-5 border-b border-border/60 text-left">
              <SheetTitle className="font-display text-xl">
                KAMZYBOT'S <span className="text-gradient">MEDIA</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex-1 overflow-y-auto px-2 py-4">
              {navItems.map(i => (
                <a key={i.label} href={i.href} className="block px-5 py-4 text-lg font-medium text-foreground/90 hover:bg-muted/60 rounded-lg transition-colors">
                  {i.label}
                </a>
              ))}
              {isAuthed && (
                <button onClick={() => signOut().then(() => window.location.reload())} className="w-full text-left block px-5 py-4 text-lg font-medium text-destructive hover:bg-muted/60 rounded-lg transition-colors">
                  Logout
                </button>
              )}
            </nav>
            <div className="p-5 border-t border-border/60">
              <a href={CONTACTS.whatsapp} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full rounded-full bg-cta-gradient text-primary-foreground px-6 py-3.5 text-base font-semibold shadow-soft hover:scale-[1.02] transition-transform">
                Order Now
              </a>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function PageHero() {
  return (
    <section className="relative overflow-hidden bg-hero-glow border-b border-border/60">
      <div className="container mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-card">
          <Package className="w-3.5 h-3.5 text-primary" /> SERVICE MARKETPLACE
        </div>
        <h1 className="mt-6 font-display font-extrabold text-5xl md:text-6xl leading-[1.05] max-w-3xl">
          All <span className="text-gradient">products & services</span> in one place.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Browse every category — from aged Facebook accounts to premium VPNs, gift cards and sharp updates.
          Tap any item to order instantly via WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" /> {categories.length} categories
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-sm">
            <ShoppingCart className="w-4 h-4 text-primary" /> {categories.reduce((s, c) => s + c.products.length, 0)} services
          </span>
        </div>
      </div>
    </section>
  );
}

function CategoryNav() {
  return (
    <div className="sticky top-[73px] z-30 bg-background/90 backdrop-blur border-b border-border/60">
      <div className="container mx-auto max-w-7xl px-6 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {categories.map((c) => (
          <a key={c.name} href={`#${slug(c.name)}`}
            className="shrink-0 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            <c.icon className="w-3.5 h-3.5" style={{ color: c.color }} />
            {c.name}
          </a>
        ))}
      </div>
    </div>
  );
}

function CategorySection({ category }: { category: Category }) {
  const Icon = category.icon;
  return (
    <section id={slug(category.name)} className="scroll-mt-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-soft shrink-0" style={{ background: category.color }}>
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-semibold text-primary uppercase tracking-wider">
              {category.products.length} {category.products.length === 1 ? "Service" : "Services"}
            </div>
            <h2 className="mt-1 font-display font-bold text-2xl md:text-3xl">{category.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">{category.blurb}</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {category.products.map((p) => (
          <ProductCard key={p.title} product={p} category={category} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product, category }: { product: Product; category: Category }) {
  const Icon = category.icon;
  const inStock = product.stock > 0;
  return (
    <div className="group rounded-3xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-soft hover:-translate-y-1 transition-all">
      <div className="aspect-[4/3] flex items-center justify-center relative" style={{ background: category.bg }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white shadow-soft" style={{ background: category.color }}>
          <Icon className="w-10 h-10" />
        </div>
        <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${inStock ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
          {inStock ? `In Stock: ${product.stock}` : "Out of Stock"}
        </span>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-sm leading-snug line-clamp-2">{product.title}</h3>
        <p className="mt-2 text-xs text-muted-foreground line-clamp-3 flex-1">{product.desc}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Per quantity</div>
            <div className="font-display font-bold text-lg text-gradient">{product.price}</div>
          </div>
          <a href={buildOrderLink(product.title)} target="_blank" rel="noopener noreferrer"
            className="rounded-full bg-cta-gradient text-primary-foreground px-4 py-2 text-xs font-semibold shadow-soft group-hover:scale-105 transition-transform inline-flex items-center gap-1.5">
            Purchase <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function CTA() {
  return (
    <section className="container mx-auto max-w-7xl px-6 pb-24">
      <div className="rounded-3xl bg-cta-gradient text-primary-foreground p-10 md:p-14 text-center shadow-soft">
        <h2 className="font-display font-bold text-3xl md:text-4xl">Can't find what you need?</h2>
        <p className="mt-3 max-w-xl mx-auto opacity-90">
          We stock dozens more services off-listing. Message support and we'll source it for you.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={CONTACTS.whatsapp} target="_blank" rel="noopener noreferrer"
            className="rounded-full bg-white text-primary px-6 py-3 font-semibold inline-flex items-center gap-2 hover:scale-105 transition-transform">
            <MessageCircle className="w-4 h-4" /> WhatsApp us
          </a>
          <a href={CONTACTS.telegram} target="_blank" rel="noopener noreferrer"
            className="rounded-full bg-white/10 backdrop-blur border border-white/30 px-6 py-3 font-semibold inline-flex items-center gap-2 hover:bg-white/20 transition-colors">
            <Send className="w-4 h-4" /> Telegram
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="container mx-auto max-w-7xl px-6 py-10 flex flex-col sm:flex-row gap-3 justify-between items-center text-sm text-muted-foreground">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cta-gradient flex items-center justify-center text-primary-foreground text-xs font-bold">K</div>
          <span className="font-display font-bold">KAMZYBOT'S <span className="text-gradient">MEDIA</span></span>
        </Link>
        <div>© {new Date().getFullYear()} KAMZYBOT'S MEDIA. All rights reserved.</div>
      </div>
    </footer>
  );
}

function FloatingContact() {
  const items = [
    { href: CONTACTS.whatsapp, icon: MessageCircle, label: "WhatsApp", bg: "oklch(0.65 0.18 150)" },
    { href: CONTACTS.telegram, icon: Send, label: "Telegram", bg: "oklch(0.65 0.16 240)" },
    { href: CONTACTS.support, icon: LifeBuoy, label: "Support", bg: "oklch(0.6 0.2 295)" },
  ];
  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-3">
      {items.map(i => {
        const Icon = i.icon;
        return (
          <a key={i.label} href={i.href} target="_blank" rel="noopener noreferrer"
            aria-label={i.label}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-soft hover:scale-110 transition-transform"
            style={{ background: i.bg }}>
            <Icon className="w-5 h-5" />
          </a>
        );
      })}
    </div>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
