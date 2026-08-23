---
paths:
  - "src/lib/server/db/**/*.ts"
  - "drizzle/**/*"
---

# Database naming

- Columns: `snake_case`; TS fields `camelCase`, mapped in the Drizzle schema.
- PKs: `<tablename>_pk`. FKs: `<referenced_table>_fk`.
- Semantic FK names allowed where the name doesn't match the referenced table
  (`created_by_fk` → `user_pk`). Document these inline in the schema file.
- `BIGINT UNSIGNED` for all PKs. Soft delete via a `status` enum, not a flag.
