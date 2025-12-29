# Force the system to use Node 18 (The version we need)
FROM node:18-alpine

# Create the folder for the app
WORKDIR /app

# Copy the package.json file
COPY package.json ./

# Install the dependencies (Clean install)
RUN npm install

# Copy the rest of your app files
COPY . .

# Build the app (This reads your Environment Variables)
RUN npm run build

# Start the app
CMD ["npm", "start"]
