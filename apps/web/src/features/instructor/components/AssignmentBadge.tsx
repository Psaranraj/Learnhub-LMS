import { Badge } from '../../../components/ui/Badge';
import type { AssignmentState } from '../../../services/learningService';

/** The instructor's assignment badges (design asgBadge). */
export function AssignmentBadge({ state, grade }: { state: AssignmentState; grade: number | null }) {
  switch (state) {
    case 'locked':
      return <Badge tone="x">Locked</Badge>;
    case 'todo':
      return <Badge tone="o">To do</Badge>;
    case 'submitted':
      return <Badge>Submitted · to grade</Badge>;
    case 'graded':
      return <Badge tone="g">{`Graded ${grade ?? ''}/100`}</Badge>;
    default:
      return <Badge tone="x">No assignment</Badge>;
  }
}
