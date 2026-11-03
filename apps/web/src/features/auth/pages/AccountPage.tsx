import { useState, type ChangeEvent } from 'react';
import { changePasswordSchema } from '@learnhub/shared';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useApi } from '../../../hooks/useApi';
import { authService } from '../../../services/authService';
import { useAuthStore } from '../../../stores/authStore';
import { useUiStore } from '../../../stores/uiStore';

const empty = { currentPassword: '', newPassword: '', confirmPassword: '' };

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <label className="mb-3 block text-xs font-bold">
      {label}
      <input
        readOnly
        value={value}
        className="mt-[5px] w-full rounded-lg border border-ln bg-bg p-2.5 font-medium text-mu"
      />
    </label>
  );
}

// Details are read-only after registration (HLD 6, "Account details"). Only the password can change.
export default function AccountPage() {
  const user = useAuthStore((s) => s.user)!;
  const setUser = useAuthStore((s) => s.setUser);
  const toast = useUiStore((s) => s.showToast);
  const {
    loading: passwordLoading,
    error: passwordError,
    callAPI: changePasswordAPI,
  } = useApi(authService.changePassword);
  const [form, setForm] = useState(empty);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    const parsed = changePasswordSchema.safeParse(form);
    if (!parsed.success) return setErr(parsed.error.issues[0]?.message ?? 'Check the passwords.');
    setErr('');
    if (await changePasswordAPI(parsed.data)) {
      setForm(empty);
      setUser({ ...user, mustChangePassword: false });
      toast('Password updated');
    }
  }
  const set = (k: keyof typeof empty) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });
  const type = show ? 'text' : 'password';

  return (
    <div className="max-w-xl">
      <PageHeader eyebrow="Account" title="Account settings" description="Your details and password." />
      <Card
        title="Your details"
        subtitle={
          user.role === 'STUDENT'
            ? 'Entered when you registered. Contact the admin to change them.'
            : 'Set by your admin. Contact the admin to change them.'
        }
      >
        <ReadOnly label="Full name" value={user.name} />
        <ReadOnly label="Email" value={user.email} />
        <ReadOnly label="Role" value={user.role.charAt(0) + user.role.slice(1).toLowerCase()} />
        {user.mobile && <ReadOnly label="Mobile number" value={user.mobile} />}
      </Card>
      <Card title="Change password" subtitle="Enter your current password first.">
        <Input
          label="Current password"
          type={type}
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
        />
        <Input
          label="New password"
          type={type}
          autoComplete="new-password"
          value={form.newPassword}
          onChange={set('newPassword')}
        />
        <Input
          label="Confirm new password"
          type={type}
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
        />
        <p className="mb-3 text-xs text-mu">
          At least 8 characters, with a letter and a number. It must be different from your current password.
        </p>
        <label className="mb-3 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show password
        </label>
        {(err || passwordError) && <p className="mb-2 text-xs font-bold text-r">{err || passwordError}</p>}
        <Button variant="pri" disabled={passwordLoading} onClick={submit}>
          Update password
        </Button>
      </Card>
    </div>
  );
}
