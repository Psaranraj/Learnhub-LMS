import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CATEGORY_LABELS, LEVEL_LABELS, courseUpdateSchema, type Category, type Level } from '@learnhub/shared';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';
import { Modal, ModalActions } from '../../../components/ui/Modal';
import { Notice } from '../../../components/ui/Notice';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useApi } from '../../../hooks/useApi';
import { courseService, type ManagedCourse } from '../../../services/courseService';
import { useUiStore } from '../../../stores/uiStore';
import { field } from '../../../utils/styles';
import { AssignmentModal } from '../components/AssignmentModal';
import { CourseStudentsTab } from '../components/CourseStudentsTab';
import { LessonModal } from '../components/LessonModal';
import { QuizEditorModal } from '../components/QuizEditorModal';

type Lesson = ManagedCourse['lessons'][number];
type Details = { title: string; category: Category; level: Level; description: string };

const ckRow = (ok: boolean, text: string) => (
  <p key={text} className="flex items-center gap-2.5 border-t border-ln py-2 text-xs first:border-t-0">
    {ok ? <Badge tone="g">Done</Badge> : <Badge tone="x">To do</Badge>}
    {text}
  </p>
);

// Instructor / Course builder (design iBuild): details, students, lessons with quizzes, the assignment, readiness and submit.
export default function CourseBuilderPage() {
  const id = Number(useParams().id);
  const toast = useUiStore((s) => s.showToast);

  const { data: course, error: courseError, callAPI: getCourseAPI } = useApi(courseService.manage);

  const {
    loading: saveDetailsLoading,
    error: saveDetailsError,
    callAPI: saveDetailsAPI,
  } = useApi(courseService.update);

  const { loading: submitLoading, error: submitError, callAPI: submitCourseAPI } = useApi(courseService.submit);

  const {
    loading: reorderLoading,
    error: reorderError,
    callAPI: reorderLessonsAPI,
  } = useApi(courseService.reorderLessons);

  const {
    loading: deleteLessonLoading,
    error: deleteLessonError,
    code: deleteLessonCode,
    callAPI: deleteLessonAPI,
    clear: clearDeleteLessonError,
  } = useApi(courseService.deleteLesson);

  const {
    loading: deleteAssignmentLoading,
    error: deleteAssignmentError,
    callAPI: deleteAssignmentAPI,
  } = useApi(courseService.deleteAssignment);

  const [details, setDetails] = useState<Details | null>(null);
  const [detailsErr, setDetailsErr] = useState('');
  const [lessonModal, setLessonModal] = useState<{ open: boolean; lesson: Lesson | null }>({
    open: false,
    lesson: null,
  });
  const [quizModal, setQuizModal] = useState<{ open: boolean; lessonId: number | null }>({
    open: false,
    lessonId: null,
  });
  const [asgOpen, setAsgOpen] = useState(false);
  const [deleting, setDeleting] = useState<Lesson | null>(null);
  const [mustConfirm, setMustConfirm] = useState<string | null>(null);
  const [notReady, setNotReady] = useState<string[] | null>(null);

  const load = useCallback(() => {
    void getCourseAPI(id);
  }, [getCourseAPI, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (course)
      setDetails({
        title: course.title,
        category: course.category,
        level: course.level,
        description: course.description,
      });
  }, [course]);

  useEffect(() => {
    const e = reorderError || deleteAssignmentError || submitError;
    if (e) toast(e);
  }, [reorderError, deleteAssignmentError, submitError, toast]);

  // The server asks for a second confirmation when students have progress on the lesson.
  useEffect(() => {
    if (deleteLessonCode === 'CONFIRM_REQUIRED') setMustConfirm(deleteLessonError);
    else if (deleteLessonError) toast(deleteLessonError);
  }, [deleteLessonCode, deleteLessonError, toast]);

  if (courseError)
    return (
      <EmptyState
        title="Course not found"
        message={courseError}
        action={
          <Link to="/instructor/courses">
            <Button>Back to courses</Button>
          </Link>
        }
      />
    );
  if (!course || !details) return <p className="text-xs text-mu">Loading…</p>;

  const locked = course.status === 'PENDING_REVIEW';
  const published = course.status === 'PUBLISHED';
  const structure = course.status === 'DRAFT' || course.status === 'REJECTED';
  const quiz = course.lessons.find((l) => l.quiz)?.quiz;
  const done = (message: string) => {
    toast(message);
    load();
  };

  async function save(): Promise<boolean> {
    const parsed = courseUpdateSchema.safeParse(details);
    if (!parsed.success) {
      setDetailsErr(parsed.error.issues[0]?.message ?? 'Check the details.');
      return false;
    }
    setDetailsErr('');
    return !!(await saveDetailsAPI(id, parsed.data));
  }
  async function saveDraft() {
    if (await save()) done(published ? 'Changes saved' : 'Draft saved');
  }
  async function sendForApproval() {
    if (!(await save())) return;
    const fresh = await getCourseAPI(id);
    const missing = fresh?.readiness.items.filter((i) => !i.ok).map((i) => i.text) ?? [];
    if (missing.length) return setNotReady(missing);
    if (await submitCourseAPI(id)) done('Sent to admin for approval');
  }
  async function move(index: number, by: -1 | 1) {
    const ids = course!.lessons.map((l) => l.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + by, 0, moved);
    if (await reorderLessonsAPI(id, ids)) load();
  }
  async function confirmDelete(confirm: boolean) {
    if (!deleting) return;
    if (await deleteLessonAPI(deleting.id, confirm)) {
      setDeleting(null);
      setMustConfirm(null);
      done('Lesson deleted');
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Course builder"
        title={course.title || 'New course'}
        description={
          locked
            ? 'Submitted. Waiting for admin approval, so editing is locked.'
            : 'Add details, students, lessons, quizzes and an assignment. Then submit for admin approval.'
        }
        action={
          <Link to="/instructor/courses">
            <Button>Back to courses</Button>
          </Link>
        }
      />
      {course.status === 'REJECTED' && course.rejectReason && (
        <Notice tone="warn">
          <strong>Rejected by admin.</strong> Reason: {course.rejectReason}
          <br />
          Fix the points below and submit the course again.
        </Notice>
      )}
      {published && (
        <Notice>
          This course is published. You can edit details, lesson content, quizzes and the assignment text. To add,
          delete or reorder lessons, ask the admin to unpublish it.
        </Notice>
      )}

      <Card
        title="Course details"
        subtitle={`Status: ${course.status === 'PENDING_REVIEW' ? 'Pending review' : course.status.charAt(0) + course.status.slice(1).toLowerCase()}`}
      >
        <div className="grid gap-2.5 [grid-template-columns:2fr_1fr_1fr] max-md:[grid-template-columns:1fr]">
          <Input
            label="Course title"
            disabled={locked}
            value={details.title}
            onChange={(e) => setDetails({ ...details, title: e.target.value })}
          />
          <label className="mb-3 block text-xs font-bold">
            Category
            <select
              className={`${field} mt-[5px]`}
              disabled={locked}
              value={details.category}
              onChange={(e) => setDetails({ ...details, category: e.target.value as Category })}
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="mb-3 block text-xs font-bold">
            Level
            <select
              className={`${field} mt-[5px]`}
              disabled={locked}
              value={details.level}
              onChange={(e) => setDetails({ ...details, level: e.target.value as Level })}
            >
              {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-bold">
          Description (what you teach)
          <textarea
            className={`${field} mt-[5px]`}
            rows={3}
            disabled={locked}
            placeholder="What will students learn?"
            value={details.description}
            onChange={(e) => setDetails({ ...details, description: e.target.value })}
          />
        </label>
        {(detailsErr || saveDetailsError) && (
          <p className="mt-2 text-xs font-bold text-r">{detailsErr || saveDetailsError}</p>
        )}
      </Card>

      <h2 className="mb-1 text-sm font-bold">Students (free of cost)</h2>
      <p className="mb-2 text-xs text-mu">
        {published
          ? 'Added students get access right away.'
          : 'Add students now. They get free access once the course is approved and published. This is optional.'}
      </p>
      <CourseStudentsTab courseId={id} published={published} locked={locked} onChange={load} />

      <Card
        title="Lessons, quizzes and assignment"
        subtitle={`Each lesson has a ${quiz?.questionCount ?? 10}-question quiz (${quiz?.passMark ?? 8} correct to pass). One assignment comes after the quizzes.`}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            variant="soft"
            disabled={!structure}
            title={structure ? undefined : 'Lessons can be added in Draft or Rejected'}
            onClick={() => setLessonModal({ open: true, lesson: null })}
          >
            + Add lesson
          </Button>
          <Button
            variant="soft"
            disabled={locked || course.lessons.length === 0}
            onClick={() => setQuizModal({ open: true, lessonId: null })}
          >
            + Add quiz
          </Button>
          <Button variant="soft" disabled={locked} onClick={() => setAsgOpen(true)}>
            {course.assignment ? 'Edit assignment' : '+ Add assignment'}
          </Button>
        </div>
        {course.lessons.length === 0 && <p className="text-xs text-mu">No lessons yet. Use Add lesson to start.</p>}
        {course.lessons.map((l, i) => (
          <div key={l.id} className="flex flex-wrap items-center gap-2 border-t border-ln py-2.5 text-xs">
            <span className="min-w-0 flex-1">
              <strong>
                {l.position}. {l.title}
              </strong>
              <br />
              <span className="break-all text-mu">
                {l.durationMin} min · {l.materialName ?? 'No material'} · {l.videoUrl}
              </span>
            </span>
            {l.quiz ? <Badge tone="g">Quiz added</Badge> : <Badge tone="o">No quiz</Badge>}
            {structure && (
              <Button
                aria-label={`Move ${l.title} up`}
                disabled={i === 0 || reorderLoading}
                onClick={() => move(i, -1)}
              >
                ↑
              </Button>
            )}
            {structure && (
              <Button
                aria-label={`Move ${l.title} down`}
                disabled={i === course.lessons.length - 1 || reorderLoading}
                onClick={() => move(i, 1)}
              >
                ↓
              </Button>
            )}
            <Button disabled={locked} onClick={() => setLessonModal({ open: true, lesson: l })}>
              Edit
            </Button>
            <Button disabled={locked} onClick={() => setQuizModal({ open: true, lessonId: l.id })}>
              {l.quiz ? 'Edit quiz' : 'Add quiz'}
            </Button>
            {structure && (
              <Button
                variant="danger"
                onClick={() => {
                  clearDeleteLessonError();
                  setDeleting(l);
                }}
              >
                Delete
              </Button>
            )}
          </div>
        ))}
        {course.assignment ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-ln py-2.5 text-xs">
            <span className="min-w-0 flex-1">
              <strong>Assignment: {course.assignment.title}</strong>
              <br />
              <span className="text-mu">To-do: {course.assignment.todoItems.join(' · ')}</span>
            </span>
            <Badge tone="g">Added</Badge>
            <Button disabled={locked} onClick={() => setAsgOpen(true)}>
              Edit
            </Button>
            {structure && (
              <Button
                variant="danger"
                disabled={deleteAssignmentLoading}
                onClick={async () => {
                  if (await deleteAssignmentAPI(id)) done('Assignment removed');
                }}
              >
                Remove
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 border-t border-ln py-2.5 text-xs">
            <span>
              <strong>No assignment yet</strong>
              <br />
              <span className="text-mu">Students receive it after passing the lesson quizzes.</span>
            </span>
            <Badge tone="o">Missing</Badge>
          </div>
        )}
      </Card>

      <Card
        title={published ? 'Save changes' : 'Ready to submit?'}
        subtitle={published ? 'This course is published.' : 'Complete these before you send the course to the admin.'}
      >
        {!published && course.readiness.items.map((x) => ckRow(x.ok, x.text))}
        <div className="mt-3.5 flex justify-end gap-2">
          {!published && (
            <Button disabled={locked || saveDetailsLoading} onClick={saveDraft}>
              Save draft
            </Button>
          )}
          {published ? (
            <Button variant="pri" disabled={saveDetailsLoading} onClick={saveDraft}>
              Save changes
            </Button>
          ) : (
            <Button variant="pri" disabled={locked || submitLoading} onClick={sendForApproval}>
              Submit for approval
            </Button>
          )}
        </div>
      </Card>

      <LessonModal
        courseId={id}
        lesson={lessonModal.lesson}
        open={lessonModal.open}
        onClose={() => setLessonModal({ open: false, lesson: null })}
        onSaved={done}
      />
      <QuizEditorModal
        lessons={course.lessons}
        lessonId={quizModal.lessonId}
        open={quizModal.open}
        onClose={() => setQuizModal({ open: false, lessonId: null })}
        onSaved={done}
      />
      <AssignmentModal
        courseId={id}
        assignment={course.assignment}
        open={asgOpen}
        onClose={() => setAsgOpen(false)}
        onSaved={() => done('Assignment saved')}
      />
      <ConfirmModal
        open={!!deleting && !mustConfirm}
        title="Delete lesson?"
        confirmLabel="Delete"
        danger
        busy={deleteLessonLoading}
        message={`Delete "${deleting?.title ?? ''}"? Its quiz will be removed too.`}
        onCancel={() => setDeleting(null)}
        onConfirm={() => confirmDelete(false)}
      />
      <ConfirmModal
        open={!!mustConfirm}
        title="Students have progress on this lesson"
        confirmLabel="Delete anyway"
        danger
        busy={deleteLessonLoading}
        message={mustConfirm ?? ''}
        onCancel={() => {
          setMustConfirm(null);
          setDeleting(null);
        }}
        onConfirm={() => confirmDelete(true)}
      />
      <Modal open={!!notReady} title="Not ready to submit" onClose={() => setNotReady(null)}>
        <p className="mb-2 text-xs text-mu">Please finish these first:</p>
        {notReady?.map((t) => ckRow(false, t))}
        <ModalActions>
          <Button variant="pri" onClick={() => setNotReady(null)}>
            OK
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
