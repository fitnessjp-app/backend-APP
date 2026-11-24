// One-time bootstrap: creates the FIRST owner account directly in the database.
//   npm run create-admin
// Username / password are typed here and stored (bcrypt-hashed) in MongoDB, never in .env.
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const ask = (q) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (ans) => {
      rl.close();
      resolve(ans);
    });
  });

// Password input: shows * for each character. Falls back to visible input if not a real terminal.
const askPassword = (prompt) =>
  new Promise((resolve) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) return ask(prompt).then(resolve);

    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let pw = '';

    const onData = (chunk) => {
      for (const c of chunk) {
        if (c === '\r' || c === '\n' || c === '\u0004') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          return resolve(pw);
        }
        if (c === '\u0003') {
          process.stdout.write('\n');
          process.exit(1);
        }
        if (c === '\u007f' || c === '\b') {
          if (pw.length) {
            pw = pw.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          pw += c;
          process.stdout.write('*');
        }
      }
    };
    stdin.on('data', onData);
  });

(async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing in .env');
    await mongoose.connect(process.env.MONGO_URI);

    const existing = await Admin.countDocuments();
    console.log(existing ? `\n${existing} admin(s) already exist. Creating another owner.\n` : '\nCreating the first owner account.\n');

    const name = (await ask('Full name: ')).trim();
    const username = (await ask('Username (a-z, 0-9, . _): ')).trim().toLowerCase();
    const password = await askPassword('Password (min 8 chars): ');
    const confirm = await askPassword('Confirm password: ');

    if (!name || !username) throw new Error('Name and username are required');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');
    if (password !== confirm) throw new Error('Passwords do not match');
    if (await Admin.exists({ username })) throw new Error(`Username "${username}" already exists`);

    await Admin.create({ name, username, password, role: 'owner' });
    console.log(`\nOwner "${username}" created. You can login now.`);
    process.exit(0);
  } catch (err) {
    console.error(`\nFailed: ${err.message}`);
    process.exit(1);
  }
})();
