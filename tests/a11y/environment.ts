/** The Keycloak the console suites drive: the compose stack unless KEYCLOAK_URL says otherwise. */
export const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8080";
