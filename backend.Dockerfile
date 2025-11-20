# Dockerfile for the backend

# Use a lightweight Python base image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project into the container
COPY . .

# Make the run script executable
RUN chmod +x ./run_backend.sh

# Expose the port the backend runs on
EXPOSE 8000

# Command to run the backend
CMD ["./run_backend.sh"]
