
import { supabase } from './supabaseClient';
import { M12Checkpoint, LadderStage, M12Performance } from '../types';

const mapCheckpointFromDb = (d: any): M12Checkpoint => ({
  id: d.id,
  churchId: d.church_id,
  stage: d.stage as LadderStage,
  label: d.label,
  description: d.description,
  order: d.order,
  isActive: d.is_active,
  isRequired: d.is_required,
  dependsOnId: d.depends_on_id,
  createdAt: d.created_at
});

export const m12Service = {
  async getCheckpoints(churchId: string): Promise<M12Checkpoint[]> {
    const { data, error } = await supabase
      .from('m12_checkpoints')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('order', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapCheckpointFromDb);
  },

  async getAllCheckpoints(churchId: string): Promise<M12Checkpoint[]> {
    const { data, error } = await supabase
      .from('m12_checkpoints')
      .select('*')
      .eq('church_id', churchId)
      .order('order', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapCheckpointFromDb);
  },

  async saveCheckpoint(checkpoint: Partial<M12Checkpoint> & { churchId: string }) {
    const dbData = {
      church_id: checkpoint.churchId,
      stage: checkpoint.stage,
      label: checkpoint.label,
      description: checkpoint.description,
      order: checkpoint.order,
      is_active: checkpoint.isActive,
      is_required: checkpoint.isRequired,
      depends_on_id: checkpoint.dependsOnId
    };

    if (checkpoint.id) {
      const { data, error } = await supabase
        .from('m12_checkpoints')
        .update(dbData)
        .eq('id', checkpoint.id)
        .select()
        .single();
      if (error) throw error;
      return mapCheckpointFromDb(data);
    } else {
      const { data, error } = await supabase
        .from('m12_checkpoints')
        .insert([dbData])
        .select()
        .single();
      if (error) throw error;
      return mapCheckpointFromDb(data);
    }
  },

  async deleteCheckpoint(id: string) {
    const { error } = await supabase
      .from('m12_checkpoints')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getPerformance(memberId: string): Promise<M12Performance[]> {
    const { data, error } = await supabase
      .from('m12_performance_tracking')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(d => ({
      memberId: d.member_id,
      stage: d.stage as LadderStage,
      startDate: d.start_date,
      completionDate: d.end_date,
      totalCheckpoints: d.total_checkpoints,
      completedCheckpoints: d.checkpoints_reached,
      daysActive: d.end_date 
        ? Math.ceil((new Date(d.end_date).getTime() - new Date(d.start_date).getTime()) / (1000 * 3600 * 24))
        : Math.ceil((new Date().getTime() - new Date(d.start_date).getTime()) / (1000 * 3600 * 24)),
      efficiency: d.total_checkpoints > 0 ? (d.checkpoints_reached / d.total_checkpoints) * 100 : 0
    }));
  },

  async trackStageChange(memberId: string, churchId: string, stage: LadderStage) {
    // Marcar estágio anterior como concluído
    await supabase
      .from('m12_performance_tracking')
      .update({ end_date: new Date().toISOString().split('T')[0] })
      .eq('member_id', memberId)
      .is('end_date', null);

    // Iniciar rastreamento do novo estágio
    const { error } = await supabase
      .from('m12_performance_tracking')
      .insert([{
        member_id: memberId,
        church_id: churchId,
        stage: stage,
        start_date: new Date().toISOString().split('T')[0]
      }]);
    
    if (error) throw error;
  }
};
