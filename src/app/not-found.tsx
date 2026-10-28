import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="grain mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-24">
      <p className="num text-sm text-muted">404</p>
      <h1 className="hero-heading mt-2 text-4xl font-semibold">This page isn&apos;t on the map</h1>
      <p className="mt-4 max-w-prose text-muted">
        The link may be old, or the company may be listed under a different name. Search the Money Graph, or browse a company page from there.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link href="/graph" className="rounded-lg bg-white px-3 py-2 font-semibold text-black hover:bg-white/90">
          Open the Money Graph
        </Link>
        <Link href="/energy" className="rounded-lg px-3 py-2 text-muted hover:bg-white/5 hover:text-fg">
          See the Energy Map
        </Link>
      </div>
    </main>
  );
}
