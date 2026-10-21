require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { migrateLegacyComplaints } = require('./services/complaintService');

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error('MONGO_URI and JWT_SECRET must be set (copy .env.example to .env)');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await migrateLegacyComplaints();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log('Server running on http://localhost:' + port));
  })
  .catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
  });
