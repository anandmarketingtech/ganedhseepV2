// Supabase Configuration
export const supabaseUrl = 'https://ivzudwuqqgfpipytwwre.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2enVkd3VxcWdmcGlweXR3d3JlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTI2NDMwMSwiZXhwIjoyMDY2ODQwMzAxfQ.OYoCU2NozmDFIhiQ3dDqJIsl1oO9mHlonT_qp6maiKs';

// Initialize Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(supabaseUrl, supabaseKey);

// Export functions
export {
    supabase,
}; 