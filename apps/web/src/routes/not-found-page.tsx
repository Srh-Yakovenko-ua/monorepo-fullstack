import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/use-page-title";

export function NotFoundPage() {
  usePageTitle("Not found");
  return (
    <main className="relative flex flex-1 flex-col px-6 pb-10 md:px-12 md:pb-14 lg:px-20 lg:pb-16 2xl:px-28 2xl:pb-20">
      <section className="mt-20 flex-1 md:mt-28 lg:mt-32">
        <p className="animate-in font-mono text-[10px] tracking-[0.26em] text-muted-foreground uppercase duration-700 fill-mode-both fade-in slide-in-from-bottom-2">
          Error · 404
        </p>

        <h1
          className="mt-5 animate-in font-display text-[clamp(3.75rem,9.5vw,16rem)] leading-[0.86] font-semibold delay-100 duration-700 fill-mode-both fade-in slide-in-from-bottom-3"
          style={{ letterSpacing: "-0.038em" }}
        >
          Not found
          <span className="text-primary">.</span>
        </h1>

        <p className="mt-8 max-w-xl animate-in text-base leading-relaxed text-muted-foreground delay-200 duration-700 fill-mode-both fade-in slide-in-from-bottom-3 md:text-lg">
          The page you tried to reach doesn&rsquo;t exist on this server. It may have moved, or you
          followed a stale link.
        </p>
      </section>

      <footer className="mt-12 flex flex-col items-start justify-between gap-5 border-t border-border pt-8 md:mt-16 md:flex-row md:items-center">
        <Button
          asChild
          className="h-11 px-5 font-mono text-[10px] tracking-[0.22em] uppercase"
          variant="outline"
        >
          <Link to="/">
            <ArrowLeft className="mr-2 size-3.5" />
            Back home
          </Link>
        </Button>

        <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
          Express + MongoDB · phase 1
        </p>
      </footer>
    </main>
  );
}
