import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://thdvzgzbyqkxrptvyyqq.supabase.co') as string;
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_fDeoIkFZDgI5DOW_GHl9Vw_aOwNqybs') as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Polyfill/Helper to handle URL session parsing inside React Native / Expo environment
(supabase.auth as any).getSessionFromUrl = async (urlStr: string) => {
  try {
    const getParam = (name: string) => {
      const regex = new RegExp('[?&#]' + name + '=([^&#]*)');
      const results = regex.exec(urlStr);
      return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : null;
    };

    const code = getParam('code');
    if (code) {
      return await supabase.auth.exchangeCodeForSession(code);
    }

    const accessToken = getParam('access_token');
    const refreshToken = getParam('refresh_token');

    if (accessToken && refreshToken) {
      return await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    return { data: { session: null, user: null }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
};
