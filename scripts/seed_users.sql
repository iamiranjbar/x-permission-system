INSERT INTO public.users (id, name, "createdAt")
VALUES
    ('e7d7f48a-4cce-4c38-808d-2f1248c6e52c', 'Amir', '2024-06-22 19:10:25-07'),
    ('b33f3f15-8ad4-4551-b91f-fb780a9b88cd', 'Sara', '2024-06-23 10:00:00-07'),
    ('d9a1fc12-c52f-4c84-a687-ef8c0f40135b', 'John', '2024-06-24 15:30:00-07'),
    ('5cb5a5e5-828d-426e-a3cf-0ea3f8035da4', 'Anna', '2024-06-25 11:45:00-07'),
    ('a67d29c1-1c34-49c4-9956-27c19c9b4b84', 'James', '2024-06-26 08:20:00-07'),
    ('f3d54a1e-4a7f-4b76-8a1e-03adccfa17b5', 'Sophia', '2024-06-27 13:50:00-07'),
    ('6c0f5a3b-6b7d-43f4-85fa-724b27c5c7f1', 'David', '2024-06-28 09:10:00-07'),
    ('8a1b3c9d-1234-45d8-a76b-ef9a8c5d7b2f', 'Emma', '2024-06-29 17:40:00-07'),
    ('b8d1f92c-2d56-4b34-8f23-0dc6e3f9d1b7', 'Liam', '2024-06-30 12:25:00-07'),
    ('c1f6d9a4-5678-456d-9987-12e34d5f9a7b', 'Olivia', '2024-07-01 14:15:00-07'),
    ('9a8c6d7b-7d8f-4b67-9a76-ef0b12d3f4b5', 'Noah', '2024-07-02 10:50:00-07'),
    ('1c9f3a7b-2345-4b56-a76b-ef7a9c8d5f3a', 'Ava', '2024-07-03 18:30:00-07');

-- sh -c "psql -U postgres -d permission_system -f /scripts/seed_users.sql" => Run this in db terminal
