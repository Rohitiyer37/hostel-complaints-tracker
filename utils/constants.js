// Shared lists used by models, validators, controllers and views

const HOSTELS = ['Block A', 'Block B', 'Block C', 'Block D'];

// Each category has its own list of issues a student can pick from
const ISSUES = {
  Electrical: ['Fan not working', 'Light not working', 'Switch / socket fault', 'Geyser not working', 'Power outage', 'Other'],
  Plumbing: ['Leaking tap', 'Blocked drain', 'No water supply', 'Toilet flush problem', 'Shower not working', 'Other'],
  Cleaning: ['Room not cleaned', 'Washroom unclean', 'Corridor unclean', 'Garbage not collected', 'Pest problem', 'Other'],
  Furniture: ['Broken bed', 'Broken chair / table', 'Cupboard damaged', 'Door / window damaged', 'Mattress needs replacing', 'Other'],
  Internet: ['No connection', 'Slow speed', 'Keeps disconnecting', 'Wi-Fi login problem', 'Other'],
  Other: ['Security', 'Mess / food', 'Noise', 'General', 'Other']
};
const CATEGORIES = Object.keys(ISSUES);

// FLEXIBLE SCHEMA: optional extra field stored in extraDetails, different per category
const EXTRA_FIELDS = {
  Plumbing: { key: 'waterSource', label: 'Water source', options: ['Tap', 'Shower', 'Toilet', 'Water cooler'] },
  Electrical: { key: 'applianceType', label: 'Appliance', options: ['Fan', 'Light', 'Switch board', 'Geyser'] },
  Internet: { key: 'speedIssue', label: 'Problem', options: ['No connection', 'Slow speed', 'Keeps disconnecting'] }
};

const STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES = ['High', 'Medium', 'Low']; // most urgent first (also the sort order)

const SORT_OPTIONS = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  priority: 'Priority (high first)',
  status: 'Status'
};

const MAX_PHOTOS = 3;
const PAGE_SIZE = 10;

module.exports = {
  HOSTELS,
  ISSUES,
  CATEGORIES,
  EXTRA_FIELDS,
  STATUSES,
  PRIORITIES,
  SORT_OPTIONS,
  MAX_PHOTOS,
  PAGE_SIZE
};
