# X Permission System

X-Permission System is a scalable and efficient permission management system designed for applications like X (formerly Twitter). It allows authors to control tweet visibility and editability through user and group-based permissions.

## Features
- Group-based permission management.
- Caching for enhanced performance with Redis.
- Inheritance-based permissions for replies.
- Dockerized setup for easy deployment.

## Project Setup Instructions

### Prerequisites
- Node.js 22.4.0 or higher
- Redis
- Postgres

### 1. Clone the repository
```bash
$ git clone <Repo URL>
```

### 2. Navigate to the project directory
```bash
$ cd x-permission-system
```

### 3. Install dependencies

```bash
$ yarn install
```

### 4. Populate config

You can change configs for database and redis to match yours.
```bash
$ cp .env-template .env.devopment
```

### 5. Compile and run the project using yarn

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev
```

## Run tests

```bash
# unit tests
$ yarn test
```

## Run project with Docker
### Prerequisites
- Docker and Docker Compose

### Start the services using Docker Compose
Populate configs with the previous command. Just mind about changing `REDIS_HOST` and `REDIS_HOST` to match your `docker-compose.yml`. Mind about `NODE_ENV` to match your config too.

```bash
$ docker-compose up --build
```

Access the application at http://localhost:3000 as normal.

## Architecture and Design Decisions
### API: GraphQL

I chose GraphQL for its flexibility, single endpoint design, and ability to handle complex relationships (e.g., users, groups, and permissions). It supports real-time updates via subscriptions and avoids API versioning. While I have significant REST experience, this project offered an opportunity to explore and quickly adapt to GraphQL and I love learning.

#### Limitations
- Steeper learning curve compared to REST.
- Complex debugging and custom caching needs.
- Potential performance issues from over-querying.
#### Comparison with REST
- Flexibility: GraphQL fetches precise data; REST may over/under-fetch.
- Versioning: GraphQL evolves schema seamlessly; REST requires explicit versioning.
- Real-Time: GraphQL supports subscriptions; REST relies on WebSockets or polling.
GraphQL was the best fit for the project’s need for flexible querying and relationship handling.

### Database: SQL
#### Why SQL?
- Relational Data Model: Handles hierarchical relationships (users, groups, tweets) efficiently with recursive CTEs.
- Transaction Support: Ensures consistency for critical permission updates.
- Indexing & Query Performance: Optimizes queries like PaginatedTweets and canEditTweet.
- Schema Definition: Guarantees data integrity for permissions management.
#### Why Not NoSQL?
While NoSQL offers flexibility and easier horizontal scaling, SQL’s strengths in handling relational data and ensuring consistency make it a better fit for this project.

#### Limitations
Scalability: Horizontal scaling is more complex but manageable with:
- Partitioning: Distribute data across nodes.
- Read Replicas: Handle heavy read traffic.
- Caching: Use Redis to boost performance for frequent queries.

### Changes in APIs

- I remove exclamation mark(!) from group `userIds` and `groupIds`. It allows these field to be null. It is required because we can have groups that only have groups or only members. Sanitization check for both not null is done in the service.
- Add `inheritViewPermissions` and `inheritEditPermissions` fields to `createTweetInput`. It is good for better control when creating a new tweet.
- Add `FilterTweet` to `paginatedTweets` query which we can filter them when we get them for a user.

# ====================
- **Why Redis for Caching?**
  Redis was chosen for its speed and ability to handle key-value caching efficiently. Alternatives like Memcached were considered but lacked features like persistence.
- **Trade-offs**
    - **Caching:** While caching improves performance, stale data may occur in rare edge cases.
    - **Inheritance Logic:** Recursive permission checks provide flexibility but increase complexity.
- **Alternative Approaches**
  A non-caching approach could simplify the design but would lead to slower permission checks.

## Limitations
- Recursive permission inheritance may impact performance for deeply nested replies.
- Redis cache must be running for optimal performance; otherwise, fallback logic will use the database.