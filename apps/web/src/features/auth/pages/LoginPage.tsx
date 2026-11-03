import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { forgotPasswordSchema, loginSchema } from '@learnhub/shared';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useApi } from '../../../hooks/useApi';
import { authService } from '../../../services/authService';
import { useAuthStore } from '../../../stores/authStore';
import { useUiStore } from '../../../stores/uiStore';
import { homeOf } from '../../../utils/routes';
import { AuthShell } from '../AuthShell';

function ForgotModal({ initial, onClose }: { initial: string; onClose: () => void }) {
  const toast = useUiStore((s) => s.showToast);
  const { loading: forgotLoading, error: forgotError, callAPI: forgotPasswordAPI } = useApi(authService.forgotPassword);
  const [email, setEmail] = useState(initial);
  const [err, setErr] = useState('');

  async function submit() {
    const p = forgotPasswordSchema.safeParse({ email });
    if (!p.success) return setErr(p.error.issues[0]?.message ?? 'Enter a valid email.');
    setErr('');
    if (await forgotPasswordAPI(p.data)) {
      toast('If this email has an account, the admin has been notified');
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9] grid place-items-center bg-[#0e102080] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[520px] rounded-[14px] bg-white p-[22px]">
        <h2 className="mb-3.5 text-xl font-extrabold">Forgot password?</h2>
        <p className="mb-3 text-[11px] leading-normal text-mu">
          Enter your account email. Your admin will reset your password and give you a temporary one. You can then
          change it in Account settings.
        </p>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {(err || forgotError) && <p className="mb-2 text-xs font-bold text-r">{err || forgotError}</p>}
        <div className="mt-3.5 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="pri" disabled={forgotLoading} onClick={submit}>
            Send request
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const nav = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const { state } = useLocation() as { state: { returnTo?: string } | null };
  const { loading: loginLoading, error: loginError, callAPI: loginAPI } = useApi(authService.login);
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) return setFormError(parsed.error.issues[0]?.message ?? 'Check your details.');
    setFormError('');
    const user = await loginAPI(parsed.data);
    if (user) {
      setUser(user);
      // Back to the page that asked for sign-in when it belongs to this role, else the role's dashboard.
      const back = state?.returnTo;
      nav(back && back.startsWith(`/${user.role.toLowerCase()}/`) ? back : homeOf(user.role), {
        replace: true,
      });
    }
  }

  return (
    <AuthShell
      title="Sign in"
      sub="Use your email and password."
      heading="Welcome back"
      text="Sign in to continue learning, teaching or managing LearnHub. You will land on the page for your role."
    >
      <form onSubmit={submit}>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="username"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Password"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <div className="mb-3.5 flex items-center justify-between text-xs">
          <label className="flex items-center gap-1.5 text-mu">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            Show password
          </label>
          <button type="button" className="font-bold text-p" onClick={() => setForgot(true)}>
            Forgot password?
          </button>
        </div>
        {state?.returnTo?.includes('enroll=1') && (
          <p className="mb-3 rounded-[9px] bg-lv p-3 text-xs text-p">
            Sign in to enroll. We will finish your enrollment.
          </p>
        )}
        {(formError || loginError) && (
          <p className="mb-3 rounded-[9px] bg-[#fff2df] p-3 text-xs text-[#8a5a10]">{formError || loginError}</p>
        )}
        <Button variant="pri" className="w-full" disabled={loginLoading} type="submit">
          Sign in
        </Button>
      </form>
      <p className="mt-3.5 text-center text-[11px] text-mu">
        New student?{' '}
        <Link className="font-bold text-p" to="/register" state={state}>
          Create an account
        </Link>
      </p>
      <p className="m-0 text-center text-[11px] text-mu">Instructor and admin accounts are created by an admin.</p>
      {forgot && <ForgotModal initial={form.email} onClose={() => setForgot(false)} />}
    </AuthShell>
  );
}
