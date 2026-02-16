import { TaskBoardMobileScreen } from '@/domains/tasks/screens/TaskBoardMobileScreen.native';
import { usePatients } from '../../src/hooks/usePatients';

export default function TasksTabRoute() {
  const { data: patients = [] } = usePatients();

  return <TaskBoardMobileScreen patients={patients as unknown[]} />;
}
