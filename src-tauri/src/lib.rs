use std::{
    collections::HashSet,
    path::Path,
    process::{Command, Stdio},
};

use serde::Serialize;

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    runtime: &'static str,
}

#[derive(Debug, Serialize)]
struct NodeVersion {
    version: String,
}

#[tauri::command]
fn desktop_health() -> HealthResponse {
    HealthResponse {
        status: "ok",
        service: "bubble-desktop",
        runtime: std::env::consts::OS,
    }
}

#[tauri::command]
fn list_node_versions() -> Result<Vec<NodeVersion>, String> {
    let output = run_nvm_command(&["ls"])?;

    Ok(parse_nvm_versions(&output)
        .into_iter()
        .map(|version| NodeVersion { version })
        .collect())
}

#[tauri::command]
fn switch_node_version(version: String) -> Result<(), String> {
    let trimmed = version.trim();

    if trimmed.is_empty() {
        return Err("Node version is required".into());
    }

    if cfg!(windows) {
        run_nvm_command(&["use", trimmed])?;
    } else {
        run_nvm_command(&["alias", "default", trimmed])?;
        run_nvm_command(&["use", trimmed])?;
    }

    Ok(())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    let folder = ensure_existing_directory(&path)?;

    let mut command = if cfg!(target_os = "macos") {
        let mut command = Command::new("open");
        command.arg(folder);
        command
    } else if cfg!(windows) {
        let mut command = Command::new("explorer");
        command.arg(folder);
        command
    } else {
        let mut command = Command::new("xdg-open");
        command.arg(folder);
        command
    };

    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Failed to open folder: {error}"))?;

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            desktop_health,
            list_node_versions,
            switch_node_version,
            open_folder
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Bubble desktop app");
}

fn run_nvm_command(args: &[&str]) -> Result<String, String> {
    let output = if cfg!(windows) {
        let mut command = Command::new("nvm");
        command.args(args).output()
    } else {
        let joined_args = args
            .iter()
            .map(|arg| shell_escape(arg))
            .collect::<Vec<_>>()
            .join(" ");
        let script = format!(
            r#"export NVM_DIR="${{NVM_DIR:-$HOME/.nvm}}"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; nvm {joined_args}"#
        );

        Command::new("sh").arg("-lc").arg(script).output()
    }
    .map_err(|error| format!("Failed to run nvm: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_owned();
        let detail = if stderr.is_empty() { stdout } else { stderr };
        return Err(if detail.is_empty() {
            "nvm command failed".into()
        } else {
            detail
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn parse_nvm_versions(output: &str) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut versions = Vec::new();

    for line in output.lines() {
        for raw_token in line.split_whitespace() {
            let token = raw_token
                .trim_matches(|character: char| {
                    matches!(character, '*' | '-' | '>' | '(' | ')' | ',' | ';')
                })
                .trim();
            let normalized = token.strip_prefix("->").unwrap_or(token);

            if is_node_version(normalized) && seen.insert(normalized.to_owned()) {
                versions.push(normalized.to_owned());
            }
        }
    }

    versions
}

fn is_node_version(value: &str) -> bool {
    let version = value.strip_prefix('v').unwrap_or(value);
    let parts = version.split('.').collect::<Vec<_>>();

    parts.len() == 3
        && parts
            .iter()
            .all(|part| !part.is_empty() && part.chars().all(|character| character.is_ascii_digit()))
}

fn ensure_existing_directory(path: &str) -> Result<String, String> {
    let trimmed = path.trim();

    if trimmed.is_empty() {
        return Err("Folder path is required".into());
    }

    let folder = Path::new(trimmed);

    if !folder.exists() {
        return Err(format!("Folder does not exist: {trimmed}"));
    }

    if !folder.is_dir() {
        return Err(format!("Path is not a folder: {trimmed}"));
    }

    Ok(trimmed.to_owned())
}

fn shell_escape(value: &str) -> String {
    format!("'{}'", value.replace('\'', r#"'\''"#))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn desktop_health_reports_ok() {
        let health = desktop_health();

        assert_eq!(health.status, "ok");
        assert_eq!(health.service, "bubble-desktop");
        assert!(!health.runtime.is_empty());
    }

    #[test]
    fn parses_nvm_versions_from_unix_output() {
        let versions = parse_nvm_versions(
            r#"
                v18.20.4
            ->  v20.11.1
                v22.2.0
            default -> 20 (-> v20.11.1)
            "#,
        );

        assert_eq!(versions, vec!["v18.20.4", "v20.11.1", "v22.2.0"]);
    }

    #[test]
    fn parses_nvm_versions_from_windows_output() {
        let versions = parse_nvm_versions(
            r#"
              * 20.11.1 (Currently using 64-bit executable)
                18.20.4
                22.2.0
            "#,
        );

        assert_eq!(versions, vec!["20.11.1", "18.20.4", "22.2.0"]);
    }

    #[test]
    fn rejects_missing_folder_path() {
        let result = ensure_existing_directory("/definitely/not/a/real/bubble/path");

        assert!(result.is_err());
    }
}
