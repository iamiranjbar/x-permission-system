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

### Changes or considerations in APIs

- I remove exclamation mark(!) from group `userIds` and `groupIds`. It allows these field to be null. It is required because we can have groups that only have groups or only members. Sanitization check for both not null is done in the service.
- Add `inheritViewPermissions` and `inheritEditPermissions` fields to `createTweetInput`. It is good for better control when creating a new tweet.
- Add `FilterTweet` to `paginatedTweets` query which we can filter them when we get them for a user.
- Don't design any cycle detection for group membership or tweets because there is no chance of cycle creation. In group membership, we can not edit memberships and just have upward direction relationship. Tweet is like that we just have one way relationship which prevents any cycle in action.
- Add `tweetId` to `updateTweetPermissions` mutation because we need to know update which tweets permissions.
- Separate user and group permissions in `updateTweetPermissionsInput`. It is required because of performance issues. If we don't do that, we need an additional check for type of id.

### Database Design
1. Users and Groups:
   - Users Table: Stores user-specific details.
   - Groups Table: Stores group-specific details.
   - Group Membership Table: Implements a polymorphic design with:
     - member_id: References either a user or a group.
     - member_type: Differentiates between user and group, ensuring clarity and extensibility.
     - Reasoning: Supports hierarchical group memberships while maintaining scalability and simplicity in queries.
2. Tweets Table:
   - Contains inheritView and inheritEdit flags to manage permission inheritance.
   - Permission Handling:
     - Query-Time Resolution: Permissions are resolved dynamically at runtime using these flags.
     - Rationale: Avoids write-heavy operations when these flags change, which is critical given the potential cost of cascading updates in deeply nested structures.
   - Alternative:
     - Updating permissions when the flags change. While feasible, this approach is write-intensive and limits scalability, even with read replicas.
3. Permissions Table:
   - Implements a polymorphic design with:
     - entity_id: References either a user or a group.
     - entity_type: Differentiates between user and group, enabling versatile permission assignments.
   - Query-Time Scalability:
     - Permissions are resolved dynamically, leveraging indices for efficient querying in large datasets.
   - Write Scalability:
     - Read replicas maintain scalability without incurring the cost of cascading writes.
#### Design Rationale
1. Polymorphic Design:
   - Simplifies handling hierarchical relationships (e.g., users and groups).
   - Supports future extensibility (e.g., roles or organizations).
2. Query-Time Resolution:

   - Optimized for read-heavy workloads by leveraging dynamic permission evaluation.
   - Avoids expensive writes during inheritance flag changes.
3. Scalability:
   - Supports scalable querying with the use of indices and read replicas(not implemented).

### Index Choices and Justifications
1. GroupMembership Table

   Index: `@Index(['memberId', 'groupId'])`

- Reason for Choice:
  - Facilitates efficient querying of group memberships for both users and nested groups.
  - Optimizes hierarchical group lookups, such as checking if a user or group belongs to another group.
- Scenarios:
  - Resolving group permissions.
  - Fetching all members of a group (both users and groups).

2. Tweet Table

   Index: `@Index(['parentTweetId', 'inheritViewPermissions', 'inheritEditPermissions'])`

- Reason for Choice:
  - Speeds up recursive queries used for resolving hierarchical inheritance of permissions.
  - Optimizes filtering tweets based on parentTweetId and inheritance flags.
- Scenarios:
  - Recursive queries to traverse the parent-child hierarchy for permission resolution.
  - Filtering tweets with inheritance enabled (inheritViewPermissions or inheritEditPermissions).

3. Permission Table

   Index: `@Index(['permittedId', 'permissionType', 'tweetId', 'createdAt'])`

- Reason for Choice:
  - Provides a composite index optimized for both filtering and sorting.
  - Highly selective for resolving permissions checks based on permittedId (user or group), permissionType (view/edit), and tweetId.
