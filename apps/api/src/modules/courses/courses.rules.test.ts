import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkEditable, checkOrder, checkOwner, checkStructure, checkSubmit } from './courses.rules';
import { readiness, type ReadinessInput } from './readiness';

// HLD 6, "Course status", "Ready to submit" and "Editing a Published course".
describe('instructor moves', () => {
  it('only the owner changes a course', () => {
    assert.throws(() => checkOwner(7, 8), /Only the instructor/);
    assert.doesNotThrow(() => checkOwner(7, 7));
  });
  it('locks editing while Pending review', () => {
    assert.throws(() => checkEditable('PENDING_REVIEW'), /locked/);
    for (const s of ['DRAFT', 'REJECTED', 'PUBLISHED'] as const) assert.doesNotThrow(() => checkEditable(s));
  });
  it('allows structure changes in Draft and Rejected only', () => {
    assert.doesNotThrow(() => checkStructure('DRAFT'));
    assert.doesNotThrow(() => checkStructure('REJECTED'));
    assert.throws(() => checkStructure('PUBLISHED'), /unpublish/);
    assert.throws(() => checkStructure('PENDING_REVIEW'), /locked/);
  });
  it('submits from Draft or Rejected when nothing is missing', () => {
    assert.doesNotThrow(() => checkSubmit('DRAFT', []));
    assert.doesNotThrow(() => checkSubmit('REJECTED', []));
    assert.throws(() => checkSubmit('DRAFT', ['At least one lesson']), /At least one lesson/);
    assert.throws(() => checkSubmit('PENDING_REVIEW', []), /already waiting/);
    assert.throws(() => checkSubmit('PUBLISHED', []), /already published/);
  });
  it('a new lesson order names every lesson once', () => {
    assert.doesNotThrow(() => checkOrder([1, 2, 3], [3, 1, 2]));
    assert.throws(() => checkOrder([1, 2, 3], [1, 2]), /exactly once/);
    assert.throws(() => checkOrder([1, 2, 3], [1, 1, 2]), /exactly once/);
    assert.throws(() => checkOrder([1, 2, 3], [1, 2, 9]), /exactly once/);
  });
});

const question = (i: number) => ({
  version: 1,
  position: i + 1,
  text: `Question ${i + 1}`,
  options: ['A', 'B', 'C', 'D'],
  correctIndex: i % 4,
});
const ready: ReadinessInput = {
  title: 'Python for Beginners',
  description: 'Variables, loops and functions.',
  category: 'DEVELOPMENT',
  level: 'BEGINNER',
  lessons: [
    {
      title: 'Basics',
      videoUrl: 'https://youtu.be/abc',
      durationMin: 10,
      quiz: {
        version: 1,
        questionCount: 10,
        questions: Array.from({ length: 10 }, (_, i) => question(i)),
      },
    },
  ],
  assignment: {
    title: 'Number games',
    instructions: 'Write three programs.',
    todoItems: ['Write the code', 'Add screenshots'],
  },
};

describe('readiness', () => {
  it('passes a complete course', () => {
    assert.equal(readiness(ready).ready, true);
  });
  it('needs a description of 10 or more characters', () => {
    assert.equal(readiness({ ...ready, description: 'Short' }).ready, false);
  });
  it('needs every question of the current version', () => {
    const lesson = {
      ...ready.lessons[0],
      quiz: { ...ready.lessons[0].quiz!, questions: ready.lessons[0].quiz!.questions.slice(0, 9) },
    };
    assert.equal(readiness({ ...ready, lessons: [lesson] }).ready, false);
  });
  it('needs a YouTube or Vimeo link', () => {
    const lesson = { ...ready.lessons[0], videoUrl: 'https://example.com/video.mp4' };
    assert.equal(readiness({ ...ready, lessons: [lesson] }).ready, false);
  });
  it('needs the assignment with two to-do items', () => {
    assert.equal(readiness({ ...ready, assignment: null }).ready, false);
    assert.equal(readiness({ ...ready, assignment: { ...ready.assignment!, todoItems: ['Only one'] } }).ready, false);
  });
});
