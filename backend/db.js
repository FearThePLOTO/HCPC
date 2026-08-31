const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/users.json');

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
}

function loadUsers() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

function getNextId(users) {
  if (users.length === 0) return 1;
  return Math.max(...users.map(u => u.id)) + 1;
}

function getAllUsers() {
  return loadUsers();
}

function getUserById(id) {
  const users = loadUsers();
  return users.find(u => u.id === Number(id)) || null;
}

function getUserByEmail(email) {
  const users = loadUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function createUser(data) {
  const users = loadUsers();
  const newUser = {
    id: getNextId(users),
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone,
    national_id: data.national_id,
    email: data.email,
    gender: data.gender,
    university: data.university,
    status: data.status,
    password: data.password, // already hashed
    created_at: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

function countUsers() {
  return loadUsers().length;
}

// Public-safe projection (no password)
function toPublic(user) {
  if (!user) return null;
  const { password, ...pub } = user;
  return pub;
}

module.exports = {
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  countUsers,
  toPublic,
  loadUsers
};
