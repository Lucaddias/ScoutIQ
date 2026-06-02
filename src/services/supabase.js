/**
 * Re-export do cliente Supabase para manter compatibilidade com imports via `services/`.
 * A configuração real está em `lib/supabase.js`.
 * @module services/supabase
 */

export { supabase } from '../lib/supabase.js';
