import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="grain flex min-h-[100dvh] w-full items-center justify-center bg-[#f4f0e8] p-6">
      <div className="w-full max-w-lg text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fbebe6] text-[#b94b43]"><TriangleAlert size={24} /></span>
        <p className="mt-7 font-mono-ui text-[11px] uppercase tracking-[.2em] text-[#d86a4a]">A page lost its thread</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-.05em] text-[#25363a]">Let’s try that again.</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#697674]">This part of the workspace hit an unexpected snag. Your saved work is still safe.</p>
        {/* Dev only: messages can carry API responses and other internals. */}
        {import.meta.env.DEV ? (
          <pre className="mt-5 overflow-x-auto rounded-xl border border-[#e2b9ad] bg-[#fff8f5] p-3 text-left text-xs text-[#713c38]">
            {error.message || String(error)}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={resetError}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#25363a] px-4 py-3 text-sm font-semibold text-[#f7f0e4] transition-transform hover:-translate-y-0.5"
        >
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
