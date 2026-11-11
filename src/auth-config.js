// Public browser credentials. Authorization is enforced by Supabase policies.
// O acesso opcional mantém o módulo utilizável fora do Vite (testes em Node).
export const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://qkpgiwjsqtocvjmqinii.supabase.co';
export const supabaseKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-CT7iCR3355qijcVioyRkA_-Njn3Q4e';
