'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-navy flex items-center justify-center p-4">
            <div className="bg-alertRed/10 border border-alertRed/30 p-8 rounded-xl max-w-md w-full text-center">
                <AlertCircle className="text-alertRed mx-auto mb-4" size={48} />
                <h2 className="text-2xl font-bold text-white mb-2">Something went wrong!</h2>
                <p className="text-gray-400 mb-6 text-sm">
                    {error.message || "An unexpected error occurred."}
                </p>
                <button
                    onClick={reset}
                    className="flex items-center justify-center gap-2 w-full px-6 py-2 bg-alertRed/20 text-alertRed border border-alertRed/30 rounded-lg hover:bg-alertRed/30 transition-colors"
                >
                    <RefreshCw size={16} />
                    Try Again
                </button>
            </div>
        </div>
    );
}
