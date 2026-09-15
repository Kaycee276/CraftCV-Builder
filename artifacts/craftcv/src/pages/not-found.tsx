import { ArrowLeft, CircleAlert } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="grain flex min-h-[100dvh] items-center justify-center bg-[#f4f0e8] px-5">
      <div className="w-full max-w-lg text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fbebe6] text-[#b94b43]">
          <CircleAlert size={24} />
        </span>
        <p className="mt-7 font-mono-ui text-[11px] uppercase tracking-[.2em] text-[#d86a4a]">A page went missing</p>
        <h1 className="mt-3 font-display text-6xl font-semibold tracking-[-.06em] text-[#25363a]">Not found.</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#697674]">This is not the part of the workspace you were looking for. Let’s get you back to the story.</p>
        <Link href="/" className="mx-auto mt-7 inline-flex items-center gap-2 rounded-xl bg-[#25363a] px-4 py-3 text-sm font-semibold text-[#f7f0e4] transition-transform hover:-translate-y-0.5" data-testid="link-not-found-home">
          <ArrowLeft size={16} /> Back to CraftCV
        </Link>
      </div>
    </div>
  );
}
