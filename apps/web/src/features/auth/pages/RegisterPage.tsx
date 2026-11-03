import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { registerSchema } from '@learnhub/shared';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useApi } from '../../../hooks/useApi';
import { authService } from '../../../services/authService';
import { useAuthStore } from '../../../stores/authStore';
import { homeOf } from '../../../utils/routes';
import { AuthShell } from '../AuthShell';

const empty = { name: '', mobile: '', email: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const nav = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const { state } = useLocation() as { state: { returnTo?: string } | null };
  const { loading: registerLoading, error: registerError, callAPI: registerAPI } = useApi(authService.register);
  const [form, setForm] = useState(empty);
  const [formError, setFormError] = useState('');
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) return setFormError(parsed.error.issues[0]?.message ?? 'Check your details.');
    setFormError('');
    const user = await registerAPI(parsed.data);
    if (user) {
      setUser(user);
      // Back to the course that asked for an account (LLD 5), else the dashboard.
      const back = state?.returnTo;
      nav(back && back.startsWith(`/${user.role.toLowerCase()}/`) ? back : homeOf(user.role), {
        replace: true,
      });
    }
  }

  return (
    <AuthShell
      title="Create account"
      sub="Student accounts are free."
      heading="Start learning today"
      text="Create a free student account. Instructor and admin accounts are created by an admin."
    >
      <form onSubmit={submit}>
        <Input label="Full name" value={form.name} onChange={set('name')} />
        <Input label="Mobile number" inputMode="numeric" value={form.mobile} onChange={set('mobile')} />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} />
        <Input label="Password" type="password" value={form.password} onChange={set('password')} />
        <Input
          label="Confirm password"
          type="password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
        />
        {(formError || registerError) && <p className="mb-3 text-xs font-bold text-r">{formError || registerError}</p>}
        <Button variant="pri" disabled={registerLoading} type="submit">
          Create account
        </Button>
      </form>
      <p className="mt-4 text-xs text-mu">
        Already registered?{' '}
        <Link className="font-bold text-p" to="/login" state={state}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
