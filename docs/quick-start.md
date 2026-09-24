# Quick start

There are two ways to work on this theme, and which one you need depends on what you are changing:

| You are changing | Use | Needs Keycloak? |
| --- | --- | --- |
| A login page, the login template, or `src/theme.css` login styles | [The dev server](#the-dev-server-login-pages) | No |
| The Admin or Account console | [The compose loop](#the-compose-loop-consoles) | Yes |

## Prerequisites

- **Node.js `^20.19` or `>=22.12`.** Vite 7 refuses older versions. CI uses Node 20.
- **Docker** with Compose, for the console loop.

```bash
npm install
```

`npm install` also runs `keycloakify sync-extensions`, which copies the Admin and Account console sources
into `src/admin/`, `src/account/` and `src/shared/`. Most of those files are gitignored and regenerated on
every install &mdash; see [Ownership](ownership.md) for why, and for the handful that are tracked.

## The dev server (login pages)

```bash
npm run dev
```

Open http://localhost:5173/?preview=login. The `preview` parameter picks which page to render against a mock
Keycloak context, so you get hot reload without a Keycloak server:

| `?preview=` | Page |
| --- | --- |
| `login` | Sign in |
| `login-providers` | Sign in with Google and GitHub buttons |
| `login-error` | Sign in after a failed attempt |
| `register` | Registration |
| `forgot-password` | Reset password |
| `update-password` | Update password |
| `verify-email` | Verify email |
| `update-profile` | Update profile |
| `info` | Info page |
| `error` | Error page |

These are defined in `getKcContextMockForPreview` in [`src/login/KcContext.ts`](../src/login/KcContext.ts).
The same previews are what the [screenshot tests](development.md#screenshot-tests) capture.

## The compose loop (consoles)

The dev server can't show the consoles. They authenticate against a real Keycloak, so there is no mock to
render them from, and the theme reaches Keycloak as a JAR baked into the image &mdash; restarting the container
alone does nothing. Rebuild both:

```bash
npm run build-keycloak-theme
docker compose up -d --build keycloak
```

`--build` is the part that is easy to forget. Without it the container starts from the previously baked JAR
and nothing appears to change. You don't need to clear any cache: `start-dev` disables Keycloak's theme cache.

### Which URL to open

A theme is selected per realm, and only the imported `nebari` realm selects this one. **`master` keeps the
stock consoles.** So use the `nebari` realm, with its own accounts:

| Console | URL | Sign in as |
| --- | --- | --- |
| Admin | http://localhost:8080/admin/nebari/console/ | `nebari-admin` / `nebari-admin` |
| Account | http://localhost:8080/realms/nebari/account/ | `demo` / `demo` |

`admin` / `admin` from `docker-compose.yml` is the *master* realm's bootstrap admin. It can administer the
`nebari` realm, but only from http://localhost:8080/admin/master/console/, which renders in master's own stock
theme &mdash; a Keycloak session belongs to the realm it was created in. That is why the seeded realm also has
`nebari-admin`, who holds `realm-management` &rarr; `realm-admin` inside `nebari`.

> **The seeded realm is for local development only.** `realm-export.json` is mounted by
> `docker-compose.yml` and imported with `--import-realm`. The `Dockerfile` copies only the theme JAR, so
> neither these credentials nor this realm reach the published image. Don't import it anywhere else.

### Tearing down

```bash
docker compose down -v
```

`-v` drops the Postgres volume, so the next `up` re-imports `realm-export.json` from scratch. Without it,
Keycloak keeps the realm it imported the first time and ignores later edits to the file.

## Next

- [Development](development.md) &mdash; the rest of the scripts, the screenshot baselines, and the upgrade guards
- [Architecture](architecture.md) &mdash; how the consoles are restyled without forking them