- Scenarios:
  - Resolving permissions for a user or group (e.g., checking if a user can edit a tweet).
  - Filtering permissions efficiently while maintaining a sort order (createdAt).
#### Benefits of Index Choices
1. Query Performance:

   - Each index aligns closely with specific query patterns, reducing scan times and improving lookup speed.
   - Supports both hierarchical queries (for inheritance and group membership) and permission checks.

2. Scalability:

   - Reduces the cost of frequent queries in read-heavy scenarios, maintaining performance as the data grows.

3. Balanced Read and Write Overhead:

   - Carefully selected composite indices ensure minimal write overhead while optimizing common query paths.

4. Future-Proofing:

   - Polymorphic design (e.g., memberId/groupId, permittedId) ensures extensibility for new use cases without additional schema changes.
   
#### Potential Downsides
   1. Index Size:
      - Composite indices, especially with multiple columns (e.g., permittedId, permissionType, tweetId, createdAt), may consume more storage.

   2. Write Overhead:
      - Each index adds a minor overhead during insert and update operations. However, the trade-off is acceptable given the read-heavy workload.
- These indices were chosen to optimize critical query paths while maintaining a balance between performance and storage overhead. They address hierarchical relationships, permission resolution, and scalability needs, ensuring efficient operation for both read and write scenarios in the system.

### Caching with redis
To optimize performance and reduce database load, a caching strategy has been implemented using an in-memory NoSQL database (Redis). The caching focuses on hierarchical data related to group memberships and user permissions while avoiding complex and frequently-changing datasets like paginated tweets.

#### Cached Data
1. User Permissions:

   - What: Permissions for actions like canEditTweet and canViewTweet.
   - Why: Permissions are frequently queried during operations, and caching reduces redundant database queries.
   - How: Permissions are cached using keys like:
   
    ```
   permissions:${tweetId}:${userId}:edit
   permissions:${tweetId}:${userId}:group_edit
   permissions:${tweetId}:${userId}:explicit_edit
   ```
2. Group Memberships:

   - What: All group IDs a user belongs to, including nested groups and group parents.
   - Why: Fetching hierarchical group memberships is a common operation, and caching improves performance for these lookups.
   - How: Group memberships are cached using keys like:
   ```
   group:${currentGroupId}:parentGroupIds
   user:${userId}:groupIds
   ```

3. Hierarchical Related Data:

   - What: Hierarchically linked relationships such as nested groups or parent-child relationships.
   - Why: Avoid repeated computation for hierarchical structures that do not change frequently.
   - How: Invalidation ensures data consistency when relationships are updated.

#### Avoided Caching
- Paginated Tweets:
  - Reason: Paginated tweets depend on multiple dynamic factors, such as filters, permissions, group memberships, and parent-child relationships, which change frequently.
- Challenges:
  - High Invalidation Overhead: Any change in permissions, group memberships, or tweet content would require invalidating multiple cached pages.
  - Dynamic Query Results: Each combination of filters, LIMIT, and OFFSET generates a unique result set, making caching inefficient.
 
#### Cache Invalidation
- Trigger Points:
  - Updates to permissions, group memberships, or hierarchical relationships.
  - Actions like createGroup, addMemberToGroup, or updateTweetPermissions.
- Invalidation Strategy:
  - Invalidate affected caches to ensure consistency, e.g., removing cached permissions for a tweet when permissions are updated.

#### Benefits
1. Performance Optimization:
   - Reduces database queries for frequently accessed data like permissions and group memberships.
   - Improves the responsiveness of the application for high-read workloads.

2. Scalability:
- By caching hierarchical data, the system efficiently handles complex queries without overloading the database.

3. Consistency:
   - Invalidation ensures cached data is always up-to-date, maintaining system reliability.

#### Challenges
   - Dependency on Cache:
     - Heavy reliance on cached data for performance optimization means cache availability is critical.
   - Complex Invalidation Logic:
     - Hierarchical relationships require careful invalidation to avoid stale data.

