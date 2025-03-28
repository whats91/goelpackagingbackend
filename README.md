# Goel Packaging Backend

This is the backend service for Goel Packaging application.

## Running with Docker

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) installed on your Windows machine
- [Git](https://git-scm.com/downloads) (to clone the repository)

### Steps to Run

1. Clone the repository:
   ```
   git clone https://github.com/whats91/goelpackagingbackend.git
   cd goelpackagingbackend
   ```

2. Create a `public` directory if it doesn't exist:
   ```
   mkdir -p public
   ```

3. Build and start the Docker container:
   ```
   docker-compose up -d
   ```

4. The server will be available at http://localhost:3002

### Environment Variables

You can customize the application by updating the environment variables in the `docker-compose.yml` file:

- `PORT`: The port on which the server runs (default: 3002)
- `JWT_SECRET`: Secret key for JWT token generation
- `IMAGE_URL_DOMAIN`: Domain for image URLs
- `IMAGE_DIR`: Directory for storing images
- `ORIGIN`: Allowed CORS origin

### Stopping the Server

To stop the Docker container:
```
docker-compose down
```

## Development Without Docker

If you prefer to run without Docker:

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   node index.js
   ```

The server will be available at http://localhost:3002.

## API Endpoints

- `/api/register` - Register a new user
- `/api/login` - Login endpoint
- `/api/users` - User management (Admin)
- `/api/messages` - Message handling
- `/api/getdata` - Data retrieval from external API
- `/api/singleVchData` - Fetch single voucher data
- `/api/updatedata` - Update data in external API
