import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge, type BadgeTone } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pager } from '../../../components/ui/Pager';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Table, Td } from '../../../components/ui/Table';
import { useApi } from '../../../hooks/useApi';
import { reportService, type ActivityEntry, type ActivityType } from '../../../services/reportService';
import { useDebounced } from '../../../hooks/useDebounced';
import { formatDateTime } from '../../../utils/format';
import { field } from '../../../utils/styles';

const TYPES: Record<ActivityEntry['type'], { label: string; tone: BadgeTone }> = {
  APPROVAL: { label: 'Approval', tone: 'o' },
  USERS: { label: 'Users', tone: 'p' },
  SETTINGS: { label: 'Settings', tone: 'x' },
};

export default function ActivityLogPage() {
  const {
    data: activity,
    loading: activityLoading,
    error: activityError,
    callAPI: getActivityAPI,
  } = useApi(reportService.activity);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);

  useEffect(() => {
    setPage(1);
  }, [search, type]);
  useEffect(() => {
    void getActivityAPI({
      page,
      ...(search ? { q: search } : {}),
      ...(type ? { type: type as ActivityType } : {}),
    });
  }, [getActivityAPI, page, search, type]);

  return (
    <div>
      <PageHeader
        eyebrow="Audit"
        title="Activity log"
        description="Approvals, role changes, deactivations and other admin actions, with who did them and when."
        action={
          <Link to="/admin/dashboard">
            <Button>Back to dashboard</Button>
          </Link>
        }
      />
      <Card>
        <div className="mb-3.5 grid gap-2.5 [grid-template-columns:2fr_1fr]">
          <input
            className={field}
            placeholder="Search activity"
            aria-label="Search activity"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className={field} aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="APPROVAL">Approval</option>
            <option value="USERS">Users</option>
            <option value="SETTINGS">Settings</option>
          </select>
        </div>
        {activityError && <p className="text-xs font-bold text-r">{activityError}</p>}
        {activity && activity.items.length === 0 && (
          <EmptyState title="No activity matches" message="Try a different search or type." />
        )}
        {activity && activity.items.length > 0 && (
          <Table head={['When', 'Done by', 'Activity', 'Type']}>
            {activity.items.map((e) => (
              <tr key={e.id}>
                <Td className="whitespace-nowrap text-mu">{formatDateTime(e.createdAt)}</Td>
                <Td>{e.actorLabel}</Td>
                <Td>{e.text}</Td>
                <Td>
                  <Badge tone={TYPES[e.type].tone}>{TYPES[e.type].label}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {activityLoading && !activity && <p className="text-xs text-mu">Loading…</p>}
        {activity && (
          <Pager page={activity.page} pageSize={activity.pageSize} total={activity.total} onChange={setPage} />
        )}
      </Card>
    </div>
  );
}
