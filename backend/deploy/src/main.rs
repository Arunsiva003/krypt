use axum::{http::StatusCode, routing::any, Json, Router};
use serde_json::json;
use shuttle::sync::SyncWrapper;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let router = Router::new().fallback(any(retired));
    shuttle::tokio::run_forever(SyncWrapper::new(router)).await
}

async fn retired() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::GONE,
        Json(json!({
            "error": "The legacy Rust backend is retired. Use the serverless /api/rust API."
        })),
    )
}
