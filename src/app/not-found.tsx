import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-navy flex items-center justify-center p-4">
            <div className="bg-black/40 border border-gold/20 p-8 rounded-xl max-w-md w-full text-center">
                <AlertTriangle className="text-gold mx-auto mb-4" size={48} />
                <h2 className="text-2xl font-bold text-white mb-2">404 - Page Not Found</h2>
                <p className="text-gray-400 mb-6">The requested resource could not be found.</p>
                <Link
                    href="/"
                    className="inline-block px-6 py-2 bg-gold/10 text-gold border border-gold/30 rounded-lg hover:bg-gold/20 transition-colors"
                >
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
}
