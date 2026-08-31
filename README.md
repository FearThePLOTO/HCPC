# HCPC - Huawei Competitive Programming Contest

8-bit retro game edition. IDOR demo lab.

## Run app
npm install
npm start
open http://localhost:5000
shows http://10.1.1.1:5000 and http://localhost:5000

## Run scripts
node scripts/extract.js --email <email> --password <pass> --max 20
python3 scripts/extract.py --email <email> --password <pass> --max 20

## Demo
Register as A, login, change /profile/1 to /profile/2 to see other user.

## Mock data
20 users in data/users.json
All passwords are 123456 (bcrypt hashed)
IDs 1 to 20, try /profile/5, /profile/12 etc. while logged in.
