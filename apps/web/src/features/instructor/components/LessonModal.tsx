import { useEffect, useState } from 'react';
import { lessonCreateSchema } from '@learnhub/shared';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal, ModalActions } from '../../../components/ui/Modal';
import { useApi } from '../../../hooks/useApi';
import { courseService, type ManagedCourse } from '../../../services/courseService';

type Lesson = ManagedCourse['lessons'][number];
type Props = {
  courseId: number;
  lesson: Lesson | null;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
};

// Add or edit a lesson (design: title, video link, duration, one material file). The PDF uploads after the lesson saves.
export function LessonModal({ courseId, lesson, open, onClose, onSaved }: Props) {
  const {
    loading: addLoading,
    error: addError,
    callAPI: addLessonAPI,
    clear: clearAddError,
  } = useApi(courseService.addLesson);
  const {
    loading: editLoading,
    error: editError,
    callAPI: updateLessonAPI,
    clear: clearEditError,
  } = useApi(courseService.updateLesson);
  const {
    loading: uploadLoading,
    error: uploadError,
    callAPI: uploadMaterialAPI,
    clear: clearUploadError,
  } = useApi(courseService.uploadMaterial);
  const { loading: removeMaterialLoading, callAPI: deleteMaterialAPI } = useApi(courseService.deleteMaterial);
  const [form, setForm] = useState({ title: '', videoUrl: '', durationMin: '' });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({
      title: lesson?.title ?? '',
      videoUrl: lesson?.videoUrl ?? '',
      durationMin: lesson ? String(lesson.durationMin) : '',
    });
    setFile(null);
    setErr('');
    clearAddError();
    clearEditError();
    clearUploadError();
  }, [open, lesson]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const parsed = lessonCreateSchema.safeParse(form);
    if (!parsed.success) return setErr(parsed.error.issues[0]?.message ?? 'Check the lesson.');
    if (file && file.size > 20 * 1024 * 1024) return setErr('The material is larger than 20 MB.');
    setErr('');
    const id = lesson
      ? (await updateLessonAPI(lesson.id, parsed.data))
        ? lesson.id
        : null
      : ((await addLessonAPI(courseId, parsed.data))?.id ?? null);
    if (!id) return;
    if (file && !(await uploadMaterialAPI(id, file))) {
      onSaved('Lesson saved, but the material did not upload. Open the lesson to try again.');
      return onClose();
    }
    onSaved('Lesson saved');
    onClose();
  }
  async function dropMaterial() {
    if (lesson && (await deleteMaterialAPI(lesson.id))) onSaved('Material removed');
  }
  const busy = addLoading || editLoading || uploadLoading;

  return (
    <Modal open={open} title={lesson ? 'Edit lesson' : 'Add lesson'} onClose={onClose}>
      <Input label="Lesson title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <Input
        label="Video link"
        type="url"
        placeholder="https://youtube.com/..."
        value={form.videoUrl}
        onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
      />
      <Input
        label="Duration (minutes)"
        type="number"
        min={1}
        value={form.durationMin}
        onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
      />
      <label className="mb-1 block text-xs font-bold">
        Material (PDF, up to 20 MB, optional)
        <input
          className="mt-[5px] block w-full text-xs"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {lesson?.materialName && !file && (
        <p className="mb-3 flex flex-wrap items-center gap-2 text-xs text-mu">
          Current: {lesson.materialName}
          <a className="font-bold text-p" href={courseService.materialUrl(lesson.id)} target="_blank" rel="noreferrer">
            View
          </a>
          <button type="button" className="font-bold text-r" disabled={removeMaterialLoading} onClick={dropMaterial}>
            Remove
          </button>
        </p>
      )}
      {(err || addError || editError || uploadError) && (
        <p className="mb-2 text-xs font-bold text-r">{err || addError || editError || uploadError}</p>
      )}
      <ModalActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="pri" disabled={busy} onClick={save}>
          Save lesson
        </Button>
      </ModalActions>
    </Modal>
  );
}
