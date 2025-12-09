# MongoDB Setup Guide

MongoDB is required to run the backend. You have several options:

## Option 1: MongoDB Atlas (Recommended - Cloud, No Installation)

### Steps:
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account (M0 cluster is free forever)
3. Create a new project and cluster
4. Go to "Database Access" and create a user (e.g., `projectx_user`)
5. Go to "Network Access" and add your IP (or allow all IPs for development: `0.0.0.0/0`)
6. Click "Connect" and copy the connection string
7. Replace `<password>` with your actual password

### Connection String Format:
```
mongodb+srv://projectx_user:PASSWORD@cluster0.xxxxx.mongodb.net/projectx?retryWrites=true&w=majority
```

### Update .env:
```env
MONGODB_URI=mongodb+srv://projectx_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/projectx?retryWrites=true&w=majority
```

Then start the server:
```bash
npm start
```

---

## Option 2: Local MongoDB with Docker (Requires Docker Installation)

### Install Docker:
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Create docker-compose.yml in backend directory:
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    container_name: projectx-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
    volumes:
      - mongodb_data:/data/db
    restart: always

volumes:
  mongodb_data:
```

### Start MongoDB:
```bash
docker-compose up -d
```

### Update .env:
```env
MONGODB_URI=mongodb://admin:admin123@localhost:27017/projectx?authSource=admin
```

### Start the server:
```bash
npm start
```

---

## Option 3: MongoDB Community Server (Linux)

### Install from MongoDB Repository:
```bash
# Add MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Update .env:
```env
MONGODB_URI=mongodb://localhost:27017/projectx
```

### Start the server:
```bash
npm start
```

---

## Verify Connection

Once MongoDB is running and `.env` is configured, start the server:

```bash
cd backend
npm start
```

You should see:
```
✅ MongoDB connected successfully
Server running on http://localhost:3000
```

---

## Test the API

```bash
# Health check
curl http://localhost:3000/health

# Get all gigs
curl http://localhost:3000/api/gigs

# Get platform stats
curl http://localhost:3000/api/stats
```

---

## Troubleshooting

### "MongoDB connection failed"
- Check MONGODB_URI in .env is correct
- Verify MongoDB is running (docker ps or systemctl status mongod)
- Check firewall/network access if using cloud MongoDB

### "Cannot connect to localhost:27017"
- MongoDB isn't running
- Use Option 1 (MongoDB Atlas) for cloud-based solution
- Or install Docker and use Option 2

### "Authentication failed"
- Wrong username/password in MONGODB_URI
- Check MongoDB user credentials
- Atlas: Ensure IP is whitelisted (allow 0.0.0.0/0 for development)

---

## Next Steps

After MongoDB is set up and running:

1. Test API endpoints with curl (see API_REFERENCE.md)
2. Implement blockchain event listeners (pending task)
3. Set up React frontend
4. Deploy to production

