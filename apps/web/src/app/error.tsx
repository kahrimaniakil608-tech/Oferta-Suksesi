"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      className="mx-auto max-w-xl p-8 text-center space-y-4"
    >
      <h1 className="text-2xl font-bold">Nuk mund t’i ngarkojmë të dhënat</h1>
      <p>
        Shërbimi është përkohësisht i padisponueshëm. Provo përsëri pas pak.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary text-white px-4 py-2"
      >
        Provo përsëri
      </button>
    </section>
  );
}
