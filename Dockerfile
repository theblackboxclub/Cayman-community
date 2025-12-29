# 1. Force the system to use Node 18 (The version we need)
FROM node:18-alpine

# 2. Set the working directory
WORKDIR /app

# 3. Copy package configuration first (for better caching)
COPY package.json ./

# 4. Install dependencies (Clean install)
RUN npm install

# 5. Copy the rest of your app files
COPY . .

# 6. Build the app
RUN npm run build

# 7. Start the app
CMD ["npm", "start"]
