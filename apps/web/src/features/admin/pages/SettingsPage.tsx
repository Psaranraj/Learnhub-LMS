import { useEffect, useState } from 'react';
import { settingsSchema } from '@learnhub/shared';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useApi } from '../../../hooks/useApi';
import { settingsService, type Settings } from '../../../services/settingsService';
import { useUiStore } from '../../../stores/uiStore';
import { formatLongDate } from '../../../utils/format';

type Form = {
  orgName: string;
  certTitle: string;
  certIntro: string;
  certMid: string;
  certFooter: string;
  quizQuestionCount: string;
  quizPassMark: string;
};
const LOGO_MB = 1;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const toForm = (s: Settings): Form => ({
  orgName: s.orgName,
  certTitle: s.certTitle,
  certIntro: s.certIntro,
  certMid: s.certMid,
  certFooter: s.certFooter,
  quizQuestionCount: String(s.quizQuestionCount),
  quizPassMark: String(s.quizPassMark),
});

/** The saved wording as it will look on a certificate (design certBox). */
function Preview({ s }: { s: Settings }) {
  return (
    <div className="rounded-[12px] border-2 border-p p-6 text-center">
      {s.hasLogo ? (
        <img
          src={settingsService.logoUrl(s.updatedAt)}
          alt=""
          className="mx-auto mb-1.5 h-[34px] w-[34px] rounded-[11px] object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="mx-auto mb-1.5 grid h-[34px] w-[34px] place-items-center rounded-[11px] bg-p font-extrabold text-white"
        >
          L
        </div>
      )}
      <small className="text-xs font-extrabold tracking-[1.5px] text-mu">{s.orgName.toUpperCase()}</small>
      <h3 className="my-2 text-lg font-extrabold">{s.certTitle}</h3>
      <p className="text-xs text-mu">{s.certIntro}</p>
      <div className="my-2 text-xl font-extrabold text-p">Sample Student</div>
      <p className="text-xs text-mu">{s.certMid}</p>
      <h3 className="my-2 text-base font-extrabold">Sample Course</h3>
      <p className="text-xs text-mu">Instructor: Instructor Name · Issued {formatLongDate(new Date().toISOString())}</p>
      <p className="mt-1 text-xs text-mu">{s.certFooter}</p>
    </div>
  );
}

// Admin / Settings (design adSet): certificate wording and logo, and the quiz defaults for new quizzes.
// Certificates already issued keep the wording they were issued with (HLD 8, decision 5).
export default function SettingsPage() {
  const toast = useUiStore((s) => s.showToast);
  const { data: settings, error: settingsError, callAPI: getSettingsAPI } = useApi(settingsService.get);
  const {
    data: savedSettings,
    loading: saveLoading,
    error: saveError,
    fieldErrors: saveFieldErrors,
    callAPI: saveSettingsAPI,
  } = useApi(settingsService.save);
  const [form, setForm] = useState<Form | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [local, setLocal] = useState<Record<string, string>>({});
  const [fileKey, setFileKey] = useState(0);

  useEffect(() => {
    void getSettingsAPI().then((s) => s && setForm(toForm(s)));
  }, [getSettingsAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = savedSettings ?? settings;
  if (settingsError) return <p className="text-xs font-bold text-r">{settingsError}</p>;
  if (!form || !saved) return <p className="text-xs text-mu">Loading…</p>;

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const err = (k: string) => local[k] ?? saveFieldErrors[k];
  const pick = (f: File | undefined) => {
    setLocal((l) => {
      const { file: _f, ...rest } = l;
      return rest;
    });
    if (!f) return setLogo(null);
    if (!LOGO_TYPES.includes(f.type)) {
      setLogo(null);
      return setLocal((l) => ({ ...l, file: 'Upload a PNG, JPG or WebP image.' }));
    }
    if (f.size > LOGO_MB * 1024 * 1024) {
      setLogo(null);
      return setLocal((l) => ({ ...l, file: `The logo is larger than ${LOGO_MB} MB.` }));
    }
    setLogo(f);
    setRemoveLogo(false);
  };
  const submit = async () => {
    const parsed = settingsSchema.safeParse({ ...form, removeLogo });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      return setLocal(errs);
    }
    setLocal({});
    const s = await saveSettingsAPI(parsed.data, logo);
    if (!s) return;
    setForm(toForm(s));
    setLogo(null);
    setRemoveLogo(false);
    setFileKey((k) => k + 1);
    toast('Settings saved');
  };
  // Field problems show under their field; this line is only for an error that belongs to no field.
  const firstError = Object.keys(local).length || Object.keys(saveFieldErrors).length ? null : saveError;

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Settings" description="Certificate wording and logo, and quiz defaults." />
      <div className="grid items-start gap-4 [grid-template-columns:1fr_1fr] max-md:[grid-template-columns:1fr]">
        <Card
          title="Certificate"
          subtitle="Used on every new certificate. Certificates already issued keep the wording they were issued with."
        >
          {(
            [
              ['orgName', 'Organisation name'],
              ['certTitle', 'Certificate title'],
              ['certIntro', 'Opening line'],
              ['certMid', 'Completion line'],
              ['certFooter', 'Footer line'],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <Input label={label} value={form[k]} maxLength={120} onChange={set(k)} />
              {err(k) && <p className="-mt-2 mb-2 text-xs font-bold text-r">{err(k)}</p>}
            </div>
          ))}
          <label className="mb-1 block text-xs font-bold">
            Logo
            <input
              key={fileKey}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-[5px] block text-xs font-medium"
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </label>
          {err('file') && <p className="mb-1 text-xs font-bold text-r">{err('file')}</p>}
          <p className="text-xs text-mu">
            {logo
              ? `New logo: ${logo.name}`
              : removeLogo
                ? 'The default LearnHub mark will be used.'
                : saved.hasLogo
                  ? 'A custom logo is in use.'
                  : 'Using the default LearnHub mark.'}{' '}
            PNG, JPG or WebP, up to {LOGO_MB} MB.
          </p>
          {saved.hasLogo && !logo && (
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} /> Go back
              to the default mark
            </label>
          )}
        </Card>
        <Card title="Preview" subtitle="Saved wording">
          <Preview s={saved} />
        </Card>
      </div>
      <Card
        title="Quiz defaults"
        subtitle="Starting values for new quizzes. Quizzes that already exist keep their own count and pass mark."
      >
        <div className="grid gap-x-4 [grid-template-columns:1fr_1fr] max-md:[grid-template-columns:1fr]">
          <div>
            <Input
              label="Questions per quiz"
              type="number"
              min={1}
              max={50}
              value={form.quizQuestionCount}
              onChange={set('quizQuestionCount')}
            />
            {err('quizQuestionCount') && (
              <p className="-mt-2 mb-2 text-xs font-bold text-r">{err('quizQuestionCount')}</p>
            )}
          </div>
          <div>
            <Input
              label="Correct answers to pass"
              type="number"
              min={1}
              value={form.quizPassMark}
              onChange={set('quizPassMark')}
            />
            {err('quizPassMark') && <p className="-mt-2 mb-2 text-xs font-bold text-r">{err('quizPassMark')}</p>}
          </div>
        </div>
      </Card>
      {firstError && <p className="mb-2 text-right text-xs font-bold text-r">{firstError}</p>}
      <div className="flex justify-end">
        <Button variant="pri" disabled={saveLoading} onClick={submit}>
          {saveLoading ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
