use std::{
    env,
    path::{Path, PathBuf},
};

use axum::{Json, Router, routing::get};
use serde::Serialize;
use tower_http::services::{ServeDir, ServeFile};

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
}

pub fn app() -> Router {
    Router::new()
        .route("/api/health", get(health))
        .fallback_service(frontend_service())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "bubble-backend",
    })
}

fn frontend_service() -> ServeDir<ServeFile> {
    let dist_path = frontend_dist_path();
    let index_path = dist_path.join("index.html");

    ServeDir::new(dist_path).fallback(ServeFile::new(index_path))
}

pub fn frontend_dist_path() -> PathBuf {
    if let Ok(path) = env::var("BUBBLE_FRONTEND_DIST") {
        return PathBuf::from(path);
    }

    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("backend directory should have a project root parent")
        .join("frontend")
        .join("dist")
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::{Body, to_bytes},
        http::{Request, StatusCode},
    };
    use serde_json::Value;
    use tower::ServiceExt;

    #[tokio::test]
    async fn health_returns_ok() {
        let response = app()
            .oneshot(
                Request::builder()
                    .uri("/api/health")
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("request should succeed");

        assert_eq!(response.status(), StatusCode::OK);

        let body = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body should read");
        let json: Value = serde_json::from_slice(&body).expect("body should be json");

        assert_eq!(json["status"], "ok");
        assert_eq!(json["service"], "bubble-backend");
    }

    #[test]
    fn frontend_dist_path_is_project_relative_and_absolute() {
        let path = frontend_dist_path();
        let expected_suffix = Path::new("frontend").join("dist");

        assert!(path.is_absolute());
        assert!(path.ends_with(expected_suffix));
    }
}
