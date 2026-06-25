use std::{net::SocketAddr, process::ExitCode};

use bubble_backend::app;
use tokio::net::TcpListener;
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> ExitCode {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,tower_http=info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    let listener = match TcpListener::bind(addr).await {
        Ok(listener) => listener,
        Err(error) => {
            eprintln!("failed to bind {addr}: {error}");
            return ExitCode::FAILURE;
        }
    };

    println!("backend listening on http://{addr}");

    match axum::serve(listener, app()).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("server error: {error}");
            ExitCode::FAILURE
        }
    }
}
