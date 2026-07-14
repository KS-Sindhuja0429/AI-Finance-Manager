export default function Loader({ fullscreen = false, label = "Loading" }) {
  const content = (
    <div className="flex flex-col items-center gap-3">
      <svg width="64" height="24" viewBox="0 0 64 24" className="text-pulse">
        <polyline
          points="0,12 14,12 19,2 25,22 30,12 64,12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-pulseline"
        />
      </svg>
      <p className="text-sm text-mist-400">{label}…</p>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-ink-900">
        {content}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-12">{content}</div>;
}
