import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleAlert,
  Download,
  FileText,
  History,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  getGetCvQueryKey,
  getListCvsQueryKey,
  getListMessagesQueryKey,
  useDeleteAccount,
  useDeleteCv,
  useGenerateCv,
  useGetCurrentUser,
  useGetCv,
  useListCvs,
  useListMessages,
  useSendChatMessage,
  useSignIn,
  useSignOut,
  useSignUp,
  type Cv,
  type CvData,
  type Message,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import './index.css';

const queryClient = new QueryClient();

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" data-testid="link-logo">
      <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${inverse ? 'bg-[#e78062] text-[#fff7ed]' : 'bg-[#d86a4a] text-[#fff7ed]'} shadow-sm`}>
        <span className="font-display text-lg leading-none">C</span>
      </span>
      <span className={`font-display text-[22px] font-semibold tracking-[-.03em] ${inverse ? 'text-[#f7f0e4]' : 'text-[#25363a]'}`}>CraftCV</span>
    </Link>
  );
}

function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'outline' | 'danger' }) {
  const variants = {
    primary: 'bg-[#d86a4a] text-[#fff7ed] shadow-[0_4px_0_#ad4931] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#ad4931] active:translate-y-0 active:shadow-[0_2px_0_#ad4931]',
    quiet: 'bg-transparent text-[#496067] hover:bg-[#e9e4da] hover:text-[#25363a]',
    outline: 'border border-[#cfc7b9] bg-[#f8f4ec] text-[#31474b] hover:border-[#d86a4a] hover:text-[#b65339]',
    danger: 'bg-[#b94b43] text-[#fff7ed] hover:bg-[#a23d37]',
  };
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d86a4a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f0e8] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block" data-testid={`field-${name}`}>
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-[#667579]">{label}</span>
      <input
        data-testid={`input-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="h-12 w-full rounded-xl border border-[#cec7ba] bg-[#fbf8f1] px-4 text-[15px] text-[#25363a] outline-none transition-shadow placeholder:text-[#9b9d96] focus:border-[#d86a4a] focus:ring-4 focus:ring-[#d86a4a]/10"
      />
    </label>
  );
}

function PublicNav() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-10">
      <Logo />
      <nav className="hidden items-center gap-7 text-sm font-semibold text-[#5f6e70] md:flex">
        <a href="#how-it-works" className="transition-colors hover:text-[#d86a4a]" data-testid="link-how-it-works">How it works</a>
        <a href="#principles" className="transition-colors hover:text-[#d86a4a]" data-testid="link-principles">Our approach</a>
        <Link href="/signin" className="transition-colors hover:text-[#d86a4a]" data-testid="link-nav-signin">Sign in</Link>
        <Link href="/signup" className="rounded-xl bg-[#25363a] px-4 py-2.5 text-[#f7f0e4] shadow-sm transition-transform hover:-translate-y-0.5" data-testid="link-nav-signup">Start your CV</Link>
      </nav>
      <Link href="/signup" className="rounded-xl bg-[#25363a] px-3.5 py-2.5 text-xs font-semibold text-[#f7f0e4] md:hidden" data-testid="link-mobile-start">Start</Link>
    </header>
  );
}

