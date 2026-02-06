'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body className="bg-navy text-white min-h-screen flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold mb-4">Critical System Error</h2>
                    <p className="mb-4 text-gray-400">Global application handler caught an exception.</p>
                    <button
                        onClick={() => reset()}
                        className="px-4 py-2 bg-white/10 rounded hover:bg-white/20"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
