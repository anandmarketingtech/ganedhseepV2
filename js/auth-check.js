import { supabase } from './supabase-config.js';

const ADMIN_EMAILS = ['ganeshdeep@gmail.com'];

export async function enforceAuth() {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!session || sessionError) {
            window.location.replace('admin-login.html');
            return false;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user || !ADMIN_EMAILS.includes(user.email)) {
            window.location.replace('admin-login.html');
            return false;
        }

        // If all checks pass, show the content and hide loading
        document.getElementById('loading').style.display = 'none';
        document.getElementById('protectedContent').style.display = 'block';
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.replace('admin-login.html');
        return false;
    }
} 