use crate::models::{AppError, AppResult};
use serde::Serialize;
use std::collections::VecDeque;
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

#[derive(Debug, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum OpenRequest {
    File { path: String },
    Error { message: String },
}

fn request(value: OsString, cwd: &Path) -> OpenRequest {
    let Ok(value) = value.into_string() else {
        return OpenRequest::Error {
            message: "O nome do arquivo não está em Unicode válido.".into(),
        };
    };
    let candidate = PathBuf::from(&value);
    let path = if !candidate.is_absolute() && (value.starts_with("file:") || value.contains("://"))
    {
        match tauri::Url::parse(&value)
            .ok()
            .filter(|url| url.scheme() == "file")
            .filter(|url| {
                url.host_str()
                    .is_none_or(|host| host.is_empty() || host == "localhost")
            })
            .and_then(|url| url.to_file_path().ok())
        {
            Some(path) => path,
            None => {
                return OpenRequest::Error {
                    message: "Abra um arquivo local .md, .markdown ou .txt.".into(),
                }
            }
        }
    } else if candidate.is_absolute() {
        candidate
    } else {
        cwd.join(candidate)
    };
    let supported = path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            ["md", "markdown", "txt"].contains(&extension.to_ascii_lowercase().as_str())
        });
    if !supported {
        return OpenRequest::Error {
            message: format!(
                "“{}” não é um documento Markdown ou TXT.",
                path.file_name().unwrap_or_default().to_string_lossy()
            ),
        };
    }
    match path.to_str() {
        Some(path) => OpenRequest::File { path: path.into() },
        None => OpenRequest::Error {
            message: "O caminho do arquivo não está em Unicode válido.".into(),
        },
    }
}

#[derive(Clone, Default)]
pub struct IncomingFiles(Arc<Mutex<VecDeque<OpenRequest>>>);

impl IncomingFiles {
    pub fn enqueue(&self, arguments: impl IntoIterator<Item = OsString>, cwd: &Path) {
        if let Ok(mut queue) = self.0.lock() {
            queue.extend(
                arguments
                    .into_iter()
                    .filter(|argument| argument != "--")
                    .map(|argument| request(argument, cwd)),
            );
        }
    }

    pub fn take(&self) -> AppResult<Vec<OpenRequest>> {
        let mut queue = self.0.lock().map_err(|_| {
            AppError::new(
                "busy",
                "Não foi possível receber os documentos do explorador.",
            )
        })?;
        Ok(queue.drain(..).collect())
    }
}

// Perfis de dados separados (incluindo os testes) não compartilham a mesma janela.
#[cfg(target_os = "linux")]
pub fn instance_id() -> String {
    let config = std::env::var_os("XDG_CONFIG_HOME")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(std::env::var_os("HOME").unwrap_or_default()).join(".config")
        });
    let fingerprint = crate::files::fingerprint(config.as_os_str().as_encoded_bytes());
    format!("io.github.bitdevy.entrelinhas.p{}", &fingerprint[..24])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn receives_multiple_paths_with_spaces_unicode_and_relative_names() {
        let queue = IncomingFiles::default();
        let directory = tempfile::tempdir().unwrap();
        let absolute = directory.path().join("Texto com 'aspas'.txt");
        queue.enqueue(
            [
                OsString::from("--"),
                OsString::from("Nota com espaços 日本語.MD"),
                absolute.clone().into_os_string(),
            ],
            directory.path(),
        );
        assert_eq!(
            queue.take().unwrap(),
            vec![
                OpenRequest::File {
                    path: directory
                        .path()
                        .join("Nota com espaços 日本語.MD")
                        .to_string_lossy()
                        .into()
                },
                OpenRequest::File {
                    path: absolute.to_string_lossy().into()
                },
            ]
        );
        assert!(queue.take().unwrap().is_empty());
    }

    #[test]
    fn decodes_local_file_uris_and_rejects_remote_or_unsupported_inputs() {
        let queue = IncomingFiles::default();
        let path = std::env::temp_dir().join("ideias e ação.markdown");
        let uri = tauri::Url::from_file_path(&path).unwrap();
        queue.enqueue(
            [
                uri.as_str(),
                "https://example.com/nota.md",
                "/tmp/foto.png",
                "file://servidor/nota.md",
            ]
            .map(OsString::from),
            &std::env::temp_dir(),
        );
        let requests = queue.take().unwrap();
        assert_eq!(
            requests[0],
            OpenRequest::File {
                path: path.to_string_lossy().into_owned()
            }
        );
        assert!(requests[1..]
            .iter()
            .all(|value| matches!(value, OpenRequest::Error { .. })));
    }

    #[test]
    fn keeps_requests_arriving_after_the_first_batch() {
        let queue = IncomingFiles::default();
        let root = std::env::temp_dir();
        queue.enqueue([OsString::from("primeiro.md")], &root);
        assert_eq!(queue.take().unwrap().len(), 1);
        let sender = queue.clone();
        std::thread::spawn(move || {
            sender.enqueue([OsString::from("segundo.txt")], &std::env::temp_dir())
        })
        .join()
        .unwrap();
        assert_eq!(
            queue.take().unwrap(),
            vec![OpenRequest::File {
                path: root.join("segundo.txt").to_string_lossy().into()
            }]
        );
    }
}
