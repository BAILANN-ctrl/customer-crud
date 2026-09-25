# Customer CRUD Application

A simple Customer Management application built for the code challenge. It provides
full CRUD (Create, Update, Delete, List, View) for customer records, keeps an
Elasticsearch index in sync with every write, and exposes search-by-name/email on
the listing endpoint.

## Architecture

The whole stack is orchestrated with **docker-compose** and is made up of exactly
the required services, plus the Angular UI:

| Service      | What it is                                   | Container name        | Host port |
|--------------|-----------------------------------------------|------------------------|-----------|
| `database`   | MySQL 8 — relational storage for customers     | `customer_database`    | 3306      |
| `searcher`   | Elasticsearch 7.17 — search documents          | `customer_searcher`    | 9200      |
| `api`        | Lumen (PHP 8.2) — the backend REST API         | `customer_api`         | 9000 (internal only) |
| `controller` | Nginx — reverse proxy / load balancer in front of `api` | `customer_controller`  | 8080      |
| `frontend`   | Angular UI, served by its own Nginx            | `customer_frontend`    | 4200      |

```
Browser ──► frontend (Nginx + Angular, :4200)
                │
                ▼  (calls /api/*)
            controller (Nginx load balancer, :8080)
                │  fastcgi
                ▼
              api (Lumen / PHP-FPM)
                │                      │
                ▼                      ▼
            database (MySQL)      searcher (Elasticsearch)
```

Every time a customer is created, updated, or deleted, an Eloquent model
**observer** (`app/Observers/CustomerObserver.php`) calls
`App\Services\ElasticsearchService`, which talks to the Elasticsearch REST API
directly over HTTP using **Guzzle** (no Laravel Scout is used, per the
challenge requirements). The `GET /api/customers?q=...` endpoint queries
Elasticsearch (matching on first name, last name, full name and email) and
re-hydrates the matched rows from MySQL before returning them, so results are
always search-relevant but data-fresh.

## Requirements

- Docker
- Docker Compose (v2 syntax, i.e. `docker compose ...`)

No local PHP, Composer, Node, or npm installation is required — everything
builds inside containers.

## Running the application

```bash
git clone <this-repository-url>
cd customer-crud

docker compose up --build
```

On first boot:
- The `api` container waits for MySQL to be ready, then runs
  `php artisan migrate --force` automatically (via `api/docker/entrypoint.sh`),
  creating the `customers` table.
- The `api` container also runs `php artisan es:init-index` to create the
  Elasticsearch `customers` index with an explicit mapping.

Once everything is up:

- **Frontend (UI):** http://localhost:4200
- **API (via load balancer):** http://localhost:8080/api/customers
- **Elasticsearch:** http://localhost:9200

To stop everything:

```bash
docker compose down          # stop containers
docker compose down -v       # stop containers AND wipe DB/ES volumes
```

## API Reference

Base URL: `http://localhost:8080/api`

| Method | Endpoint             | Description                                          |
|--------|-----------------------|-------------------------------------------------------|
| GET    | `/customers`          | List customers. Supports `?q=<term>` to search by first/last name or email (queries Elasticsearch), and `?page=`/`?per_page=` for pagination of the plain listing. |
| POST   | `/customers`           | Create a customer. Body: `first_name`, `last_name`, `email`, `contact_number`. |
| GET    | `/customers/{id}`     | View a single customer.                                |
| PUT    | `/customers/{id}`     | Update a customer.                                     |
| DELETE | `/customers/{id}`     | Delete a customer.                                     |

**Validation rules**
- `first_name` — required
- `last_name` — required
- `email` — required, valid email, **unique** across customers
- `contact_number` — required

Example error response (422):

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email has already been taken."]
  }
}
```

## Running tests

The Lumen API ships with both feature tests (full CRUD + validation, hitting
an in-memory SQLite DB with a faked Elasticsearch client) and a unit test for
`ElasticsearchService` (using a mocked Guzzle handler, so no live cluster is
needed):

```bash
docker compose exec api vendor/bin/phpunit
```

The Angular app includes unit tests for `CustomerService`:

```bash
docker compose exec frontend sh -c "cd /app && npm test"
# (or, for local development outside Docker: npm install && npm test)
```

## Project layout

```
customer-crud/
├── docker-compose.yml
├── api/                # Lumen backend
│   ├── app/
│   │   ├── Http/Controllers/CustomerController.php
│   │   ├── Models/Customer.php
│   │   ├── Observers/CustomerObserver.php
│   │   └── Services/ElasticsearchService.php
│   ├── database/migrations/
│   ├── routes/web.php
│   ├── tests/
│   └── Dockerfile
├── nginx/               # controller / load balancer service
│   ├── Dockerfile
│   └── default.conf
└── frontend/             # Angular UI
    ├── src/app/
    │   ├── components/customer-list/
    │   ├── components/customer-form/
    │   ├── models/customer.model.ts
    │   └── services/customer.service.ts
    └── Dockerfile
```

## Notes on design decisions

- **Lumen** was chosen over full Laravel for a lighter, faster-booting API
  that's well suited to a small, focused REST service.
- **Elasticsearch sync** is implemented entirely with `GuzzleHttp\Client`
  inside `ElasticsearchService`, triggered by an Eloquent observer — this
  keeps the sync logic decoupled from the controller and framework-agnostic
  with respect to search tooling (no Scout).
- Sync calls are wrapped in try/catch and logged rather than thrown, so a
  transient Elasticsearch hiccup never blocks a customer create/update/delete
  against the source-of-truth database.
- The **controller** service is a plain Nginx reverse proxy/load balancer
  sitting in front of the `api` PHP-FPM container, matching the challenge's
  explicit "controller/load balancer" service requirement.
- The Angular app is a small, standard NgModule-based app (list, create,
  edit, and read-only view) using Reactive Forms and Bootstrap 5 for styling.
