import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase database connection initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('⚠️ Supabase URL or Key not set. Running in database-free stateless mode.');
}

/**
 * Persist user and their newly generated API key to Supabase
 */
export async function saveUserApiKey(email, name, apiKey, expiresAt) {
  if (!supabase) return { success: false, mode: 'stateless' };

  try {
    // 1. Find or insert user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create one
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ name, email }])
        .select('id')
        .single();

      if (createError) throw createError;
      user = newUser;
    } else if (userError) {
      throw userError;
    }

    // 2. Insert new API key linked to user
    const { error: keyError } = await supabase
      .from('api_keys')
      .insert([{
        user_id: user.id,
        api_key: apiKey,
        expires_at: expiresAt
      }]);

    if (keyError) throw keyError;

    console.log(`💾 Successfully logged developer credentials to Supabase for ${email}`);
    return { success: true, mode: 'database' };
  } catch (err) {
    console.error('❌ Supabase database write operation failed:', err.message);
    return { success: false, error: err.message };
  }
}
