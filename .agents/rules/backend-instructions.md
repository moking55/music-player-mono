---
trigger: always_on
---

# Agent Instruction Prompt: apps/backend

<GoldenRules>
  <rule id="1">
    <title>Assumptions Must Be Explicit</title>
    <description>If context is missing, state assumptions. Don't hallucinate hidden infra or invent unspecified services.</description>
  </rule>
  <rule id="2">
    <title>Verify Before Claiming Complete</title>
    <description>Never claim a change is complete without running verification. "I edited the file" is not done. "I edited the file and here's the output" is done. No "should work now." Evidence before assertions, always.</description>
  </rule>
  <rule id="3">
    <title>Respect Recent Edits</title>
    <description>Do not suggest code that has been deleted in recent edits. Focus on the current state of the codebase.</description>
  </rule>
  <rule id="4">
    <title>Use Named Functions Over Arrow Functions</title>
    <description>Always use named function declarations instead of arrow functions. This improves code readability, provides better stack traces for debugging, and maintains consistency across the codebase.</description>
    <bad-example>const handleRequest = (req: Request) => { ... }</bad-example>
    <good-example>function handleRequest(req: Request) { ... }</good-example>
  </rule>
</GoldenRules>
You are working on the `apps/backend` application within a monorepo. This is a **NestJS** application using **TypeORM** with **PostgreSQL**.

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger (@nestjs/swagger)
- **Language**: TypeScript

## Architecture: Module-Based

Follow the standard NestJS module architecture. Each feature is encapsulated in a module.

### 1. Modules (`src/modules/[feature]`)

- **Role**: Groups related controllers, services, and entities.
- **Location**: `apps/backend/src/modules/[feature]`
- **Structure**:
  ```
  [feature]/
  ├── dto/
  │   ├── create-[feature].dto.ts
  │   └── update-[feature].dto.ts
  ├── entities/
  │   └── [feature].entity.ts
  ├── [feature].controller.ts
  ├── [feature].module.ts
  └── [feature].service.ts
  ```

### 2. Controllers (`*.controller.ts`)

- **Inheritance**: MUST inherit from `BaseControllerOperations`.
- **Decorators**: Use standard NestJS and Swagger decorators.
- **Pattern**:

  ```typescript
  @ApiTags('[feature]')
  @ApiBearerAuth()
  @Controller('[feature]')
  export class [Feature]Controller extends BaseControllerOperations<
    [Feature]Service,
    Create[Feature]Dto,
    Update[Feature]Dto
  > {
    constructor(private readonly service: [Feature]Service) {
      super(service, '[feature]');
    }

    // Override or add methods as needed
  }
  ```

### 3. Services (`*.service.ts`)

- **Inheritance**: MUST inherit from `BaseServiceOperations`.
- **Pattern**:
  ```typescript
  @Injectable()
  export class [Feature]Service extends BaseServiceOperations<
    [Feature]Entity,
    Create[Feature]Dto,
    Update[Feature]Dto
  > {
    constructor(
      @InjectRepository([Feature]Entity)
      private readonly repository: Repository<[Feature]Entity>,
    ) {
      super('[feature]', repository);
    }
  }
  ```

### 4. Entities (`entities/*.entity.ts`)

- **Base Class**: Extend `BaseEntity` from `typeorm`.
- **Interface**: MUST implement the corresponding interface from `shared-types`.
- **Decorators**: `@Entity`, `@Column`, `@PrimaryGeneratedColumn`, etc.
- **Key Columns**: `id` (uuid), `createdAt`, `updatedAt`, `deletedAt` (soft delete) are standard.

### 5. DTOs (`dto/*.dto.ts`)

- **Validation**: Use `class-validator` decorators (`@IsString`, `@IsNotEmpty`, etc.).
- **Swagger**: Use `@ApiProperty` for all fields to ensure Swagger docs are generated.

## Step-by-Step Guide: Creating a New Feature

### Step 0: Define Shared Type

1.  **Check Shared Types**: Look in `packages/shared-types/src/model/`.
2.  **Create Type**: If it doesn't exist, create `packages/shared-types/src/model/[feature].ts`.
    - Define the interface (e.g., `export interface [Feature] { ... }`).
3.  **Export**: Export it in `packages/shared-types/src/index.ts`.
4.  **Note**: This type serves as the contract between frontend and backend.

### Step 1: Create Module Structure

1.  Create folder `src/modules/[feature]`.
2.  Create subfolders `dto` and `entities`.

### Step 2: Define Entity

1.  Create `src/modules/[feature]/entities/[feature].entity.ts`.
2.  **Implement Interface**: Ensure the entity class implements the interface from `shared-types`.

    ```typescript
    import { [Feature] as I[Feature] } from 'shared-types';
    import { BaseEntity } from 'typeorm';

    @Entity('[features]')
    export class [Feature]Entity extends BaseEntity implements I[Feature] {
      // Implement all properties from I[Feature]
    }
    ```

### Step 3: Define DTOs

1.  Create `create-[feature].dto.ts` and `update-[feature].dto.ts`.
2.  Add validation (`class-validator`) and Swagger (`@ApiProperty`) decorators.

### Step 4: Create Service

1.  Create `src/modules/[feature]/[feature].service.ts`.
2.  Extend `BaseServiceOperations`.
3.  Inject Repository.

### Step 5: Create Controller

1.  Create `src/modules/[feature]/[feature].controller.ts`.
2.  Extend `BaseControllerOperations`.
3.  Add Swagger tags.

### Step 6: Register Module

1.  Create `src/modules/[feature]/[feature].module.ts`.
2.  Register Controller and Service.
3.  Import `TypeOrmModule.forFeature([[Feature]Entity])`.
4.  Add to global `app.module.ts`.

## Code Patterns & Rules

### 1. Shared Types First

- **CRITICAL**: Never create an entity without a corresponding shared type. The shared type ensures consistency across the monorepo.
- If you change the Entity, update the Shared Type first.

### 2. Base Operations

- Leverage `BaseControllerOperations` and `BaseServiceOperations` for standard CRUD.

### 3. Swagger Documentation

- ALWAYS use `@ApiOperation`, `@ApiResponse`, and `@ApiProperty`.

### 4. Naming Conventions

- **Folders**: kebab-case (`user-profiles`).
- **Files**: kebab-case (`user-profile.controller.ts`).
- **Classes**: PascalCase (`UserProfileController`).

