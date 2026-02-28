import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[var(--navbar-height)]">
        <section className="relative overflow-hidden border-b border-white/6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,66,66,0.14),transparent_42%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent)]" />
          <div className="content-container relative py-24 sm:py-32 md:py-40 flex flex-col items-center text-center">
            <p className="text-[11px] tracking-[0.25em] uppercase text-[#ef4242] mb-5">Page Not Found</p>
            <div
              className="font-nord text-[5.5rem] sm:text-[8rem] md:text-[11rem] leading-none text-white"
              style={{ textShadow: "0 0 50px rgba(239,66,66,0.16)" }}
            >
              404
            </div>
            <h1 className="mt-6 font-nord text-2xl sm:text-3xl text-white tracking-wider">
              This route does not exist.
            </h1>
            <p className="mt-4 max-w-xl text-sm sm:text-base text-white/45 leading-relaxed">
              The page you tried to open may have moved, been removed, or never existed in the first place.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center h-11 px-6 text-[11px] tracking-widest uppercase bg-[#ef4242] text-white rounded-sm hover:bg-[#dd3030] transition-colors shadow-[0_0_24px_rgba(239,66,66,0.28)]"
              >
                Go Home
              </Link>
              <Link
                href="/work"
                className="inline-flex items-center justify-center h-11 px-6 text-[11px] tracking-widest uppercase border border-white/12 text-white/55 rounded-sm hover:border-white/20 hover:text-white transition-colors"
              >
                Browse Work
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
