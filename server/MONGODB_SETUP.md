# MongoDB Setup Guide

## Installation

### Windows
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Run the installer
3. Choose "Complete" installation
4. Install MongoDB as a Windows Service (recommended)
5. Install MongoDB Compass (GUI tool) - optional but helpful

### Alternative: Use MongoDB via Docker
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Starting MongoDB

### If installed as Windows Service
- MongoDB should start automatically
- Check services: `services.msc` and look for "MongoDB"

### If running manually
```bash
mongod --dbpath "C:\data\db"
```

## Verify MongoDB is Running

```bash
mongosh
# or
mongo
```

If connected, you'll see MongoDB shell prompt.

## Database Configuration

The application uses:
- **Database Name**: `ic_insurance`
- **Connection String**: `mongodb://localhost:27017/ic_insurance`

## Testing Connection

After installing MongoDB and starting the server:

```bash
cd C:\IandC\Drezoc_v2.0\server
npm install
node server.js
```

You should see:
```
Connected to MongoDB
Server running on http://localhost:3001
Default admin user created: username=admin, password=admin123
```

## Troubleshooting

1. **Port 27017 already in use**: Another MongoDB instance is running
2. **Cannot connect**: Make sure MongoDB service is running
3. **Permission errors**: Run command prompt as Administrator


