import { supabase } from './supabaseClient';
import { CellMeetingException } from '../types';

export const cellMeetingService = {
  async getExceptions(churchId: string) {
    const { data, error } = await supabase
      .from('cell_meeting_exceptions')
      .select('*')
      .eq('church_id', churchId);

    if (error) throw error;
    return data as CellMeetingException[];
  },

  async getExceptionsByCell(cellId: string) {
    const { data, error } = await supabase
      .from('cell_meeting_exceptions')
      .select('*')
      .eq('cell_id', cellId);

    if (error) throw error;
    return data as CellMeetingException[];
  },

  async createException(exception: Omit<CellMeetingException, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('cell_meeting_exceptions')
      .insert([exception])
      .select()
      .single();

    if (error) throw error;
    return data as CellMeetingException;
  },

  async updateException(id: string, updates: Partial<CellMeetingException>) {
    const { data, error } = await supabase
      .from('cell_meeting_exceptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as CellMeetingException;
  },

  async deleteException(id: string) {
    const { error } = await supabase
      .from('cell_meeting_exceptions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
