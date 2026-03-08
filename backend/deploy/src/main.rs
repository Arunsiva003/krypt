use axum::{
    extract::Path,
    http::{Method, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde_derive::{Deserialize, Serialize};
use shuttle::sync::SyncWrapper;
use tokio_postgres::{Client, NoTls};
use tower_http::cors::{Any, CorsLayer};

#[derive(Serialize, Deserialize)]
struct User {
    id: Option<i32>,
    firstname: String,
    lastname: String,
    username: String,
    email: String,
    password: String,
}

#[derive(Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

const DB_URL: &str = "postgresql://uu09n2xc646nt4vczmt7:bTb9GyWabKOZ5h499cnEeIZXMSzt8x@b3ix8fekyxlm55qvgxtk-postgresql.services.clever-cloud.com:50013/b3ix8fekyxlm55qvgxtk";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let router = build_router();
    let sync_wrapper = SyncWrapper::new(router);
    shuttle::tokio::run_forever(sync_wrapper).await
}

fn build_router() -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers(Any);

    Router::new()
        .route("/", get(hello_world))
        .route("/api/rust/users", post(handle_post_request))
        .route("/api/rust/users/:id", get(handle_get_request))
        .route("/api/rust/users/login", post(handle_login_request))
        .layer(cors)
}

async fn hello_world() -> &'static str {
    "Hello, world!"
}

async fn connect_db() -> Result<Client, (StatusCode, String)> {
    let (client, connection) = tokio_postgres::connect(DB_URL, NoTls)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database connection failed".to_string()))?;

    tokio::spawn(async move {
        let _ = connection.await;
    });

    Ok(client)
}

async fn handle_post_request(
    Json(user): Json<User>,
) -> Result<Json<User>, (StatusCode, String)> {
    let mut client = connect_db().await?;

    let row = client
        .query_one(
            "INSERT INTO users (firstname, lastname, username, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            &[&user.firstname, &user.lastname, &user.username, &user.email, &user.password],
        )
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to insert user".to_string()))?;

    let user_id: i32 = row.get(0);

    let row = client
        .query_one(
            "SELECT id, firstname, lastname, username, email, password FROM users WHERE id = $1",
            &[&user_id],
        )
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch created user".to_string()))?;

    Ok(Json(User {
        id: Some(row.get(0)),
        firstname: row.get(1),
        lastname: row.get(2),
        username: row.get(3),
        email: row.get(4),
        password: row.get(5),
    }))
}

async fn handle_get_request(Path(id): Path<i32>) -> Result<Json<User>, (StatusCode, String)> {
    let mut client = connect_db().await?;

    let maybe_row = client
        .query_opt(
            "SELECT id, firstname, lastname, username, email, password FROM users WHERE id = $1",
            &[&id],
        )
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch user".to_string()))?;

    let row = maybe_row.ok_or((StatusCode::NOT_FOUND, "User not found".to_string()))?;

    Ok(Json(User {
        id: Some(row.get(0)),
        firstname: row.get(1),
        lastname: row.get(2),
        username: row.get(3),
        email: row.get(4),
        password: row.get(5),
    }))
}

async fn handle_login_request(
    Json(payload): Json<LoginRequest>,
) -> Result<Json<User>, (StatusCode, String)> {
    let mut client = connect_db().await?;

    let maybe_row = client
        .query_opt(
            "SELECT id, firstname, lastname, username, email, password FROM users WHERE email = $1 AND password = $2",
            &[&payload.email, &payload.password],
        )
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to validate user".to_string()))?;

    let row = maybe_row.ok_or((StatusCode::NOT_FOUND, "Invalid email or password".to_string()))?;

    Ok(Json(User {
        id: Some(row.get(0)),
        firstname: row.get(1),
        lastname: row.get(2),
        username: row.get(3),
        email: row.get(4),
        password: row.get(5),
    }))
}
