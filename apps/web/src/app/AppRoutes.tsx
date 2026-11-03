import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ROLES, type Role } from '@learnhub/shared';
import ActivityLogPage from '../features/admin/pages/ActivityLogPage';
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage';
import AdminCertificatesPage from '../features/admin/pages/AdminCertificatesPage';
import AdminCourseReviewPage from '../features/admin/pages/AdminCourseReviewPage';
import AdminCoursesPage from '../features/admin/pages/AdminCoursesPage';
import PermissionsPage from '../features/admin/pages/PermissionsPage';
import ReportsPage from '../features/admin/pages/ReportsPage';
import SettingsPage from '../features/admin/pages/SettingsPage';
import UsersPage from '../features/admin/pages/UsersPage';
import CourseBuilderPage from '../features/instructor/pages/CourseBuilderPage';
import InstructorCertificatesPage from '../features/instructor/pages/InstructorCertificatesPage';
import InstructorCourseDetailPage from '../features/instructor/pages/InstructorCourseDetailPage';
import InstructorDashboardPage from '../features/instructor/pages/InstructorDashboardPage';
import InstructorCoursesPage from '../features/instructor/pages/InstructorCoursesPage';
import StudentDetailPage from '../features/instructor/pages/StudentDetailPage';
import StudentsProgressPage from '../features/instructor/pages/StudentsProgressPage';
import AccountPage from '../features/auth/pages/AccountPage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import PublicLayout from '../features/public/PublicLayout';
import HomePage from '../features/public/pages/HomePage';
import PublicCourseDetailPage from '../features/public/pages/PublicCourseDetailPage';
import AssignmentsPage from '../features/student/pages/AssignmentsPage';
import CatalogPage from '../features/student/pages/CatalogPage';
import CertificatesPage from '../features/student/pages/CertificatesPage';
import LearningWorkspacePage from '../features/student/pages/LearningWorkspacePage';
import MyCoursesPage from '../features/student/pages/MyCoursesPage';
import QuizAttemptPage from '../features/student/pages/QuizAttemptPage';
import QuizResultPage from '../features/student/pages/QuizResultPage';
import QuizzesPage from '../features/student/pages/QuizzesPage';
import StudentCourseDetailPage from '../features/student/pages/StudentCourseDetailPage';
import StudentDashboardPage from '../features/student/pages/StudentDashboardPage';
import { RequireRole } from './RequireRole';
import { RoleLayout } from './RoleLayout';

type Page = { path: string; element: ReactNode };
// LLD 5 route map: every screen of the final design.
const PAGES: Record<Role, Page[]> = {
  STUDENT: [
    { path: 'dashboard', element: <StudentDashboardPage /> },
    { path: 'courses', element: <MyCoursesPage /> },
    { path: 'courses/:id', element: <StudentCourseDetailPage /> },
    { path: 'catalog', element: <CatalogPage /> },
    { path: 'learn/:courseId', element: <LearningWorkspacePage /> },
    { path: 'quizzes', element: <QuizzesPage /> },
    { path: 'quizzes/:lessonId/attempt', element: <QuizAttemptPage /> },
    { path: 'quizzes/attempts/:attemptId', element: <QuizResultPage /> },
    { path: 'assignments', element: <AssignmentsPage /> },
    { path: 'certificates', element: <CertificatesPage /> },
  ],
  INSTRUCTOR: [
    { path: 'dashboard', element: <InstructorDashboardPage /> },
    { path: 'courses', element: <InstructorCoursesPage /> },
    { path: 'courses/:id', element: <InstructorCourseDetailPage /> },
    { path: 'courses/:id/build', element: <CourseBuilderPage /> },
    { path: 'students', element: <StudentsProgressPage /> },
    { path: 'students/:studentId', element: <StudentDetailPage /> },
    { path: 'certificates', element: <InstructorCertificatesPage /> },
  ],
  ADMIN: [
    { path: 'dashboard', element: <AdminDashboardPage /> },
    { path: 'courses', element: <AdminCoursesPage /> },
    { path: 'courses/:id', element: <AdminCourseReviewPage /> },
    { path: 'users', element: <UsersPage /> },
    { path: 'activity', element: <ActivityLogPage /> },
    { path: 'permissions', element: <PermissionsPage /> },
    { path: 'certificates', element: <AdminCertificatesPage /> },
    { path: 'reports', element: <ReportsPage /> },
    { path: 'settings', element: <SettingsPage /> },
  ],
};

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses/:id" element={<PublicCourseDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      {Object.values(ROLES).map((role) => (
        <Route key={role} element={<RequireRole role={role} />}>
          <Route path={`/${role.toLowerCase()}`} element={<RoleLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="account" element={<AccountPage />} />
            {PAGES[role].map((p) => (
              <Route key={p.path} path={p.path} element={p.element} />
            ))}
          </Route>
        </Route>
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
