import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Notice } from '../../../components/ui/Notice';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Tabs } from '../../../components/ui/Tabs';
import { useApi } from '../../../hooks/useApi';
import { learningService, type TopicView } from '../../../services/learningService';
import { useUiStore } from '../../../stores/uiStore';
import { field } from '../../../utils/styles';
import { QuizStartDialogs, type QuizStart } from '../components/QuizStartDialogs';
import { VideoPlayer } from '../components/VideoPlayer';

type Tab = 'notes' | 'material';

const topicNote = (t: TopicView) => {
  if (!t.open) return 'Finish the previous video to unlock';
  switch (t.quiz?.state) {
    case 'passed':
      return 'Quiz passed';
    case 'review':
      return 'Quiz waiting for review';
    case 'failed':
    case 'open':
      return 'Quiz received';
    default:
      return t.watchedPercent > 0 ? `${t.watchedPercent}% watched` : 'Not started';
  }
};

// Student / Learning workspace (design pLearn): video, previous and next topic, the quiz box, the topic list, notes
// and the material. Watching 70% unlocks this topic's quiz and the next topic (HLD 6).
export default function LearningWorkspacePage() {
  const courseId = Number(useParams().courseId);
  const [params, setParams] = useSearchParams();
  const toast = useUiStore((s) => s.showToast);
  const { data: learning, error: learningError, callAPI: getLearningAPI } = useApi(learningService.course);
  const { callAPI: heartbeatAPI } = useApi(learningService.heartbeat);
  const { loading: noteLoading, error: noteError, callAPI: saveNoteAPI } = useApi(learningService.saveNote);
  const [tab, setTab] = useState<Tab>('notes');
  const [draft, setDraft] = useState('');
  const [watched, setWatched] = useState<Record<number, number>>({});
  const [start, setStart] = useState<QuizStart | null>(null);

  const load = useCallback(() => getLearningAPI(courseId), [getLearningAPI, courseId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load();
  }, [load]);

  const lessons = learning?.lessons ?? [];
  // The topic in the address, else the first open topic whose quiz is not passed yet.
  const wanted = Number(params.get('lesson'));
  const current =
    lessons.find((l) => l.id === wanted && l.open) ??
    lessons.find((l) => l.open && l.quiz?.state !== 'passed') ??
    lessons[0];
  const index = current ? lessons.indexOf(current) : -1;

  useEffect(() => {
    if (current) setDraft(current.note);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onHeartbeat = useCallback(
    async (positionSec: number, watchedSec: number) => {
      if (!current) return;
      const res = await heartbeatAPI(current.id, { positionSec, watchedSec });
      if (!res) return;
      setWatched((w) => ({ ...w, [current.id]: res.watchedPercent }));
      if (res.justReached) {
        toast('70% watched. Your quiz for this topic has been received');
        void load();
      }
    },
    [current, heartbeatAPI, toast, load],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  if (learningError)
    return (
      <EmptyState
        title="Learning workspace"
        message={learningError}
        action={
          <Link to="/student/courses">
            <Button variant="pri">Go to my courses</Button>
          </Link>
        }
      />
    );
  if (!learning || !current) return <p className="text-xs text-mu">Loading…</p>;

  const go = (l: TopicView) => l.open && setParams({ lesson: String(l.id) });
  const percent = Math.max(current.watchedPercent, watched[current.id] ?? 0);
  const next = lessons[index + 1];
  const canNext = !!next && (current.reached || percent >= 70);
  const q = current.quiz;
  const openQuiz = () =>
    q &&
    setStart({
      lessonId: current.id,
      topic: current.title,
      questionCount: q.questionCount,
      passMark: q.passMark,
      step: 'rules',
    });

  let quizBox: ReactNode = null;
  if (q?.state === 'passed')
    quizBox = (
      <Notice tone="ok">
        Quiz passed: {q.score} of {q.questionCount} correct.
        {canNext ? ' You can continue to the next topic.' : ''}
      </Notice>
    );
  else if (q?.state === 'review')
    quizBox = (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <span>
            <strong>Quiz submitted</strong>
            <br />
            <span className="text-mu">Waiting for your instructor to review it. Marks will appear in Quizzes.</span>
          </span>
          {q.attemptId && (
            <Link to={`/student/quizzes/attempts/${q.attemptId}`}>
              <Button>View answers</Button>
            </Link>
          )}
        </div>
      </Card>
    );
  else if (q && (q.state === 'open' || q.state === 'failed'))
    quizBox = (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <span>
            <strong>
              {q.state === 'failed'
                ? `Not passed: ${q.score} of ${q.questionCount} correct`
                : 'Quiz received for this topic'}
            </strong>
            <br />
            <span className="text-mu">
              {q.questionCount} questions · {q.passMark} correct to pass
            </span>
          </span>
          <Button variant="pri" onClick={openQuiz}>
            {q.state === 'failed' ? 'Retake quiz' : 'Start quiz'}
          </Button>
        </div>
      </Card>
    );
  else if (q)
    quizBox = (
      <Notice tone="warn">Watch at least 70% of this video to unlock the next topic and this topic's quiz.</Notice>
    );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-xs font-extrabold tracking-[1.7px] text-p">
            {learning.course.title.toUpperCase()}
          </div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.8px]">
            {current.position}. {current.title}
          </h1>
          <p className="text-xs text-mu">
            Topic {current.position} of {lessons.length}
          </p>
        </div>
        <Link to="/student/courses">
          <Button>Back to my courses</Button>
        </Link>
      </div>
      <div className="grid items-start gap-4 [grid-template-columns:minmax(0,2fr)_minmax(260px,1fr)] max-md:[grid-template-columns:1fr]">
        <div>
          {current.videoUrl && <VideoPlayer key={current.id} url={current.videoUrl} onHeartbeat={onHeartbeat} />}
          <div className="mt-2.5 flex items-center gap-2.5 text-xs text-mu">
            <span className="w-40">
              <ProgressBar percent={percent} />
            </span>
            Watched {percent}% · 70% unlocks the next topic and quiz
          </div>
          <div className="my-3 flex justify-between gap-2.5">
            <Button disabled={index <= 0} onClick={() => go(lessons[index - 1])}>
              ← Previous topic
            </Button>
            <Button
              variant="pri"
              disabled={!canNext}
              onClick={() =>
                next && (current.reached ? go(next) : void load().then(() => setParams({ lesson: String(next.id) })))
              }
            >
              Next topic →
            </Button>
          </div>
          {quizBox}
        </div>
        <div>
          <Card title="Course content" subtitle="Topics unlock as you finish each video">
            {lessons.map((l) => (
              <button
                key={l.id}
                type="button"
                disabled={!l.open}
                onClick={() => go(l)}
                className={`flex w-full items-center justify-between gap-2 rounded-[9px] px-2.5 py-2 text-left text-xs ${l.id === current.id ? 'bg-lv' : ''} ${l.open ? 'hover:bg-[#f7f6ff]' : 'cursor-not-allowed opacity-60'}`}
              >
                <span>
                  <strong>
                    {l.position}. {l.title}
                  </strong>
                  <br />
                  <span className="text-mu">{topicNote(l)}</span>
                </span>
                {!l.open && <Badge tone="x">Locked</Badge>}
              </button>
            ))}
          </Card>
          <Card>
            <Tabs<Tab>
              tabs={[
                { id: 'notes', label: 'Notes' },
                { id: 'material', label: 'Materials' },
              ]}
              active={tab}
              onChange={setTab}
            />
            {tab === 'notes' ? (
              <>
                <textarea
                  className={field}
                  rows={6}
                  placeholder="Write your notes for this topic"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                {noteError && <p className="mt-1 text-xs font-bold text-r">{noteError}</p>}
                <div className="mt-2.5 flex justify-end">
                  <Button
                    variant="pri"
                    disabled={noteLoading}
                    onClick={async () => {
                      if (await saveNoteAPI(current.id, draft)) toast('Note saved');
                    }}
                  >
                    Save note
                  </Button>
                </div>
              </>
            ) : current.materialName && current.hasMaterialFile ? (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span>
                  <strong>{current.materialName}</strong>
                  <br />
                  <span className="text-mu">Lesson material</span>
                </span>
                <a href={learningService.materialUrl(current.id)}>
                  <Button>Download</Button>
                </a>
              </div>
            ) : (
              <p className="text-xs text-mu">This topic has no material.</p>
            )}
            <p className="mt-2.5 text-xs text-mu">Watching the video counts towards unlocking the quiz.</p>
          </Card>
        </div>
      </div>
      <QuizStartDialogs start={start} onChange={setStart} />
    </div>
  );
}
