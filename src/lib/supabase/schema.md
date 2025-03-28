```mermaid
  erDiagram
    profiles {
        uuid id PK
        text display_name
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }

    auth_users {
        uuid id PK
    }

    profiles }|..|| auth_users : "references auth.users.id"
