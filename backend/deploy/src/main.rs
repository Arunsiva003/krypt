use axum::{handler::get, routing::post, Router};
use shuttle::sync::SyncWrapper;
use tokio_postgres::{Client, NoTls};
use serde_derive::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct User {
    id: Option<i32>,
    name: String,
    email: String,
}

const DB_URL: &str = "postgresql://uu09n2xc646nt4vczmt7:bTb9GyWabKOZ5h499cnEeIZXMSzt8x@b3ix8fekyxlm55qvgxtk-postgresql.services.clever-cloud.com:50013/b3ix8fekyxlm55qvgxtk";

const OK_RESPONSE: &str = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, PUT, DELETE\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n";
const NOT_FOUND: &str = "HTTP/1.1 404 NOT FOUND\r\n\r\n";
const INTERNAL_ERROR: &str = "HTTP/1.1 500 INTERNAL ERROR\r\n\r\n";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let router = build_router();
    let sync_wrapper = SyncWrapper::new(router);
    shuttle::tokio::run_forever(sync_wrapper).await
}

fn build_router() -> Router {
    Router::new()
        .route("/", get(hello_world))
        .route("/api/rust/users", post(handle_post_request))
        .route("/api/rust/users/:id", get(handle_get_request))
}

async fn hello_world() -> &'static str {
    "Hello, world!"
}

fn get_id(request: &str) -> &str {
    request.split("/").nth(4).unwrap_or_default().split_whitespace().next().unwrap_or_default()
}

fn get_user_request_body(request: &str) -> Result<User, serde_json::Error> {
    serde_json::from_str(request.split("\r\n\r\n").last().unwrap_or_default())
}

async fn handle_post_request(user: axum::Json<User>) -> axum::Json<User> {
    match (tokio_postgres::connect(DB_URL, NoTls).await, user.0) {
        (Ok(mut client), user) => {
            let row = client
                .query_one(
                    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
                    &[&user.name, &user.email]
                )
                .unwrap();

            let user_id: i32 = row.get(0);

            match client.query_one("SELECT id, name, email FROM users WHERE id = $1", &[&user_id]) {
                Ok(row) => {
                    let user = User {
                        id: Some(row.get(0)),
                        name: row.get(1),
                        email: row.get(2),
                    };
                    axum::Json(user)
                }
                Err(_) =>
                    axum::Json(User {
                        id: None,
                        name: "".to_string(),
                        email: "".to_string(),
                    }),
            }
        }
        Err(_) => axum::Json(User {
            id: None,
            name: "".to_string(),
            email: "".to_string(),
        }),
    }
}

async fn handle_get_request(params: axum::extract::Path<(i32,)>) -> axum::Json<User> {
    match (tokio_postgres::connect(DB_URL, NoTls).await, params.0) {
        (Ok(mut client), id) =>
            match client.query_one("SELECT * FROM users WHERE id = $1", &[&id]) {
                Ok(row) => {
                    let user = User {
                        id: row.get(0),
                        name: row.get(1),
                        email: row.get(2),
                    };
                    axum::Json(user)
                }
                _ =>
                    axum::Json(User {
                        id: None,
                        name: "".to_string(),
                        email: "".to_string(),
                    }),
            }

        _ => axum::Json(User {
            id: None,
            name: "".to_string(),
            email: "".to_string(),
        }),
    }
}
