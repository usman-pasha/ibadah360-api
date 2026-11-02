### BACKEND API SERVER

#############################################################
########### STAGE 1 - BUILD #################################
#############################################################

FROM node:18-alpine AS build-env

# Set working directory
WORKDIR /usr/app

# Copy dependency files first
COPY package*.json ./

# Install only production dependencies
RUN npm install

# Copy application source code
COPY . .

#############################################################
########### STAGE 2 - RUN ###################################
#############################################################

FROM node:18-alpine

# Labels for metadata
LABEL developer="Usman Pasha"
LABEL packager="Faiza"
LABEL release-date="08-01-2025"
LABEL environment="PRODUCTION"
LABEL app-name="BACKEND_API_SERVER"

# Install curl (optional, for health checks or debugging)
RUN apk update && apk upgrade && apk add --no-cache curl

# Set working directory
WORKDIR /usr/app

# Copy only necessary files from the build stage
COPY --from=build-env /usr/app ./

# Expose the port your app runs on (optional but good practice)
EXPOSE 3000

# Set the entry point
CMD ["npm", "start"]