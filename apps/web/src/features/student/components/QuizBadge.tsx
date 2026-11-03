import { Badge } from '../../../components/ui/Badge';
import type { TopicView } from '../../../services/learningService';

/** The design's quiz badges (lbQuiz): Passed n/10, Waiting for review, Not passed n/10, Quiz received, Locked. */
export function QuizBadge({ quiz }: { quiz: TopicView['quiz'] }) {
  if (!quiz) return <Badge tone="x">No quiz</Badge>;
  const total = quiz.questionCount;
  switch (quiz.state) {
    case 'passed':
      return <Badge tone="g">{`Passed ${quiz.score ?? ''}/${total}`}</Badge>;
    case 'review':
      return <Badge>Waiting for review</Badge>;
    case 'failed':
      return <Badge tone="r">{`Not passed ${quiz.score ?? ''}/${total}`}</Badge>;
    case 'open':
      return <Badge>Quiz received</Badge>;
    default:
      return <Badge tone="x">Locked</Badge>;
  }
}
