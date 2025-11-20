# Dockerfile for the frontend

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
RUN chmod +x ./run_frontend.sh

# Expose the port the frontend runs on
EXPOSE 8501

# Command to run the frontend
CMD ["./run_frontend.sh"]
