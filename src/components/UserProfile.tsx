'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { signout } from '@/app/auth/actions';

export function UserProfile() {
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();

        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser();
            setEmail(user?.email || null);
            setLoading(false);
        }

        getUser();
    }, []);

    if (loading) return <div className="animate-pulse w-8 h-8 bg-white/10 rounded-full"></div>;
    if (!email) return null;

    return (
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="flex flex-col items-end">
                <span className="text-xs text-xs text-gray-400">Welcome,</span>
                <span className="text-sm font-medium text-white max-w-[150px] truncate">{email}</span>
            </div>

            <form action={signout}>
                <button
                    type="submit"
                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                    title="Sign Out"
                >
                    <LogOut size={18} />
                </button>
            </form>
        </div>
    );
}
