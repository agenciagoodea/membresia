import React, { useState } from 'react';
import { PaidEvent } from '../../types';
import PaidEventsList from './PaidEventsList';
import PaidEventForm from './PaidEventForm';
import PaidEventParticipantsTable from './PaidEventParticipantsTable';

/**
 * Componente orquestrador do módulo de Eventos Pagos.
 * Gerencia a navegação interna entre: Lista → Form → Tabela de Inscritos.
 */
const PaidEventsManager: React.FC<{ user: any }> = ({ user }) => {
  const [view, setView] = useState<'list' | 'form' | 'registrations'>('list');
  const [selectedEvent, setSelectedEvent] = useState<PaidEvent | null>(null);
  const [formKey, setFormKey] = useState(0);

  const churchId = user.churchId || user.church_id;

  const handleCreateNew = () => {
    setSelectedEvent(null);
    setFormKey(k => k + 1);
    setView('form');
  };

  const handleEdit = (event: PaidEvent) => {
    setSelectedEvent(event);
    setFormKey(k => k + 1);
    setView('form');
  };

  const handleViewRegistrations = (event: PaidEvent) => {
    setSelectedEvent(event);
    setView('registrations');
  };

  const handleFormSaved = () => {
    setView('list');
    setSelectedEvent(null);
  };

  const handleFormClose = () => {
    setView('list');
    setSelectedEvent(null);
  };

  switch (view) {
    case 'form':
      return (
        <PaidEventForm
          key={formKey}
          isOpen={true}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
          event={selectedEvent}
          churchId={churchId}
          userId={user.id}
        />
      );

    case 'registrations':
      return selectedEvent ? (
        <PaidEventParticipantsTable
          event={selectedEvent}
          user={user}
          onBack={() => setView('list')}
        />
      ) : null;

    default:
      return (
        <PaidEventsList
          user={user}
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onViewRegistrations={handleViewRegistrations}
        />
      );
  }
};

export default PaidEventsManager;
