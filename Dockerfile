# 1. Force the system to use Node 20 (Required for the latest Next.js)
FROM node:20-alpine

# 2. Set the working directory
WORKDIR /app

# 3. Copy package configuration first
COPY package.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of your app files
COPY . .

# 6. Build the app
RUN npm run build

# 7. Start the app
CMD ["npm", "start"]
