import { supabase } from './supabaseClient';
import { memberService } from './memberService';

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Buscar o perfil do membro associado ao e-mail
    const profile = await memberService.getByEmail(email);
    
    return {
      session: data.session,
      user: data.user,
      profile: profile
    };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (session?.user?.email) {
      const profile = await memberService.getByEmail(session.user.email);
      return {
        session,
        user: session.user,
        profile
      };
    }
    
    return null;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};
