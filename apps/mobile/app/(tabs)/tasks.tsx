import { useMemo } from 'react';
import { TaskBoardMobileScreen } from '@/domains/tasks/screens/TaskBoardMobileScreen';
import { usePatients } from '../../src/hooks/usePatients';
import { usePinnedPatients } from '../../src/hooks/usePinnedPatients';

export default function TasksTabRoute() {
  const { data: patients = [] } = usePatients();
  const { isPinned } = usePinnedPatients();

  const pinnedPatientIds = useMemo(() => {
    return (patients as Array<{ id?: string }>)
      .filter((patient) => patient.id && isPinned(patient.id))
      .map((patient) => patient.id as string);
  }, [patients, isPinned]);

  return <TaskBoardMobileScreen patients={patients as unknown[]} pinnedPatientIds={pinnedPatientIds} />;
}
