import { supabase } from './supabaseClient';
import { M12Activity, LadderStage, M12Performance, FormLogicType, DataSource } from '../types';

export const m12Service = {
  async getActivities(churchId: string): Promise<M12Activity[]> {
    const { data, error } = await supabase
      .from('m12_checkpoints')
      .select('*')
      .eq('church_id', churchId)
      .order('order', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapActivityFromDb);
  },

  mapActivityFromDb(db: any): M12Activity {
    return {
      id: db.id,
      churchId: db.church_id,
      stage: db.stage as LadderStage,
      label: db.label,
      order: db.order,
      description: db.description,
      isActive: db.is_active,
      isRequired: db.is_required,
      isEditable: db.is_editable ?? true,
      isVisible: db.is_visible ?? true,
      defaultValue: db.default_value,
      configOptions: db.config_options || [],
      isMultipleChoice: db.is_multiple_choice ?? false,
      dependsOnId: db.depends_on_id,
      logicalCondition: db.logical_condition,
      isCalculated: db.is_calculated ?? false,
      dataSource: (db.data_source as DataSource) || 'MANUAL',
      logicType: (db.logic_type as FormLogicType) || 'BOOLEAN',
      createdAt: db.created_at
    };
  },

  async saveActivity(activity: Partial<M12Activity>): Promise<M12Activity> {
    const churchId = activity.churchId;
    if (!churchId) throw new Error('churchId is required');

    const dbData = {
      church_id: churchId,
      stage: activity.stage,
      label: activity.label,
      order: activity.order,
      description: activity.description,
      is_active: activity.isActive,
      is_required: activity.isRequired,
      is_editable: activity.isEditable,
      is_visible: activity.isVisible,
      default_value: activity.defaultValue,
      is_multiple_choice: activity.isMultipleChoice,
      logical_condition: activity.logicalCondition,
      is_calculated: activity.isCalculated,
      data_source: activity.dataSource,
      logic_type: activity.logicType,
      config_options: activity.configOptions,
      depends_on_id: activity.dependsOnId
    };

    let result;
    if (activity.id) {
      const { data, error } = await supabase
        .from('m12_checkpoints')
        .update(dbData)
        .eq('id', activity.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('m12_checkpoints')
        .insert([dbData])
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return this.mapActivityFromDb(result);
  },

  async deleteActivity(id: string): Promise<void> {
    const { error } = await supabase
      .from('m12_checkpoints')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateOrders(activities: { id: string, order: number }[]): Promise<void> {
    const { error } = await supabase
      .from('m12_checkpoints')
      .upsert(
        activities.map(a => ({
          id: a.id,
          order: a.order
        }))
      );

    if (error) throw error;
  },

  // Respostas Dinâmicas
  async getMemberResponses(memberId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('member_activity_responses')
      .select('*')
      .eq('member_id', memberId);
    
    if (error) throw error;
    return data || [];
  },

  async saveMemberResponse(memberId: string, activityId: string, value: any): Promise<void> {
    const { error } = await supabase
      .from('member_activity_responses')
      .upsert({
        member_id: memberId,
        activity_id: activityId,
        value: value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'member_id,activity_id' });
    
    if (error) throw error;
  },

  // Relacionamentos Dinâmicos
  async getMemberRelationships(memberId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('member_relationships')
      .select('*, related_member:members!related_member_id(*)')
      .eq('member_id', memberId);
    
    if (error) throw error;
    return data || [];
  },

  async saveRelationship(memberId: string, relatedId: string, type: string): Promise<void> {
    const { error } = await supabase
      .from('member_relationships')
      .upsert({
        member_id: memberId,
        related_member_id: relatedId,
        relationship_type: type
      }, { onConflict: 'member_id,related_member_id,relationship_type' });
    
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
      totalActivities: d.total_checkpoints,
      completedActivities: d.checkpoints_reached,
      daysActive: d.days_active,
      efficiency: d.total_checkpoints > 0 ? (d.checkpoints_reached / d.total_checkpoints) * 100 : 0
    }));
  },

  async trackStageChange(memberId: string, churchId: string, stage: LadderStage) {
    await supabase
      .from('m12_performance_tracking')
      .update({ end_date: new Date().toISOString().split('T')[0] })
      .eq('member_id', memberId)
      .is('end_date', null);

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
