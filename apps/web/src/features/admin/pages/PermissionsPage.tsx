import { ROLE_PERMISSIONS } from '@learnhub/shared';
import { Card } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Table, Td } from '../../../components/ui/Table';

// Read-only, as in the design (Admin / Permissions). The server enforces every rule; this page describes them.
export default function PermissionsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Security"
        title="Roles and permissions"
        description="Fixed roles. A read-only summary of what each role can do. Every action is checked on the server."
      />
      <Card>
        <Table head={['Area', 'Student', 'Instructor', 'Admin']}>
          {ROLE_PERMISSIONS.map((p) => (
            <tr key={p.area}>
              <Td>
                <strong>{p.area}</strong>
              </Td>
              <Td>{p.student}</Td>
              <Td>{p.instructor}</Td>
              <Td>{p.admin}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