This caching strategy strikes a balance between improving performance and managing complexity. By focusing on hierarchical and frequently accessed data like permissions and group memberships while avoiding overly dynamic datasets like paginated tweets, the system ensures efficient, consistent, and scalable performance.

### Unit Testing
Unit testing is a critical part of ensuring code quality and reliability, and Jest is an ideal testing framework for this purpose in JavaScript and TypeScript projects. Using Jest, you can create fast and isolated tests for individual components and services in your application. Its intuitive syntax, built-in mocking capabilities, and extensive plugin ecosystem make it well-suited for validating the behavior of business logic, ensuring edge cases are handled, and catching regressions early. Jest's ability to generate detailed test coverage reports also helps in identifying untested areas of code.

In this project, unit tests were written with Jest to validate core functionalities such as permission checks, group memberships, and tweet creation logic. Mocking dependencies like services and repositories ensures that tests remain focused on the behavior of the unit under test without requiring actual database or external service calls. This approach keeps tests fast and reliable, allowing developers to confidently refactor code or add new features while maintaining system stability.

### Setup options

Combining both local setup with Yarn and Docker ensures a flexible and efficient development environment that caters to various needs. Yarn provides a lightweight and straightforward way for developers to quickly set up and run the application locally without the overhead of managing additional tools like Docker. This simplicity is ideal for developers who only need to work on the application layer and already have the necessary dependencies installed, such as Node.js and PostgreSQL, on their systems.

Docker, on the other hand, provides a robust solution for managing the entire system, including application code, databases, and caching services. By using Docker, you can ensure consistency across environments, eliminating issues caused by OS-specific configurations or dependency mismatches. This is particularly beneficial for onboarding new developers or when the project needs to run on different operating systems. Docker’s one-command setup allows the entire stack to be deployed efficiently, making it indispensable for replicating production-like environments.

This dual approach strikes a perfect balance between simplicity and robustness. Developers can choose the Yarn setup for quick iterations and lightweight development tasks, while Docker offers a full-stack environment for more comprehensive testing and deployment scenarios. Additionally, including clear documentation for both setups empowers teams to switch seamlessly based on their needs, ensuring productivity and consistency without imposing unnecessary constraints.

### Raw SQL and CTE for `paginatedTweets`
Choosing raw SQL queries for implementing paginatedTweets was driven by the need for precise performance optimization, particularly in handling large-scale datasets and hierarchical relationships. Raw queries enable fine-grained control over the SQL execution plan, allowing the efficient use of database indices. By directly utilizing recursive Common Table Expressions (CTEs) for traversing parent-child relationships, the solution avoids unnecessary in-memory processing, ensuring that operations like LIMIT and OFFSET remain performant and meaningful.

The decision also stems from the complexities of the underlying data structure, such as permissions and hierarchical inheritance. These require optimized recursive queries and multi-column filtering. Using raw SQL makes it possible to align query logic with database-level optimizations, leveraging composite indices to speed up permission checks and hierarchical lookups. This approach reduces the dependency on application-layer filtering and ensures scalability as the dataset grows.

Finally, raw queries offer better compatibility with advanced SQL features like recursive CTEs, which are essential for resolving nested group memberships and permissions. By keeping all filtering and pagination logic within the database, this solution minimizes the overhead of transferring unnecessary data to the application layer. It also ensures future extensibility, as raw SQL can be easily adjusted to accommodate additional filtering conditions or indices without requiring significant code refactoring.

### Permissions
The project description does not specify a permissions framework and there is not much time. But implementing Role-Based Access Control (RBAC) is crucial for securing queries and mutations in the further steps. RBAC can be integrated using a combination of decorators, JWT authentication, and guards in the application. Decorators can define role and permission requirements at the resolver or route level, while guards ensure these roles and permissions are validated against the JWT payload at runtime. This approach provides a scalable and secure way to enforce access control, allowing only authorized users to execute specific operations based on their roles (e.g., admin, user, or group member) and permissions.
