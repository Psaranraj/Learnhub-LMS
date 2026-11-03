import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { createUserSchema, passwordSchema, updateUserSchema, type Role } from '@learnhub/shared';
import { Badge, type BadgeTone } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';
import { Modal, ModalActions } from '../../../components/ui/Modal';
import { Pager } from '../../../components/ui/Pager';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Table, Td } from '../../../components/ui/Table';
import { useApi } from '../../../hooks/useApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { userService, type AdminUser, type UserStatus } from '../../../services/userService';
import { useAuthStore } from '../../../stores/authStore';
import { useUiStore } from '../../../stores/uiStore';
import { suggestPassword } from '../../../utils/password';
import { field } from '../../../utils/styles';

type Secret = { name: string; email: string; password: string; created: boolean };
type Form = {
  id: number | null;
  name: string;
  email: string;
  role: Role;
  mobile: string;
  password: string;
  nameLocked: boolean;
};
type Reset = { id: number; name: string; password: string };

const ROLE_BADGE: Record<Role, { label: string; tone: BadgeTone }> = {
  ADMIN: { label: 'Admin', tone: 'r' },
  INSTRUCTOR: { label: 'Instructor', tone: 'o' },
  STUDENT: { label: 'Student', tone: 'p' },
};
const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Student',
  INSTRUCTOR: 'Instructor',
  ADMIN: 'Admin',
};
const firstIssue = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues[0]?.message ?? 'Check the form.';
const courses = (n: number) => `${n} course${n === 1 ? '' : 's'}`;

