# Repository Agent Guide

This file defines the default architecture, coding standards, and working rules for agents contributing to this NestJS project. Follow it unless a more specific `AGENTS.md` in a subdirectory or an accepted architecture decision record (ADR) says otherwise.

## Default architecture

The default architecture is a modular monolith organized by business capability, with clean/hexagonal boundaries inside each feature module. Start here. Do not introduce microservices, CQRS, event sourcing, or a generic repository framework without a demonstrated need.

Before changing code, read:

1. The nearest applicable `AGENTS.md` files.
2. `package.json` and the active lockfile.
3. `README.md`, `nest-cli.json`, `tsconfig*.json`, lint/format config, and test config.
4. Relevant feature code and tests.
5. Database schema and migrations when persistence is involved.

The installed dependency versions and repository conventions take precedence over examples from memory. Do not change package manager, module system, framework adapter, test runner, ORM, validation library, or logger unless the task requires it.

```text
src/
  main.ts                       # process bootstrap only
  app.module.ts                 # composition root
  config/                       # typed configuration and startup validation
  common/                       # small, truly cross-cutting technical code
    errors/
    observability/
    security/
  modules/
    <feature>/
      <feature>.module.ts       # feature composition and public exports
      presentation/             # inbound adapters
        http/
          <feature>.controller.ts
          dto/
          presenters/
      application/              # use cases and ports
        commands/
        queries/
        services/
        ports/
      domain/                   # business model and rules
        entities/
        value-objects/
        services/
        events/
        errors/
      infrastructure/           # outbound adapters
        persistence/
        messaging/
        integrations/
test/
  e2e/
```

Keep the structure proportional to complexity. A small CRUD feature may use controller, service, DTO, and repository files directly under its module. Add layer directories when they create real boundaries; do not create empty abstractions for symmetry.

Dependencies point inward:

```text
presentation -> application -> domain
infrastructure -> application/domain
module wiring -> all feature layers
```

Enforce these rules:

- Domain code is plain TypeScript. It must not import NestJS, an ORM, HTTP types, environment variables, or vendor SDKs.
- Application code coordinates use cases and depends on domain types plus explicit ports.
- Presentation code validates and maps transport input, invokes one application use case, and maps the result to a transport response.
- Infrastructure code implements application ports for databases, queues, files, clocks, ID generators, email, and external APIs.
- Controllers do not contain business rules, persistence queries, or multi-step orchestration.
- ORM models, database rows, and third-party payloads do not escape infrastructure. Map them at the boundary.
- DTOs are transport contracts, not domain entities.

## Module boundaries and dependency injection

Each feature module owns its behavior and data access.

- Export the smallest intentional public API, normally application services, use cases, or provider tokens.
- Never reach into another module's infrastructure or internal folders.
- Prefer an exported application-level interface for synchronous collaboration.
- Prefer domain/application events when the downstream reaction is independent and eventual consistency is acceptable.
- Keep events explicit, versionable, and idempotently handled.
- Avoid `@Global()` except for a small set of process-wide technical facilities such as validated configuration or observability.
- Treat `forwardRef()` as a design warning. Refactor the boundary or extract a third capability before accepting a circular dependency.
- Avoid barrel files for Nest modules/providers and any exports that can obscure dependency cycles.
- `main.ts` configures the runtime: app adapter, global validation, security middleware, versioning, shutdown hooks, global filters/interceptors, and listening.
- `AppModule` composes modules. It should not contain business logic.
- Feature module files bind ports to adapters and declare controllers/providers.
- Constructor injection is the default. Use stable symbols or abstract classes as injection tokens for ports.
- Keep provider scope singleton unless request or transient scope is necessary and its cost is understood.

## Transport and validation

- Keep controllers thin and transport-specific.
- Validate every untrusted boundary: body, params, query, headers, messages, jobs, webhooks, and external API responses.
- Use one project-wide validation approach consistently. For class DTOs, configure `ValidationPipe` with safe options such as `whitelist: true`, `forbidNonWhitelisted: true`, and deliberate transformation. For schema-first projects, use the project's Standard Schema-compatible approach.
- Use explicit parse pipes for route primitives where that is clearer than implicit coercion.
- Never trust TypeScript types at runtime.
- Return stable response models; do not serialize persistence entities directly.
- Keep API versioning and deprecation policy consistent with existing routes.
- Update OpenAPI decorators/schema and examples whenever a public HTTP contract changes.

## Application and domain design

- Name application operations by intent: `CreateOrder`, `ApproveInvoice`, `GetAccountSummary`.
- Give each use case a narrow input and output contract.
- Put invariants in domain entities, value objects, or domain services so all entry points enforce them.
- Prefer explicit domain errors over generic `Error` strings.
- Translate domain/application errors to HTTP, RPC, or message semantics at the presentation boundary, normally through a centralized filter/mapper.
- Pass clocks and ID generators through ports when deterministic testing matters.

## Persistence and consistency

