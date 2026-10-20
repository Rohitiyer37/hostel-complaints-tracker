// Run once:  npm run seed   -> creates the admin (warden) account
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const email = 'warden@college.edu';
  if (await User.findOne({ email })) {
    console.log('Admin already exists:', email);
  } else {
    await User.create({
      name: 'Hostel Warden',
      email,
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      hostel: 'All Blocks'
    });
    console.log('Admin created ->', email, '/ admin123');
  }
  await mongoose.disconnect();
})();
