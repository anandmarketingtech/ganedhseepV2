// Supabase Configuration
export const supabaseUrl = 'https://noitlxnwyvmtlasczlgr.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaXRseG53eXZtdGxhc2N6bGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1Mzk1OTEsImV4cCI6MjA2NTExNTU5MX0.REJfwVYPAR6gLgbMJRj-C8hfY_BT0F4Bc22F1eFfQOE';

// Initialize Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(supabaseUrl, supabaseKey);

// Export functions
export {
    supabase
}; 