// Users and roles, as in the design (v3, HLD 6 "Admin-made accounts" and "Account safeguards").
export default function UsersPage() {
  const me = useAuthStore((s) => s.user)!;
  const toast = useUiStore((s) => s.showToast);
  const { data: users, loading: usersLoading, error: usersError, callAPI: getUsersAPI } = useApi(userService.list);
  const { data: resetRequests, callAPI: getResetRequestsAPI } = useApi(userService.resetRequests);
  const {
    loading: createLoading,
    error: createError,
    fieldErrors: createFieldErrors,
    callAPI: createUserAPI,
  } = useApi(userService.create);
  const {
    loading: updateLoading,
    error: updateError,
    fieldErrors: updateFieldErrors,
    callAPI: updateUserAPI,
  } = useApi(userService.update);
  const { loading: statusLoading, error: statusError, callAPI: setUserStatusAPI } = useApi(userService.setStatus);
  const {
    loading: resetPasswordLoading,
    error: resetPasswordError,
    callAPI: resetPasswordAPI,
  } = useApi(userService.resetPassword);

  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [state, setState] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);

  const [form, setForm] = useState<Form | null>(null);
  const [formError, setFormError] = useState('');
  const [toggle, setToggle] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<Reset | null>(null);
  const [resetError, setResetError] = useState('');
  const [secret, setSecret] = useState<Secret | null>(null);

  const load = useCallback(() => {
    void getUsersAPI({
      page,
      ...(search ? { q: search } : {}),
      ...(role ? { role } : {}),
      ...(state ? { status: state } : {}),
    });
    void getResetRequestsAPI({ pageSize: 10 });
  }, [getUsersAPI, getResetRequestsAPI, page, search, role, state]); // eslint-disable-line react-hooks/exhaustive-deps

  // The dashboard opens this page with ?create=1 (Create user) or ?reset=<user id> (a password reset request).
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const resetId = Number(params.get('reset'));
    if (params.get('create') === '1') openCreate();
    else if (resetId) {
      const r = resetRequests?.items.find((x) => x.user.id === resetId);
      if (!r) return; // wait for the requests list
      setResetError('');
      setResetting({ id: r.user.id, name: r.user.name, password: suggestPassword() });
    } else return;
    setParams(
      (p) => {
        p.delete('create');
        p.delete('reset');
        return p;
      },
      { replace: true },
    );
  }, [params, resetRequests]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1);
  }, [search, role, state]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (statusError) toast(statusError);
  }, [statusError, toast]);

  const openCreate = () => {
    setFormError('');
    setForm({
      id: null,
      name: '',
      email: '',
      role: 'STUDENT',
      mobile: '',
      password: suggestPassword(),
      nameLocked: false,
    });
  };
  const openEdit = (u: AdminUser) => {
    setFormError('');
    setForm({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      mobile: '',
      password: '',
      nameLocked: u.role === 'INSTRUCTOR' && u.courseCount > 0,
    });
  };

  async function save() {
    if (!form) return;
    if (form.id) {
      const body = {
        name: form.nameLocked ? undefined : form.name,
        email: form.email,
        role: form.role,
      };
      const parsed = updateUserSchema.safeParse(body);
      if (!parsed.success) return setFormError(firstIssue(parsed));
      setFormError('');
      if (await updateUserAPI(form.id, parsed.data)) {
        setForm(null);
        toast('User updated');
        load();
      }
      return;
    }
    const body = {
      name: form.name,
      email: form.email,
      role: form.role,
      mobile: form.mobile,
      temporaryPassword: form.password,
    };
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) return setFormError(firstIssue(parsed));
    setFormError('');
    const res = await createUserAPI(body);
    if (res) {
      setForm(null);
      load();
      setSecret({
        name: res.user.name,
        email: res.user.email,
        password: res.temporaryPassword,
        created: true,
      });
    }
  }

  async function confirmReset() {
    if (!resetting) return;
    const parsed = passwordSchema.safeParse(resetting.password);
    if (!parsed.success) return setResetError(firstIssue(parsed));
    setResetError('');
    const res = await resetPasswordAPI(resetting.id, resetting.password);
    if (res) {
      setResetting(null);
      load();
      setSecret({
        name: res.user.name,
        email: res.user.email,
        password: res.temporaryPassword,
        created: false,
      });
    }
  }

  async function setActive(u: AdminUser, next: UserStatus) {
    if (await setUserStatusAPI(u.id, next)) {
      setToggle(null);
      toast(next === 'ACTIVE' ? 'User activated' : 'User deactivated');
      load();
    }
  }

  const items = users?.items ?? [];
  const busy = createLoading || updateLoading;
  const saveError = formError || createError || updateError;
  const fieldErrors = { ...createFieldErrors, ...updateFieldErrors };

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Users and roles"
        description="Create instructor and admin accounts, and activate or deactivate users."
        action={
          <Button variant="pri" onClick={openCreate}>
            Create user
          </Button>
        }
      />
      <p className="mb-4 rounded-[9px] bg-lv p-3 text-xs leading-normal text-p">
        Students can register themselves. You can also create any account here with a temporary password. The person
        changes it in Account settings.
      </p>

      {resetRequests && resetRequests.items.length > 0 && (
        <Card
          title="Password reset requests"
          subtitle="People who used Forgot password. Reset gives them a new temporary password."
        >
          {resetRequests.items.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 border-t border-ln py-2.5 text-xs first:border-t-0"
            >
              <span>
                <strong>{r.user.name}</strong>
                <br />
                <span className="text-mu">{r.user.email}</span>
              </span>
              <Button
                variant="pri"
                onClick={() => {
                  setResetError('');
                  setResetting({ id: r.user.id, name: r.user.name, password: suggestPassword() });
                }}
              >
                Reset password
              </Button>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <div className="mb-3.5 grid gap-2.5 [grid-template-columns:2fr_1fr_1fr] max-md:[grid-template-columns:1fr]">
          <input
            className={field}
            placeholder="Search name or email"
            aria-label="Search users"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className={field}
            aria-label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role | '')}
          >
            <option value="">All roles</option>
            <option value="STUDENT">Student</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select
            className={field}
            aria-label="Status"
            value={state}
            onChange={(e) => setState(e.target.value as UserStatus | '')}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        {usersError && <p className="text-xs font-bold text-r">{usersError}</p>}
        {users && items.length === 0 && (
          <EmptyState title="No users match" message="Try a different search or filter." />
        )}
        {items.length > 0 && (
          <Table head={['User', 'Role', 'Status', 'Actions']}>
            {items.map((u) => {
              const self = u.id === me.id;
              return (
                <tr key={u.id}>
                  <Td>
                    <strong>{u.name}</strong>
                    {self && <span className="text-mu"> (you)</span>}
                    <br />
                    <span className="text-mu">{u.email}</span>
                    {u.mustChangePassword && (
                      <>
                        <br />
                        <span className="mt-1 inline-block">
                          <Badge tone="o">Temporary password</Badge>
                        </span>
                      </>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={ROLE_BADGE[u.role].tone}>{ROLE_BADGE[u.role].label}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={u.status === 'ACTIVE' ? 'g' : 'x'}>
                      {u.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="flex flex-wrap gap-1.5">
                      {u.role !== 'STUDENT' && <Button onClick={() => openEdit(u)}>Edit</Button>}
                      <Button
                        disabled={self}
                        onClick={() => {
                          setResetError('');
                          setResetting({ id: u.id, name: u.name, password: suggestPassword() });
                        }}
                      >
                        Reset password
                      </Button>
                      <Button
                        variant={u.status === 'ACTIVE' ? 'danger' : 'default'}
                        disabled={self || statusLoading}
                        onClick={() => (u.status === 'ACTIVE' ? setToggle(u) : setActive(u, 'ACTIVE'))}
                      >
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </span>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
        {usersLoading && !users && <p className="text-xs text-mu">Loading…</p>}
        {users && <Pager page={users.page} pageSize={users.pageSize} total={users.total} onChange={setPage} />}
      </Card>

      <Modal open={!!form} title={form?.id ? 'Edit user' : 'Create user'} onClose={() => setForm(null)}>
        {form && (
          <>
            <Input
              label="Full name"
              value={form.name}
              disabled={form.nameLocked}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {form.nameLocked && (
              <p className="-mt-2 mb-3 text-xs text-mu">Name is locked because courses and records are linked to it.</p>
            )}
            {fieldErrors.name && <p className="-mt-2 mb-3 text-xs font-bold text-r">{fieldErrors.name}</p>}
            <Input
              label="Email"
              type="email"
              placeholder="name@learnhub.in"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {fieldErrors.email && <p className="-mt-2 mb-3 text-xs font-bold text-r">{fieldErrors.email}</p>}
            <label className="mb-3 block text-xs font-bold">
              Role
              <select
                className={`${field} mt-[5px]`}
                disabled={form.id === me.id}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                {(form.id ? (['INSTRUCTOR', 'ADMIN'] as Role[]) : (['STUDENT', 'INSTRUCTOR', 'ADMIN'] as Role[])).map(
                  (r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ),
                )}
              </select>
            </label>
            {!form.id && form.role === 'STUDENT' && (
              <Input
                label="Mobile number (students, optional)"
                inputMode="numeric"
                maxLength={10}
                placeholder="10 digits"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            )}
            {!form.id && (
              <>
                <label className="mb-1 block text-xs font-bold">Temporary password</label>
                <div className="mb-3 flex gap-2">
                  <input
                    className={`${field} font-mono`}
                    aria-label="Temporary password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <Button onClick={() => setForm({ ...form, password: suggestPassword() })}>Generate</Button>
                </div>
                <p className="mb-3 rounded-[9px] bg-lv p-3 text-xs text-p">
                  The person signs in with this temporary password and changes it in Account settings.
                </p>
              </>
            )}
            {saveError && <p className="mb-2 text-xs font-bold text-r">{saveError}</p>}
            <ModalActions>
              <Button onClick={() => setForm(null)}>Cancel</Button>
              <Button variant="pri" disabled={busy} onClick={save}>
                {form.id ? 'Save' : 'Create account'}
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>

      <Modal open={!!toggle} title="Deactivate user?" onClose={() => setToggle(null)}>
        {toggle && (
          <>
            <p className="mb-3 text-xs">{toggle.name} will no longer be able to sign in. Their records are kept.</p>
            {toggle.role === 'INSTRUCTOR' && toggle.courseCount > 0 && (
              <p className="mb-3 rounded-[9px] bg-[#fff2df] p-3 text-xs leading-normal text-[#8a5a10]">
                {courses(toggle.courseCount)} stay as they are. You can assign another instructor from{' '}
                <Link className="font-bold underline" to="/admin/courses">
                  Courses and approvals
                </Link>
                .
              </p>
            )}
            <ModalActions>
              <Button onClick={() => setToggle(null)}>Cancel</Button>
              <Button variant="danger" disabled={statusLoading} onClick={() => setActive(toggle, 'INACTIVE')}>
                Deactivate
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>

      <Modal open={!!resetting} title="Reset password?" onClose={() => setResetting(null)}>
        {resetting && (
          <>
            <p className="mb-3 text-xs">
              {resetting.name} will be signed out everywhere and given this new temporary password. The old password
              stops working, and they must change it after signing in.
            </p>
            <label className="mb-1 block text-xs font-bold">Temporary password</label>
            <div className="mb-3 flex gap-2">
              <input
                className={`${field} font-mono`}
                aria-label="Temporary password"
                value={resetting.password}
                onChange={(e) => setResetting({ ...resetting, password: e.target.value })}
              />
              <Button onClick={() => setResetting({ ...resetting, password: suggestPassword() })}>Generate</Button>
            </div>
            {(resetError || resetPasswordError) && (
              <p className="mb-2 text-xs font-bold text-r">{resetError || resetPasswordError}</p>
            )}
            <ModalActions>
              <Button onClick={() => setResetting(null)}>Cancel</Button>
              <Button variant="pri" disabled={resetPasswordLoading} onClick={confirmReset}>
                Reset password
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>

      <Modal
        open={!!secret}
        title={secret?.created ? 'Account created' : 'Password reset'}
        onClose={() => setSecret(null)}
      >
        {secret && (
          <>
            <p className="mb-3 rounded-[9px] bg-[#e4f8f0] p-3 text-xs leading-normal text-[#0e6e4e]">
              Share these details with {secret.name}. They sign in, then change the password in Account settings. This
              password is shown only once.
            </p>
            <div className="mb-3 grid gap-1 text-xs">
              <span className="text-mu">Email</span>
              <strong>{secret.email}</strong>
              <span className="mt-2 text-mu">Temporary password</span>
              <strong className="select-all font-mono text-sm">{secret.password}</strong>
            </div>
            <ModalActions>
              <Button
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(`Email: ${secret.email}\nTemporary password: ${secret.password}`)
                    .then(
                      () => toast('Copied'),
                      () => toast('Select and copy the password'),
                    );
                }}
              >
                Copy details
              </Button>
              <Button variant="pri" onClick={() => setSecret(null)}>
                Done
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>
    </div>
  );
}
