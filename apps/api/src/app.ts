import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { requireJsonOrMultipart } from './middleware/contentType';
import { errorHandler, notFound } from './middleware/error';
import { activityRoutes } from './modules/activity/activity.routes';
import {
  courseSubmissionRoutes,
  myAssignmentsRoutes,
  submissionsRoutes,
} from './modules/assignments/assignments.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { certificatesRoutes } from './modules/certificates/certificates.routes';
import { coursesRoutes, lessonsRoutes } from './modules/courses/courses.routes';
import {
  enrollmentsRoutes,
  myEnrollmentsRoutes,
  studentsProgressRoutes,
} from './modules/enrollments/enrollments.routes';
import { learningRoutes } from './modules/learning/learning.routes';
import { alertsRoutes, dashboardRoutes, reportsRoutes } from './modules/reports/reports.routes';
import { settingsRoutes } from './modules/settings/settings.routes';
import { attemptsRoutes, myQuizzesRoutes, quizzesRoutes } from './modules/quizzes/quizzes.routes';
import { studentsRoutes, usersRoutes } from './modules/users/users.routes';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(requireJsonOrMultipart);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/courses', enrollmentsRoutes);
app.use('/api/courses', courseSubmissionRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/lessons', quizzesRoutes);
app.use('/api/students', studentsProgressRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/enrollments', myEnrollmentsRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/quizzes', myQuizzesRoutes);
app.use('/api/quiz-attempts', attemptsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/assignments', myAssignmentsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

// Every module of LLD 3 is mounted (phases 3 to 8, see PORT_STATUS.md).

app.use(notFound);
app.use(errorHandler);