function Home() {
  return (
    <div className="grain min-h-[100dvh] overflow-hidden bg-[#f4f0e8]">
      <PublicNav />
      <main>
        <section className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-12 px-5 pb-20 pt-14 md:grid-cols-[1.02fr_.98fr] md:px-10 md:pb-28 md:pt-20">
          <div className="relative z-10 animate-rise">
            <p className="mb-6 flex items-center gap-2 font-mono-ui text-[11px] font-medium uppercase tracking-[.2em] text-[#d86a4a]"><span className="h-px w-8 bg-[#d86a4a]" />A quieter way to apply</p>
            <h1 className="max-w-[680px] font-display text-[clamp(3.6rem,8vw,7.4rem)] font-semibold leading-[.88] tracking-[-.065em] text-[#25363a]">Your story,<br /><span className="text-[#d86a4a]">well told.</span></h1>
            <p className="mt-8 max-w-[510px] text-lg leading-8 text-[#5e6c6c] md:text-xl">Talk through the work that shaped you. CraftCV listens for the thread, then turns your experience into a CV that sounds like you on your best day.</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/signup" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#d86a4a] px-5 text-sm font-bold text-[#fff7ed] shadow-[0_4px_0_#ad4931] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_0_#ad4931]" data-testid="link-hero-signup">Begin your story <ArrowRight size={17} /></Link>
              <a href="#how-it-works" className="inline-flex items-center gap-2 px-2 text-sm font-semibold text-[#496067] hover:text-[#d86a4a]" data-testid="link-hero-how">See how it works <ChevronRight size={16} /></a>
            </div>
            <div className="mt-12 flex items-center gap-3 text-xs text-[#7a8581]"><LockKeyhole size={15} className="text-[#81958b]" /><span>Private by design. Your career story stays yours.</span></div>
          </div>
          <div className="relative animate-rise [animation-delay:120ms]">
            <div className="absolute -right-8 -top-10 h-44 w-44 rounded-full bg-[#e6cf8d]/50 blur-3xl" />
            <div className="relative mx-auto max-w-[510px] rotate-[2.5deg] rounded-[2px] bg-[#fffdf7] p-7 shadow-[14px_20px_0_rgba(37,54,58,.10),0_25px_50px_rgba(37,54,58,.10)] md:p-10">
              <div className="flex items-start justify-between border-b border-[#ded8ca] pb-5"><div><p className="font-display text-3xl font-semibold text-[#25363a]">Mara Ellis</p><p className="mt-1 font-mono-ui text-[9px] uppercase tracking-[.18em] text-[#d86a4a]">Product writer · systems thinker</p></div><span className="font-mono-ui text-[9px] text-[#8a918c]">CRAFT / 01</span></div>
              <div className="grid grid-cols-[1.25fr_.75fr] gap-7 pt-6 text-[10px] leading-[1.65] text-[#65716d]"><div><p className="mb-2 font-mono-ui text-[9px] uppercase tracking-[.16em] text-[#25363a]">The throughline</p><p>Turns complicated products into language people can use. Eight years making the invisible legible across health, climate, and financial tools.</p><div className="mt-7"><p className="mb-2 font-mono-ui text-[9px] uppercase tracking-[.16em] text-[#25363a]">Experience</p><div className="mb-4 border-l-2 border-[#d86a4a] pl-3"><p className="font-semibold text-[#405356]">Lead Content Designer</p><p>Northstar Labs · 2021 — now</p></div><div className="border-l-2 border-[#c7d5cb] pl-3"><p className="font-semibold text-[#405356]">Senior Writer</p><p>Fieldwork · 2018 — 2021</p></div></div></div><div><p className="mb-2 font-mono-ui text-[9px] uppercase tracking-[.16em] text-[#25363a]">Strengths</p><p>Editorial systems<br />Product strategy<br />Voice & tone<br />Team facilitation</p><p className="mb-2 mt-8 font-mono-ui text-[9px] uppercase tracking-[.16em] text-[#25363a]">Based in</p><p>Oakland, CA<br />mara@craftmail.co</p></div></div>
              <div className="mt-7 flex items-center justify-between border-t border-[#ded8ca] pt-4"><span className="font-mono-ui text-[9px] text-[#9b9d96]">A living document</span><span className="h-2 w-2 rounded-full bg-[#d86a4a]" /></div>
            </div>
            <div className="absolute -bottom-10 -left-3 flex -rotate-3 items-center gap-3 rounded-2xl border border-[#c7d5cb] bg-[#e9f0e9] px-4 py-3 text-xs font-semibold text-[#49635b] shadow-lg"><Sparkles size={15} /><span>Shaped with a little help</span></div>
          </div>
        </section>
        <section id="how-it-works" className="border-y border-[#d8d1c3] bg-[#eee8dc]">
          <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
            <div className="grid gap-10 md:grid-cols-[.7fr_1.3fr]"><div><p className="font-mono-ui text-[11px] uppercase tracking-[.18em] text-[#d86a4a]">A conversation, not a questionnaire</p><h2 className="mt-4 max-w-sm font-display text-4xl font-semibold leading-[.98] tracking-[-.04em] text-[#25363a] md:text-5xl">Start where the good stories start.</h2></div><div className="grid gap-10 md:grid-cols-3"><Step n="01" icon={<MessageCircle size={19} />} title="Tell it plainly" copy="Talk about what you did, what changed, and what you learned. No polished language required." /><Step n="02" icon={<Sparkles size={19} />} title="Find the thread" copy="CraftCV asks thoughtful follow-ups and spots the signal in the details you almost skipped." /><Step n="03" icon={<FileText size={19} />} title="Take it with you" copy="Get a considered CV you can edit, save as a version, and bring to your next conversation." /></div></div>
          </div>
        </section>
        <section id="principles" className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <div className="grid items-end gap-10 md:grid-cols-[1fr_.75fr]"><div><p className="font-mono-ui text-[11px] uppercase tracking-[.18em] text-[#d86a4a]">The CraftCV promise</p><h2 className="mt-4 max-w-xl font-display text-5xl font-semibold leading-[.94] tracking-[-.05em] text-[#25363a] md:text-7xl">Useful is a kind of beautiful.</h2></div><div className="border-l-2 border-[#d86a4a] pl-5 text-base leading-7 text-[#65716d]">No templates that make every career look the same. No performance of confidence. Just a private workspace for making your experience easier to see.</div></div>
          <div className="mt-20 grid border-y border-[#d8d1c3] md:grid-cols-3"><Promise icon={<LockKeyhole />} title="Private" copy="Your conversations and CV versions belong to you. We keep the room quiet." /><Promise icon={<BookOpen />} title="Human" copy="The language stays grounded in your actual work, not empty career-speak." /><Promise icon={<BriefcaseBusiness />} title="Ready" copy="A clear, flexible document built for the next application, introduction, or brave step." /></div>
        </section>
        <section className="bg-[#25363a] px-5 py-20 text-[#f7f0e4] md:px-10 md:py-28"><div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 md:flex-row md:items-end"><div><p className="font-mono-ui text-[11px] uppercase tracking-[.18em] text-[#e6cf8d]">Your next chapter has a starting point</p><h2 className="mt-4 max-w-2xl font-display text-5xl font-semibold leading-[.92] tracking-[-.05em] md:text-7xl">Bring the rough draft.</h2></div><Link href="/signup" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#e78062] px-5 text-sm font-bold text-[#fff7ed] transition-transform hover:-translate-y-0.5" data-testid="link-footer-signup">Make it a CV <ArrowUpRight size={17} /></Link></div></section>
      </main>
      <footer className="flex flex-col justify-between gap-3 bg-[#25363a] px-5 pb-7 text-xs text-[#a7b5ae] md:flex-row md:px-10"><span>© 2025 CraftCV</span><span className="font-mono-ui text-[10px] uppercase tracking-[.14em]">A calmer way forward</span></footer>
    </div>
  );
}

function Step({ n, icon, title, copy }: { n: string; icon: ReactNode; title: string; copy: string }) {
  return <div className="animate-rise"><div className="flex items-center justify-between text-[#d86a4a]"><span className="font-mono-ui text-[11px]">{n}</span><span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d86a4a]/40">{icon}</span></div><h3 className="mt-7 font-display text-2xl font-semibold text-[#25363a]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#687673]">{copy}</p></div>;
}

function Promise({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <div className="border-b border-[#d8d1c3] py-8 md:border-b-0 md:border-r md:px-8 md:py-10 first:pl-0 last:border-r-0"><span className="text-[#d86a4a]">{icon}</span><h3 className="mt-5 font-display text-2xl font-semibold">{title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#687673]">{copy}</p></div>;
}

function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const [, setLocation] = useLocation();
  const signIn = useSignIn();
  const signUp = useSignUp();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmation: '' });
  const isSignup = mode === 'signup';
  const pending = signIn.isPending || signUp.isPending;
  const error = signIn.error || signUp.error;
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isSignup && form.password !== form.confirmation) return;
    if (isSignup) {
      signUp.mutate({ data: { full_name: form.full_name, email: form.email, password: form.password } }, { onSuccess: () => setLocation('/chat') });
    } else {
      signIn.mutate({ data: { email: form.email, password: form.password } }, { onSuccess: () => setLocation('/chat') });
    }
  };
  return (
    <div className="grain grid min-h-[100dvh] bg-[#f4f0e8] md:grid-cols-[.82fr_1.18fr]">
      <aside className="relative hidden overflow-hidden bg-[#25363a] p-10 text-[#f7f0e4] md:block"><div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full border border-[#e78062]/25" /><div className="absolute -bottom-8 -left-2 h-48 w-48 rounded-full border border-[#e78062]/20" /><Logo inverse /><div className="relative mt-[24vh] max-w-sm"><p className="font-mono-ui text-[11px] uppercase tracking-[.2em] text-[#e6cf8d]">A private editorial workspace</p><h1 className="mt-5 font-display text-6xl font-semibold leading-[.9] tracking-[-.05em]">The best version of your story is already in you.</h1><p className="mt-7 text-sm leading-6 text-[#b7c3bc]">CraftCV gives it room to surface, then helps you put it into words that open doors.</p></div><div className="absolute bottom-10 left-10 font-mono-ui text-[10px] uppercase tracking-[.16em] text-[#779087]">No templates. No noise.</div></aside>
      <main className="flex items-center justify-center px-5 py-10"><div className="w-full max-w-[420px] animate-rise"><div className="mb-12 flex items-center justify-between md:hidden"><Logo /><Link href="/" className="text-sm font-semibold text-[#5e6c6c]" data-testid="link-auth-home">Back home</Link></div><div className="mb-8"><p className="font-mono-ui text-[11px] uppercase tracking-[.18em] text-[#d86a4a]">{isSignup ? 'Make some room' : 'Welcome back'}</p><h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-.045em] text-[#25363a]">{isSignup ? 'Start with the story.' : 'Good to see you.'}</h1><p className="mt-4 text-sm leading-6 text-[#697674]">{isSignup ? 'Your next CV begins with a conversation, not a blank form.' : 'Your workspace is waiting where you left it.'}</p></div>{error ? <div className="mb-5 flex gap-3 rounded-xl border border-[#e2b9ad] bg-[#fbebe6] p-3 text-sm text-[#a23d37]" data-testid="status-auth-error"><CircleAlert size={17} className="mt-0.5 shrink-0" /><span>{String((error as Error).message || 'Something went wrong. Please try again.')}</span></div> : null}{isSignup && form.password !== form.confirmation && form.confirmation ? <p className="mb-4 text-sm text-[#b94b43]" data-testid="status-password-mismatch">Passwords do not match.</p> : null}<form className="space-y-5" onSubmit={submit}>{isSignup ? <Field label="Full name" name="full-name" value={form.full_name} onChange={update('full_name')} placeholder="How should your CV introduce you?" autoComplete="name" /> : null}<Field label="Email" name="email" type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" autoComplete="email" /><Field label="Password" name="password" type="password" value={form.password} onChange={update('password')} placeholder={isSignup ? 'At least 8 characters' : 'Your password'} autoComplete={isSignup ? 'new-password' : 'current-password'} />{isSignup ? <Field label="Confirm password" name="confirmation" type="password" value={form.confirmation} onChange={update('confirmation')} placeholder="One more time" autoComplete="new-password" /> : null}<Button type="submit" disabled={pending || (!!isSignup && form.password !== form.confirmation)} className="mt-3 w-full" data-testid={`button-submit-${mode}`}>{pending ? <LoaderCircle size={17} className="animate-spin" /> : null}{pending ? 'Opening your workspace…' : isSignup ? 'Create my workspace' : 'Sign in'}</Button></form><p className="mt-8 text-center text-sm text-[#697674]">{isSignup ? 'Already have a workspace? ' : 'New to CraftCV? '}<Link href={isSignup ? '/signin' : '/signup'} className="font-bold text-[#d86a4a] hover:underline" data-testid={`link-switch-${mode}`}>{isSignup ? 'Sign in' : 'Create an account'}</Link></p><p className="mt-10 flex items-center justify-center gap-2 text-center text-[11px] text-[#8b948f]"><LockKeyhole size={13} /> Your information is kept private.</p></div></main>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const current = useGetCurrentUser();
  const signOut = useSignOut();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!current.isLoading && (current.isError || !current.data)) setLocation('/signin');
  }, [current.isLoading, current.isError, current.data, setLocation]);
  if (current.isLoading || (!current.data && !current.isError)) return <LoadingPage label="Setting up your workspace" />;
  if (current.isError || !current.data) return null;
  const initials = current.data.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const nav = [{ href: '/chat', label: 'Conversation', icon: MessageCircle }, { href: '/history', label: 'Saved CVs', icon: History }, { href: '/settings', label: 'Settings', icon: SettingsIcon }];
  const logout = () => signOut.mutate(undefined, { onSuccess: () => setLocation('/') });
  return (
    <div className="grain h-[100dvh] max-h-[100dvh] bg-[#f4f0e8] lg:grid lg:grid-cols-[248px_1fr] overflow-hidden">
      <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-[#25363a] p-5 text-[#f7f0e4] transition-transform duration-300 lg:static lg:translate-x-0 h-full`}><div className="flex items-center justify-between"><Logo inverse /><button type="button" className="rounded-lg p-2 text-[#a7b5ae] hover:bg-[#31484c] lg:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X size={19} /></button></div><div className="mt-12"><p className="px-3 font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#779087]">Your workspace</p><nav className="mt-3 space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${location === href ? 'bg-[#3c5558] text-[#f7f0e4]' : 'text-[#a7b5ae] hover:bg-[#31484c] hover:text-[#f7f0e4]'}`} data-testid={`link-sidebar-${label.toLowerCase().replace(' ', '-')}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{location === href ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#e78062]" /> : null}</Link>)}</nav></div><div className="mt-auto border-t border-[#3b5052] pt-4"><div className="flex items-center gap-3 px-3 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d86a4a] font-mono-ui text-[11px] font-semibold text-[#fff7ed]">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{current.data.full_name}</p><p className="truncate text-[11px] text-[#91a39b]">{current.data.email}</p></div></div><button type="button" onClick={logout} disabled={signOut.isPending} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#a7b5ae] transition-colors hover:bg-[#31484c] hover:text-[#f7f0e4]" data-testid="button-signout"><LogOut size={17} />Sign out</button></div></aside>
      {mobileOpen ? <button className="fixed inset-0 z-30 bg-[#25363a]/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-overlay-menu" /> : null}
      <div className="min-w-0 flex flex-col h-full overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-[#ddd5c7] bg-[#f4f0e8]/90 px-5 backdrop-blur-md md:px-9"><button type="button" className="rounded-lg p-2 text-[#496067] hover:bg-[#e9e4da] lg:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu size={21} /></button><div className="hidden text-sm font-semibold text-[#65716d] lg:block">{location === '/chat' ? 'A room to think out loud' : location === '/history' ? 'Your saved work' : 'Workspace settings'}</div><div className="ml-auto flex items-center gap-3"><span className="hidden text-right text-xs text-[#65716d] sm:block"><span className="block font-semibold text-[#31474b]">{current.data.full_name}</span><span>CraftCV workspace</span></span><span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#cfbfa9] bg-[#efe4d0] font-mono-ui text-[11px] font-semibold text-[#8c523e]">{initials}</span></div></header>
        <main className={`mx-auto w-full max-w-[1440px] px-5 md:px-9 ${location === '/chat' ? 'flex-1 min-h-0 py-4 overflow-hidden flex flex-col' : 'py-7 md:py-10 overflow-y-auto flex-1'}`}>{children}</main>
      </div>
    </div>
  );
}

function LoadingPage({ label = 'Loading' }: { label?: string }) {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4f0e8]"><div className="w-full max-w-sm px-6" data-testid="status-loading"><div className="h-2 w-full overflow-hidden rounded-full bg-[#ded8ca]"><div className="h-full w-1/2 animate-pulse-soft rounded-full bg-[#d86a4a]" /></div><p className="mt-4 text-center font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#77837d]">{label}</p></div></div>;
}

function ErrorState({ onRetry, title = 'The room went quiet', copy = 'We could not load this part of your workspace.' }: { onRetry: () => void; title?: string; copy?: string }) {
  return <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[#e2b9ad] bg-[#fbebe6] p-8 text-center" data-testid="status-error"><CircleAlert className="text-[#b94b43]" size={25} /><h2 className="mt-4 font-display text-2xl font-semibold text-[#713c38]">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#8b5952]">{copy}</p><Button variant="outline" className="mt-5" onClick={onRetry} data-testid="button-retry"><RefreshCw size={15} />Try again</Button></div>;
}

function ChatPage() {
  const queryClient = useQueryClient();
  const messagesQuery = useListMessages();
  const send = useSendChatMessage();
  const generate = useGenerateCv();
  const [draft, setDraft] = useState('');
  const [cv, setCv] = useState<Cv | null>(null);
  const [mobilePreview, setMobilePreview] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const messages = messagesQuery.data ?? [];
  const sorted = useMemo(() => [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sorted.length, send.isPending]);

  const submit = (event?: FormEvent) => {
    if (event) event.preventDefault();
    const content = draft.trim();
    if (!content || send.isPending) return;
    setDraft('');
    send.mutate({ data: { content } }, { onSuccess: (reply) => queryClient.setQueryData<Message[]>(getListMessagesQueryKey(), (old = []) => [...old, reply.user_message, reply.assistant_message]) });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const makeCv = () => generate.mutate({ data: { messages: sorted } }, { onSuccess: (result) => { setCv(result); queryClient.invalidateQueries({ queryKey: getListCvsQueryKey() }); } });

  return (
    <div className="animate-fade flex flex-col h-full min-h-0 overflow-hidden">
      <div className="mb-4 shrink-0 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[.18em] text-[#d86a4a]">The conversation</p>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-none tracking-[-.045em] text-[#25363a] md:text-4xl">Tell me about the work.</h1>
          <p className="mt-2 max-w-xl text-xs leading-5 text-[#697674]">Start anywhere. I’ll ask the next useful question and keep track of the details that make your experience yours.</p>
        </div>
        <button type="button" onClick={() => setMobilePreview((value) => !value)} className="inline-flex items-center gap-2 self-start rounded-xl border border-[#cfc7b9] bg-[#faf6ee] px-4 py-2.5 text-sm font-semibold text-[#496067] lg:hidden" data-testid="button-toggle-preview">
          <FileText size={16} />{mobilePreview ? 'Hide CV preview' : 'Show CV preview'}
        </button>
      </div>
      <div className="grid flex-1 min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.83fr)] overflow-hidden">
        <section className={`${mobilePreview ? 'hidden lg:flex' : 'flex'} flex-col h-full min-h-0 rounded-2xl border border-[#d8d1c3] bg-[#eee8dc] p-4 shadow-[0_8px_24px_rgba(37,54,58,.05)] md:p-6 overflow-hidden`}>
          <div className="flex shrink-0 items-center justify-between border-b border-[#d8d1c3] pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#31474b]">
              <span className="h-2 w-2 animate-pulse-soft rounded-full bg-[#d86a4a]" />Live conversation
            </div>
            <span className="font-mono-ui text-[10px] text-[#89918b]">{sorted.length} {sorted.length === 1 ? 'note' : 'notes'}</span>
          </div>
          <div className="flex-1 min-h-0 space-y-5 overflow-y-auto py-4 pr-1">
            {messagesQuery.isLoading ? (
              <div className="space-y-4" data-testid="status-messages-loading">
                <div className="h-14 w-4/5 animate-pulse rounded-2xl bg-[#e0d9cb]" />
                <div className="ml-auto h-12 w-3/5 animate-pulse rounded-2xl bg-[#d5e0d8]" />
                <div className="h-20 w-3/4 animate-pulse rounded-2xl bg-[#e0d9cb]" />
              </div>
            ) : messagesQuery.isError ? (
              <ErrorState onRetry={() => messagesQuery.refetch()} />
            ) : sorted.length === 0 ? (
              <div className="flex h-full min-h-[250px] flex-col items-center justify-center px-8 text-center" data-testid="empty-conversation">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dfe9df] text-[#607a6e]">
                  <MessageCircle size={23} />
                </span>
                <h2 className="mt-5 font-display text-2xl font-semibold text-[#31474b]">Let’s find your throughline.</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#71807a]">What is one piece of work you’re proud of? It can be a project, a problem you untangled, or a moment you changed the direction.</p>
              </div>
            ) : (
              sorted.map((message) => <MessageBubble key={message.id} message={message} />)
            )}
            {send.isPending ? (
              <div className="flex gap-3" data-testid="status-chat-loading">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dfe9df] text-[#607a6e]">
                  <Sparkles size={15} />
                </span>
                <div className="rounded-2xl rounded-tl-sm bg-[#f8f4ec] px-4 py-3 text-sm text-[#65716d]">
                  <span className="animate-pulse-soft">Thinking through that…</span>
                </div>
              </div>
            ) : null}
            {send.error ? <p className="text-sm text-[#b94b43]" data-testid="status-chat-error">That message could not be saved. Please try again.</p> : null}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={submit} className="relative shrink-0 border-t border-[#d8d1c3] pt-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              maxLength={1000}
              placeholder="Write it as you remember it…"
              className="w-full resize-none rounded-xl border border-[#cbc2b3] bg-[#faf7f0] p-4 pr-14 text-sm leading-6 text-[#25363a] outline-none placeholder:text-[#929b94] focus:border-[#d86a4a] focus:ring-4 focus:ring-[#d86a4a]/10"
              data-testid="input-chat-message"
            />
            <button type="submit" disabled={!draft.trim() || send.isPending} className="absolute bottom-5 right-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#d86a4a] text-[#fff7ed] transition-transform hover:-translate-y-0.5 disabled:opacity-40" data-testid="button-send-message">
              <ArrowUpRight size={18} />
            </button>
            <div className="mt-1 flex justify-between px-1 text-[10px] text-[#949a94]">
              <span>Press Enter to send.</span>
              <span>{draft.length}/1000</span>
            </div>
          </form>
        </section>
        <section className={`${mobilePreview ? 'flex' : 'hidden lg:flex'} flex-col h-full min-h-0 rounded-2xl border border-[#d8d1c3] bg-[#e5ded2] p-4 md:p-6 overflow-hidden`}>
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#d86a4a]">Your CV, in progress</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-[#25363a]">The page taking shape</h2>
            </div>
            <span className="rounded-full bg-[#dfe9df] px-2.5 py-1 font-mono-ui text-[9px] uppercase tracking-[.12em] text-[#607a6e]">{cv ? 'Saved' : 'Preview'}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <CvPreview cv={cv} />
          </div>
          <div className="mt-4 flex shrink-0 gap-2">
            {cv ? <Button variant="outline" className="flex-1" onClick={() => downloadCv(cv)} data-testid="button-download-generated"><Download size={15} />Download</Button> : null}
            <Button className="flex-1" disabled={sorted.length === 0 || generate.isPending} onClick={makeCv} data-testid="button-generate-cv">
              {generate.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generate.isPending ? 'Shaping your CV…' : cv ? 'Save a new version' : 'Generate my CV'}
            </Button>
          </div>
          {generate.error ? <p className="mt-2 text-center text-xs text-[#b94b43]" data-testid="status-generate-error">We couldn’t shape that version. Try again in a moment.</p> : null}
        </section>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const user = message.role === 'user';
  return <div className={`flex gap-3 ${user ? 'flex-row-reverse' : ''}`} data-testid={`message-${message.id}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${user ? 'bg-[#d8c6a9] text-[#755844]' : 'bg-[#dfe9df] text-[#607a6e]'}`}>{user ? <span className="font-mono-ui text-[10px]">YOU</span> : <Sparkles size={15} />}</span><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${user ? 'rounded-tr-sm bg-[#d8c6a9] text-[#4b4037]' : 'rounded-tl-sm bg-[#f8f4ec] text-[#4e5e5d]'}`}><p>{message.content}</p><p className={`mt-2 font-mono-ui text-[9px] ${user ? 'text-[#8c705a]' : 'text-[#89958e]'}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p></div></div>;
}

function CvPreview({ cv }: { cv: Cv | null }) {
  if (!cv) return <div className="flex min-h-[510px] flex-col items-center justify-center border border-dashed border-[#c4bbaa] bg-[#f5f0e7]/70 px-8 text-center" data-testid="empty-cv-preview"><span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d86a4a]/40 text-[#d86a4a]"><FileText size={20} /></span><p className="mt-5 max-w-[220px] font-display text-xl font-semibold leading-tight text-[#4c5c5b]">Your clear, considered CV will live here.</p><p className="mt-2 max-w-[245px] text-xs leading-5 text-[#82908a]">Keep talking. When you’re ready, we’ll make something you can take with you.</p></div>;
  return <CvDocument data={cv.cv_data} version={cv.version} />;
}

function CvDocument({ data, version }: { data: CvData; version?: number }) {
  return <article className="min-h-[510px] bg-[#fffdf7] p-5 text-[#334547] shadow-[0_8px_18px_rgba(37,54,58,.08)] md:p-7" data-testid="document-cv"><header className="border-b border-[#ded8ca] pb-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-3xl font-semibold leading-none tracking-[-.04em] text-[#25363a]">{data.full_name || 'Your name'}</h3><p className="mt-2 text-[10px] font-semibold uppercase tracking-[.13em] text-[#d86a4a]">{data.career_objective || 'Professional profile'}</p></div>{version ? <span className="font-mono-ui text-[9px] text-[#9ba29b]">V{version}</span> : null}</div><p className="mt-3 text-[10px] text-[#71807a]">{[data.email, data.phone, data.location, data.linkedin].filter(Boolean).join('  ·  ') || 'Contact details will appear here'}</p></header><CvSection title="Profile"><p className="text-[11px] leading-[1.65] text-[#60706e]">{data.career_objective || 'A concise statement of the value you bring and the kind of work you want to do next.'}</p></CvSection>{data.work_experience?.length ? <CvSection title="Experience">{data.work_experience.slice(0, 3).map((job, index) => <div key={`${job.company}-${index}`} className="mb-4 border-l-2 border-[#e78062] pl-3 last:mb-0"><div className="flex justify-between gap-2"><p className="text-[11px] font-bold text-[#405356]">{job.role || 'Role'} <span className="font-normal text-[#7b8782]">· {job.company || 'Company'}</span></p><span className="shrink-0 font-mono-ui text-[8px] text-[#8b948f]">{job.start_date} — {job.end_date || 'Present'}</span></div>{job.responsibilities?.length ? <ul className="mt-1 list-disc pl-3 text-[10px] leading-[1.55] text-[#687673]">{job.responsibilities.slice(0, 2).map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul> : null}</div>)}</CvSection> : null}<div className="grid gap-5 sm:grid-cols-2">{data.skills?.length ? <CvSection title="Skills"><p className="text-[10px] leading-5 text-[#687673]">{data.skills.join(' · ')}</p></CvSection> : null}{data.education?.length ? <CvSection title="Education">{data.education.slice(0, 2).map((item, index) => <p key={`${item.institution}-${index}`} className="text-[10px] leading-5 text-[#687673]"><strong className="text-[#405356]">{item.degree}</strong> · {item.institution} ({item.year})</p>)}</CvSection> : null}</div></article>;
}

function CvSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-5"><h4 className="mb-2 font-mono-ui text-[9px] font-medium uppercase tracking-[.17em] text-[#d86a4a]">{title}</h4>{children}</section>;
}

async function downloadCv(cv: Cv) {
  const data = cv.cv_data;
  const fileName = `${(data.full_name || 'craftcv').toLowerCase().replace(/\s+/g, '-')}-v${cv.version}.pdf`;
  const element = document.querySelector('[data-testid="document-cv"]') as HTMLElement | null;
  if (element) {
    try {
      const opt = {
        margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#fffdf7' },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const },
      };
      await html2pdf().set(opt).from(element).save();
      return;
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  }
  const text = `${data.full_name}\n${[data.email, data.phone, data.location, data.linkedin].filter(Boolean).join(' · ')}\n\nPROFILE\n${data.career_objective}\n\nEXPERIENCE\n${data.work_experience.map((item) => `${item.role} — ${item.company} (${item.start_date} — ${item.end_date})\n${item.responsibilities.map((entry) => `• ${entry}`).join('\n')}`).join('\n\n')}\n\nSKILLS\n${data.skills.join(' · ')}`;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${data.full_name || 'craftcv'}-v${cv.version}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function HistoryPage() {
  const cvs = useListCvs();
  const deleteCv = useDeleteCv();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const selected = useGetCv(selectedId ?? '', { query: { enabled: !!selectedId, queryKey: getGetCvQueryKey(selectedId ?? '') } });
  const remove = () => { if (!deleteId) return; deleteCv.mutate({ id: deleteId }, { onSuccess: () => { setDeleteId(null); cvs.refetch(); } }); };
  return <div className="animate-fade"><div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-mono-ui text-[11px] uppercase tracking-[.18em] text-[#d86a4a]">The archive</p><h1 className="mt-2 font-display text-5xl font-semibold leading-none tracking-[-.05em] text-[#25363a]">Saved CVs.</h1><p className="mt-3 text-sm leading-6 text-[#697674]">Every version is a snapshot of the story you were ready to tell.</p></div><Link href="/chat" className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl bg-[#d86a4a] px-4 text-sm font-semibold text-[#fff7ed] shadow-[0_3px_0_#ad4931] transition-transform hover:-translate-y-0.5" data-testid="link-create-new-cv"><Plus size={17} />Create a new version</Link></div>{cvs.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="status-history-loading">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-[#e6dfd2]" />)}</div> : cvs.isError ? <ErrorState onRetry={() => cvs.refetch()} /> : !cvs.data?.length ? <EmptyHistory /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cvs.data.map((cv) => <HistoryCard key={cv.id} cv={cv} onPreview={() => setSelectedId(cv.id)} onDelete={() => setDeleteId(cv.id)} />)}</div>}{selectedId ? <Modal title={`Version ${selected.data?.version ?? ''}`} onClose={() => setSelectedId(null)}><div className="max-h-[70vh] overflow-y-auto rounded-xl bg-[#e5ded2] p-3">{selected.isLoading ? <div className="h-96 animate-pulse bg-[#e2dbcf]" data-testid="status-preview-loading" /> : selected.isError ? <ErrorState onRetry={() => selected.refetch()} /> : selected.data ? <CvDocument data={selected.data.cv_data} version={selected.data.version} /> : null}</div>{selected.data ? <div className="mt-4 flex justify-end"><Button onClick={() => downloadCv(selected.data as Cv)} data-testid="button-download-preview"><Download size={16} />Download version</Button></div> : null}</Modal> : null}{deleteId ? <Modal title="Remove this version?" onClose={() => setDeleteId(null)}><p className="text-sm leading-6 text-[#697674]">This saved CV will be permanently removed. Your conversation will stay intact.</p><div className="mt-6 flex justify-end gap-2"><Button variant="quiet" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete-cv">Keep it</Button><Button variant="danger" disabled={deleteCv.isPending} onClick={remove} data-testid="button-confirm-delete-cv">{deleteCv.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}Remove version</Button></div></Modal> : null}</div>;
}

function HistoryCard({ cv, onPreview, onDelete }: { cv: Cv; onPreview: () => void; onDelete: () => void }) {
  return <article className="group rounded-2xl border border-[#d8d1c3] bg-[#faf7f0] p-4 transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_12px_26px_rgba(37,54,58,.09)]" data-testid={`card-cv-${cv.id}`}><button type="button" onClick={onPreview} className="block w-full text-left" data-testid={`button-preview-cv-${cv.id}`}><div className="mb-4 flex items-center justify-between"><span className="rounded-full bg-[#dfe9df] px-2.5 py-1 font-mono-ui text-[9px] uppercase tracking-[.12em] text-[#607a6e]">Version {cv.version}</span><span className="font-mono-ui text-[10px] text-[#909992]">{new Date(cv.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div><div className="min-h-[168px] border border-[#e2dbcf] bg-[#fffdf7] p-5"><p className="font-display text-2xl font-semibold leading-none text-[#25363a]">{cv.cv_data.full_name || 'Untitled CV'}</p><p className="mt-2 text-[10px] uppercase tracking-[.13em] text-[#d86a4a]">{cv.cv_data.career_objective || 'Professional profile'}</p><div className="mt-7 space-y-2">{[1, 2, 3].map((line) => <div key={line} className={`h-1.5 rounded-full bg-[#e3ded3] ${line === 2 ? 'w-4/5' : line === 3 ? 'w-3/5' : 'w-full'}`} />)}</div></div></button><div className="mt-4 flex items-center justify-between border-t border-[#e2dbcf] pt-3"><button type="button" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#496067] hover:text-[#d86a4a]" onClick={onPreview} data-testid={`button-open-cv-${cv.id}`}>Open preview <ArrowUpRight size={14} /></button><button type="button" className="rounded-lg p-2 text-[#89918b] hover:bg-[#f0e6df] hover:text-[#b94b43]" onClick={onDelete} aria-label={`Delete version ${cv.version}`} data-testid={`button-delete-cv-${cv.id}`}><Trash2 size={15} /></button></div></article>;
}

function EmptyHistory() {
  return <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfc7b9] bg-[#eee8dc] px-8 text-center" data-testid="empty-history"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dfe9df] text-[#607a6e]"><History size={23} /></span><h2 className="mt-5 font-display text-3xl font-semibold text-[#31474b]">Nothing saved yet.</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#71807a]">Your first version will appear here when the story starts to feel like a CV.</p><Link href="/chat" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#d86a4a] px-4 py-2.5 text-sm font-semibold text-[#fff7ed]" data-testid="link-empty-history-chat">Start a conversation <ArrowRight size={16} /></Link></div>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#25363a]/45 p-4 animate-fade" role="dialog" aria-modal="true" data-testid="modal-container"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#d8d1c3] bg-[#f4f0e8] p-5 shadow-[0_24px_70px_rgba(37,54,58,.25)] md:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-3xl font-semibold tracking-[-.04em] text-[#25363a]">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-[#697674] hover:bg-[#e9e4da]" aria-label="Close modal" data-testid="button-close-modal"><X size={19} /></button></div>{children}</div></div>;
}

function SettingsPage() {
  const current = useGetCurrentUser();
  const deleteAccount = useDeleteAccount();
  const [, setLocation] = useLocation();
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState('');
  const remove = () => deleteAccount.mutate(undefined, { onSuccess: () => setLocation('/') });
  return <div className="animate-fade max-w-3xl"><div className="mb-9"><p className="font-mono-ui text-[11px] uppercase tracking-[.18em] text-[#d86a4a]">The room</p><h1 className="mt-2 font-display text-5xl font-semibold leading-none tracking-[-.05em] text-[#25363a]">Settings.</h1><p className="mt-3 text-sm leading-6 text-[#697674]">A few details about the person behind the story.</p></div><section className="rounded-2xl border border-[#d8d1c3] bg-[#faf7f0] p-5 md:p-7" data-testid="section-account-details"><div className="flex items-start gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#dfe9df] text-[#607a6e]"><SettingsIcon size={20} /></span><div><h2 className="font-display text-2xl font-semibold text-[#31474b]">Account details</h2><p className="mt-1 text-sm text-[#7a8580]">This is how CraftCV knows who to introduce.</p></div></div><div className="mt-7 grid gap-5 sm:grid-cols-2"><div><p className="mb-2 font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#89918b]">Full name</p><p className="text-sm font-semibold text-[#31474b]" data-testid="text-settings-name">{current.data?.full_name || 'Loading'}</p></div><div><p className="mb-2 font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#89918b]">Email</p><p className="text-sm font-semibold text-[#31474b]" data-testid="text-settings-email">{current.data?.email || 'Loading'}</p></div></div></section><section className="mt-5 rounded-2xl border border-[#e2b9ad] bg-[#fbebe6] p-5 md:p-7" data-testid="section-danger-zone"><div className="flex items-start gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3d2c9] text-[#b94b43]"><Trash2 size={20} /></span><div><h2 className="font-display text-2xl font-semibold text-[#713c38]">Leave CraftCV</h2><p className="mt-1 max-w-lg text-sm leading-6 text-[#8b5952]">Permanently delete your account, conversations, and saved CV versions. This cannot be undone.</p></div></div><Button variant="danger" className="mt-6" onClick={() => setConfirm(true)} data-testid="button-open-delete-account">Delete my account</Button></section>{confirm ? <Modal title="Are you sure?" onClose={() => setConfirm(false)}><p className="text-sm leading-6 text-[#697674]">This will permanently remove your account and everything you created with CraftCV. Type <strong className="font-mono-ui text-[#31474b]">DELETE</strong> to continue.</p><input value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Type DELETE" className="mt-5 h-12 w-full rounded-xl border border-[#d5b1a8] bg-[#fff8f5] px-4 font-mono-ui text-sm text-[#713c38] outline-none focus:border-[#b94b43] focus:ring-4 focus:ring-[#b94b43]/10" data-testid="input-confirm-delete-account" /><div className="mt-6 flex justify-end gap-2"><Button variant="quiet" onClick={() => setConfirm(false)} data-testid="button-cancel-delete-account">Keep my account</Button><Button variant="danger" disabled={typed !== 'DELETE' || deleteAccount.isPending} onClick={remove} data-testid="button-confirm-delete-account">{deleteAccount.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}Delete permanently</Button></div></Modal> : null}</div>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route path="/signin">{() => <AuthPage mode="signin" />}</Route><Route path="/signup">{() => <AuthPage mode="signup" />}</Route><Route path="/chat">{() => <Shell><ChatPage /></Shell>}</Route><Route path="/history">{() => <Shell><HistoryPage /></Shell>}</Route><Route path="/settings">{() => <Shell><SettingsPage /></Shell>}</Route><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;