- Define repository ports around domain/use-case needs, not generic CRUD (`OrderRepository.save`, `findPendingForCustomer`).
- Keep ORM-specific querying in infrastructure repositories.
- Use migrations for schema changes. Never rely on production auto-synchronization.
- Treat Better Auth core and plugin tables as Better Auth-owned schema. This includes `user`, `session`, `account`, `verification`, and tables added by Better Auth plugins.
- Declare additions or changes to Better Auth-owned tables in `auth.schema.ts` using supported Better Auth configuration such as `additionalFields`, `fields`, or plugin schema options. Keep the runtime auth configuration in sync, preferably through a shared configuration value.
- After changing Better Auth-owned schema, run `npx @better-auth/cli@latest generate --config auth.schema`, review the generated Prisma schema, and use Prisma's migration workflow to apply it. Do not hand-author `CREATE`, `ALTER`, or `DROP` statements for Better Auth-owned tables in feature migrations.
- Feature-owned tables may reference Better Auth-owned tables with foreign keys, but those references must not redefine or mutate the Better Auth tables.
- Make transaction boundaries match a use case. Do not hold a transaction open across a slow network call.
- Prevent N+1 queries and unbounded reads. Paginate collection endpoints and select only required columns/relations.
- Use optimistic/pessimistic concurrency control where competing writes can violate invariants.
- For reliable database-plus-message workflows, use an outbox or another proven delivery pattern; do not pretend two independent systems share a transaction.

### Additive catalog and external-source data

- Keep each website parser behind the additive source port under the additives feature; do not put selectors, HTTP fetching, or source-specific toxicity labels in controllers or domain code.
- Preserve source-specific evidence in `AdditiveSourceRecord` and expose only the consolidated `Additive` record to ingredient analysis. New websites must add an adapter rather than columns tied to a vendor.
- Normalize E-numbers to the canonical form `E` plus digits and optional uppercase suffix (for example `E202` or `E100II`).
- Consolidated toxicity uses only `LOW`, `MEDIUM`, `HIGH`, and `VERY_HIGH`. Make each source-label mapping explicit and covered by tests.
- Pregnancy suitability is tri-state. Missing or ambiguous evidence is always `UNKNOWN`, never `SUITABLE`; retain a human-readable rationale and require editorial/clinical review of automatically inferred guidance.
- Treat imported prose as `REVIEW_REQUIRED`. Preserve provenance and content hashes, review source permissions, and editorially rewrite and verify text before publishing it to end users.

## Configuration and secrets

- Access environment variables through one typed configuration layer, not scattered `process.env` reads.
- Validate and coerce configuration at startup; fail fast on missing or invalid required values.
- Keep secrets out of source, logs, test snapshots, and committed `.env` files.
- Maintain a safe `.env.example` or equivalent documentation with names only and non-sensitive sample values.
- Make timeouts, retry limits, pool sizes, and feature flags explicit and bounded.

## Security and authorization

- Deny by default: authentication and authorization must be explicit for protected capabilities.
- Separate authentication (who) from authorization (what they may do).
- Enforce object/resource ownership in the application layer, not only in controllers.
- Use guards for request admission and policies/abilities for fine-grained authorization.
- Apply secure HTTP headers, explicit CORS origins, rate limits on abuse-prone endpoints, and request body limits.
- Hash passwords with a current password-hashing algorithm through a dedicated adapter. Never log credentials, tokens, cookies, authorization headers, or sensitive payload fields.
- Parameterize queries. Do not construct SQL from untrusted strings.
- Verify webhook signatures against the raw body where required and protect against replay.
- Give external integrations and database users least-privilege credentials.
- Do not weaken validation, authorization, TLS, or security middleware to make a test pass.

## Errors, resilience, and operations

- Use a consistent, documented error envelope with a stable machine-readable code, safe message, correlation ID, and field details when appropriate.
- Do not leak stack traces, SQL, internal hostnames, secrets, or vendor error bodies to clients.
- Set explicit deadlines on outbound I/O. Retry only transient, idempotent operations with exponential backoff and jitter.
- Do not retry validation, authorization, or other permanent failures.
- Make commands/jobs idempotent when duplicate delivery is possible.
- Handle process signals and enable graceful shutdown hooks.
- Expose separate liveness and readiness checks. Readiness may check essential dependencies; liveness should not fail merely because a downstream service is temporarily unavailable.
- Use structured logging through the project logger; avoid stray `console.log` calls.
- Include correlation/request IDs and relevant stable identifiers, but no sensitive data.
- Log once at the layer that handles an error; avoid duplicate stack traces at every layer.
- Instrument inbound requests, outbound calls, database operations, queues, and important business outcomes with useful metrics/traces.
- Keep metric labels low-cardinality. Never use raw user IDs, URLs, or error messages as metric labels.

## Testing

Use the smallest test that gives confidence:

- Domain unit tests: pure, fast tests for invariants, value objects, policies, and state transitions.
- Application unit tests: use fake/mock ports to test orchestration, permissions, and failure paths.
- Adapter integration tests: exercise repositories and external adapters against realistic dependencies or faithful test doubles.
- Module tests: use `@nestjs/testing` when Nest wiring, guards, pipes, filters, or scopes are relevant.
- E2E tests: cover critical public flows through the real application boundary and test database.
- Contract tests: protect important third-party and event/message schemas where drift is risky.

