const test = require('node:test');
const assert = require('node:assert');
const v = require('../utils/validators');
const { formatComplaintId, buildPager, parsePage } = require('../utils/helpers');

const goodComplaint = {
  category: 'Electrical',
  issue: 'Fan not working',
  hostel: 'Block A',
  roomNo: 'a-204',
  description: 'The ceiling fan stopped working last night.'
};

test('registration: accepts valid input and normalises it', () => {
  const { value, error } = v.validateRegistration({
    name: ' Asha ', email: 'ASHA@College.edu ', password: 'secret1', hostel: 'Block B', roomNo: 'b-12'
  });
  assert.strictEqual(error, null);
  assert.strictEqual(value.name, 'Asha');
  assert.strictEqual(value.email, 'asha@college.edu');
  assert.strictEqual(value.roomNo, 'B-12');
});

test('registration: rejects bad email, short password, unknown hostel, missing room', () => {
  const base = { name: 'Asha', email: 'a@b.co', password: 'secret1', hostel: 'Block A', roomNo: '12' };
  assert.match(v.validateRegistration({ ...base, email: 'nope' }).error, /email/);
  assert.match(v.validateRegistration({ ...base, password: '123' }).error, /Password/);
  assert.match(v.validateRegistration({ ...base, hostel: 'Block Z' }).error, /hostel/);
  assert.match(v.validateRegistration({ ...base, roomNo: '' }).error, /room/);
});

test('registration: non-string input does not throw', () => {
  const { error } = v.validateRegistration({ name: ['x'], email: { $gt: '' }, password: 5 });
  assert.ok(error);
});

test('complaint: valid input, title defaults to the issue', () => {
  const { value, error } = v.validateComplaint(goodComplaint);
  assert.strictEqual(error, null);
  assert.strictEqual(value.title, 'Fan not working');
  assert.strictEqual(value.priority, 'Medium');
});

test('complaint: issue must belong to the chosen category', () => {
  const { error } = v.validateComplaint({ ...goodComplaint, issue: 'Leaking tap' });
  assert.match(error, /issue/);
});

test('complaint: description length is checked', () => {
  assert.match(v.validateComplaint({ ...goodComplaint, description: 'short' }).error, /Description/);
});

test('complaint: only the extra field of the chosen category is kept', () => {
  const { value } = v.validateComplaint({ ...goodComplaint, applianceType: 'Fan', waterSource: 'Tap' });
  assert.deepStrictEqual(value.extraDetails, { applianceType: 'Fan' });
});

test('status update: status and priority must be known values', () => {
  assert.strictEqual(v.validateStatusUpdate({ status: 'Rejected', priority: 'High' }).error, null);
  assert.ok(v.validateStatusUpdate({ status: 'Closed', priority: 'High' }).error);
  assert.ok(v.validateStatusUpdate({ status: 'Pending', priority: 'Urgent' }).error);
});

test('profile: hostel and room are only required for students', () => {
  assert.strictEqual(v.validateProfile({ name: 'Warden', email: 'w@c.edu' }, 'admin').error, null);
  assert.ok(v.validateProfile({ name: 'Asha', email: 'a@c.edu' }, 'student').error);
});

test('filters: unknown values are dropped, sort defaults to newest', () => {
  const f = v.parseComplaintFilters({ status: 'Hacked', category: 'Plumbing', issue: 'Fan not working', from: '2026-13-45', student: 'x', sort: 'evil' });
  assert.strictEqual(f.status, '');
  assert.strictEqual(f.category, 'Plumbing');
  assert.strictEqual(f.issue, ''); // not a plumbing issue
  assert.strictEqual(f.from, '');
  assert.strictEqual(f.student, '');
  assert.strictEqual(f.sort, 'newest');
});

test('isObjectId', () => {
  assert.ok(v.isObjectId('64b7f0c2a1b2c3d4e5f60718'));
  assert.ok(!v.isObjectId('not-an-id'));
  assert.ok(!v.isObjectId(undefined));
});

test('complaint IDs are zero padded', () => {
  assert.strictEqual(formatComplaintId(1), 'CMP-0001');
  assert.strictEqual(formatComplaintId(123), 'CMP-0123');
  assert.strictEqual(formatComplaintId(12345), 'CMP-12345');
});

test('pagination helpers', () => {
  assert.strictEqual(parsePage('3'), 3);
  assert.strictEqual(parsePage('-1'), 1);
  assert.strictEqual(parsePage('abc'), 1);
  const p = buildPager(25, 2, 10, { status: 'Pending', q: '' });
  assert.strictEqual(p.pages, 3);
  assert.strictEqual(p.from, 11);
  assert.strictEqual(p.to, 20);
  assert.strictEqual(p.link(3), '?status=Pending&page=3');
  assert.strictEqual(p.link(1), '?status=Pending');
});
