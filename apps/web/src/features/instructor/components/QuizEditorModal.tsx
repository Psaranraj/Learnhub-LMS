import { useEffect, useState } from 'react';
import { quizSaveSchema } from '@learnhub/shared';
import { Button } from '../../../components/ui/Button';
import { Modal, ModalActions } from '../../../components/ui/Modal';
import { Notice } from '../../../components/ui/Notice';
import { useApi } from '../../../hooks/useApi';
import type { ManagedCourse } from '../../../services/courseService';
import { quizService, type QuizQuestion } from '../../../services/quizService';
import { field } from '../../../utils/styles';

type Props = {
  lessons: ManagedCourse['lessons'];
  /** The lesson to edit; null opens "Add quiz" on the first lesson without one. */
  lessonId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
};

const LETTERS = ['A', 'B', 'C', 'D'];
const blank = (n: number): QuizQuestion[] =>
  Array.from({ length: n }, () => ({ text: '', options: ['', '', '', ''], correctIndex: 0 }));

/**
 * The design's quiz builder: pick the topic, write every question (4 options, 1 correct). Nothing is filled in for
 * the instructor (HLD 8, decision 6). Saving first asks the server how many students a change affects (LLD 6, flow 7).
 */
export function QuizEditorModal({ lessons, lessonId, open, onClose, onSaved }: Props) {
  const { data: quiz, loading: quizLoading, error: quizError, callAPI: getQuizAPI } = useApi(quizService.forEditor);
  const {
    loading: saveLoading,
    error: saveError,
    callAPI: saveQuizAPI,
    clear: clearSaveError,
  } = useApi(quizService.save);
  const [lesson, setLesson] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setLesson(lessonId ?? lessons.find((l) => !l.quiz)?.id ?? lessons[0]?.id ?? null);
    setErr('');
    setConfirm(null);
    clearSaveError();
  }, [open, lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || lesson === null) return;
    void getQuizAPI(lesson).then((d) => {
      if (!d) return;
      setTitle(d.quiz?.title ?? '');
      setQuestions(
        d.quiz ? d.quiz.questions.map((q) => ({ ...q, options: [...q.options] })) : blank(d.defaults.questionCount),
      );
    });
  }, [open, lesson, getQuizAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = quiz?.quiz?.questionCount ?? quiz?.defaults.questionCount ?? 10;
  const passMark = quiz?.quiz?.passMark ?? quiz?.defaults.passMark ?? 8;
  const setQ = (i: number, patch: Partial<QuizQuestion>) =>
    setQuestions((qs) => qs.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const setOpt = (i: number, j: number, value: string) =>
    setQuestions((qs) =>
      qs.map((q, k) => (k === i ? { ...q, options: q.options.map((o, m) => (m === j ? value : o)) } : q)),
    );

  async function submit(confirmed = false) {
    if (lesson === null) return;
    const body = {
      title,
      questions: questions.map((q) => ({
        ...q,
        options: q.options as [string, string, string, string],
      })),
    };
    const parsed = quizSaveSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const n = typeof issue?.path[1] === 'number' ? `Question ${issue.path[1] + 1}: ` : '';
      return setErr(`${n}${issue?.message ?? 'Check the questions.'}`);
    }
    setErr('');
    if (!confirmed && quiz?.quiz) {
      const dry = await saveQuizAPI(lesson, parsed.data, true);
      if (!dry) return;
      if (dry.affected > 0) return setConfirm(dry.affected);
    }
    const res = await saveQuizAPI(lesson, parsed.data);
    if (res) {
      onSaved(`Quiz saved for ${lessons.find((l) => l.id === lesson)?.title ?? 'the lesson'}`);
      onClose();
    }
  }

  return (
    <Modal wide open={open} title={lessonId ? 'Edit quiz' : 'Add quiz'} onClose={onClose}>
      <p className="mb-3 text-xs text-mu">Choose the topic this quiz belongs to, then write the {count} questions.</p>
      <div className="mb-3 grid gap-3 [grid-template-columns:1fr_1fr] max-md:[grid-template-columns:1fr]">
        <label className="block text-xs font-bold">
          Topic
          <select
            className={`${field} mt-[5px]`}
            disabled={!!lessonId}
            value={lesson ?? ''}
            onChange={(e) => setLesson(Number(e.target.value))}
          >
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.position}. {l.title}
                {l.quiz ? ' (has quiz, will be replaced)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold">
          Quiz title (optional)
          <input
            className={`${field} mt-[5px]`}
            placeholder="e.g. Quiz: Design principles"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      </div>
      <Notice>
        {count} questions, 4 options each, 1 correct answer. Students need {passMark} correct to pass. The student
        receives this quiz after watching 70% of the topic video.
      </Notice>
      {confirm !== null && (
        <Notice tone="warn">
          {confirm} student(s) already submitted or failed the current quiz for this topic. They will take the new quiz
          again. Students who already passed keep their result.
          <span className="mt-2 flex gap-2">
            <Button onClick={() => setConfirm(null)}>Keep editing</Button>
            <Button variant="pri" disabled={saveLoading} onClick={() => submit(true)}>
              Save new version
            </Button>
          </span>
        </Notice>
      )}
      {quizLoading && <p className="text-xs text-mu">Loading…</p>}
      {quizError && <p className="text-xs font-bold text-r">{quizError}</p>}
      {!quizLoading &&
        questions.map((q, i) => (
          <div key={i} className="mb-2.5 rounded-[13px] border border-ln p-3">
            <label className="block text-xs font-bold">
              Question {i + 1}
              <input
                className={`${field} mt-1.5`}
                placeholder="Type the question"
                value={q.text}
                onChange={(e) => setQ(i, { text: e.target.value })}
              />
            </label>
            {q.options.map((o, j) => (
              <div key={j} className="mt-1.5 flex items-center gap-2">
                <b className="w-4 text-xs">{LETTERS[j]}</b>
                <input
                  className={field}
                  aria-label={`Question ${i + 1} option ${LETTERS[j]}`}
                  placeholder={`Option ${LETTERS[j]}`}
                  value={o}
                  onChange={(e) => setOpt(i, j, e.target.value)}
                />
              </div>
            ))}
            <label className="mt-2.5 block text-xs font-bold">
              Correct answer
              <select
                className={`${field} mt-1.5`}
                value={q.correctIndex}
                onChange={(e) => setQ(i, { correctIndex: Number(e.target.value) })}
              >
                {LETTERS.map((l, j) => (
                  <option key={l} value={j}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      {(err || saveError) && <p className="mb-2 text-xs font-bold text-r">{err || saveError}</p>}
      <ModalActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="pri" disabled={saveLoading || quizLoading || confirm !== null} onClick={() => submit()}>
          Save quiz
        </Button>
      </ModalActions>
    </Modal>
  );
}