Testing rules:

- Add or update tests with every behavior change and bug fix. A regression test must fail before the fix and pass after it.
- Test success, validation failures, authorization, not-found/conflict cases, and relevant infrastructure failures.
- Keep tests deterministic: control time, randomness, IDs, environment, and network.
- Do not call live third-party services from unit or regular integration tests.
- Prefer behavior assertions over private implementation details and oversized snapshots.
- Clean up app instances, database state, timers, and containers in teardown.
- Do not reduce coverage thresholds or skip tests to get green checks.

## TypeScript and code quality

- Preserve strict TypeScript settings. Do not introduce `any`; use `unknown` and narrow it.
- Make nullability explicit and handle exhaustive unions with a `never` check.
- Prefer small cohesive functions and descriptive names over comments that restate code.
- Comment decisions, invariants, and non-obvious tradeoffs.
- Use `async`/`await` consistently. Do not leave floating promises.
- Avoid mutable module-level state.
- Follow the repository's import aliases, file naming, formatter, and lint rules.
- Do not add dependencies for trivial utilities. Check maintenance, license, bundle/runtime cost, and security before proposing a package.
- Delete dead code made obsolete by the change; do not leave commented-out implementations.

## Working procedure

1. Restate the required behavior and identify affected public contracts.
2. Inspect the relevant module end-to-end with `rg`; do not guess where behavior lives.
3. Check git status and preserve unrelated user changes.
4. Identify the package manager from the lockfile and commands from `package.json`.
5. Decide whether the change fits an existing module. Create a new module only for a distinct business capability.
6. For meaningful architectural, schema, API, security, or dependency changes, explain the tradeoff and record an ADR if the project uses them.

- Make the smallest coherent change that fully solves the request.
- Match existing conventions unless they violate an explicit requirement in this file.
- Keep refactors separate from behavior changes when practical.
- Preserve backward compatibility unless breaking change approval is explicit.
- Update code, tests, migrations, generated API schema, fixtures, and documentation together when the contract changes.
- Do not hand-edit generated files unless their generator requires it.
- Do not perform destructive git/database/filesystem operations without explicit authorization.
- Do not rewrite unrelated files or silently discard existing changes.

Use repository scripts rather than inventing commands. At minimum, run the narrowest relevant checks, then the broader checks available in the project:

1. Targeted unit/integration tests for changed code.
2. Type checking or build.
3. Lint and formatting checks.
4. Relevant E2E tests.
5. Migration validation and OpenAPI generation/diff when applicable.

If a check cannot run, report exactly which command was not run and why. Never claim a check passed unless it was executed successfully.

Summarize:

- What behavior changed.
- Important architecture or compatibility decisions.
- Files or modules affected.
- Tests/checks run and their result.
- Remaining risks, follow-ups, or unverified areas.

## Architecture decision guidance

Prefer a modular monolith when:

- One team or a small number of teams own the system.
- Features share transactions or deploy together.
- Operational simplicity and fast iteration matter.
- Independent scaling/deployment is not yet proven necessary.

Consider service extraction only when:

- A bounded capability needs independent deployment or scaling.
- Reliability or data-isolation requirements differ materially.
- Ownership is stable and the operational cost is accepted.
- The module already has a clean contract and can be extracted without sharing its database tables.

Consider CQRS only when:

- Read and write models genuinely differ, or command/query behavior is complex enough to benefit.
- The added handlers, consistency model, observability, and testing cost are justified.

Do not use CQRS merely to rename ordinary service methods.

Prefer events when:

- The publisher should not control the subscriber workflow.
- Eventual consistency is acceptable and documented.
- Delivery, ordering, deduplication, retry, and failure handling are designed.

Use a direct application call when an immediate result or atomic consistency is required.

## Anti-patterns

- A single `AppService` or giant feature service containing unrelated business logic.
- Horizontal top-level folders such as one global `controllers/`, `services/`, and `repositories/` for all features.
- A catch-all `common`, `shared`, or `utils` dumping ground.
- Business logic in controllers, guards, interceptors, ORM hooks, or DTO decorators.
- Cross-module imports of internal repositories/entities.
- Generic base services/repositories that erase domain language.
- Circular dependencies normalized with widespread `forwardRef()`.
- Request-scoped providers without a concrete requirement.
- Unbounded queries, missing timeouts, infinite retries, or fire-and-forget promises.
- Database schema changes without migrations and rollout compatibility planning.
- Microservices that share database tables or require distributed transactions for normal requests.
- Mocking so much in E2E tests that the real application path is no longer exercised.

## Definition of done

A change is complete only when:

- Behavior meets the request and module boundaries remain clear.
- Runtime inputs and configuration are validated.
- Authorization and sensitive-data handling were considered.
- Errors are safe and observable.
- Data changes include migrations and safe rollout/rollback considerations.
- Tests cover the important success and failure paths.
- Typecheck/build, lint, and relevant tests pass, or limitations are reported.
- Public API/event schemas and documentation are updated.
- No unrelated changes, secrets, debug logs, skipped tests, or dead code were introduced.
