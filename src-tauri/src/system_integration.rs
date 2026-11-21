use crate::models::{AppError, AppResult};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DefaultAppStatus {
    pub supported: bool,
    pub registered: bool,
    pub markdown: bool,
    pub text: bool,
    pub requires_settings: bool,
}

#[cfg(target_os = "linux")]
mod platform {
    use super::*;
    use gio::prelude::*;

    const DESKTOP_IDS: [&str; 2] = ["entrelinhas.desktop", "Entrelinhas.desktop"];
    const TYPES: [&str; 3] = ["text/markdown", "text/x-markdown", "text/plain"];

    fn application() -> Option<gio::DesktopAppInfo> {
        DESKTOP_IDS.into_iter().find_map(gio::DesktopAppInfo::new)
    }

    fn is_default(mime: &str) -> bool {
        gio::AppInfo::default_for_type(mime, false)
            .and_then(|app| app.id())
            .is_some_and(|id| DESKTOP_IDS.iter().any(|known| id.as_str() == *known))
    }

    pub fn status() -> AppResult<DefaultAppStatus> {
        Ok(DefaultAppStatus {
            supported: true,
            registered: application().is_some(),
            markdown: is_default(TYPES[0]) && is_default(TYPES[1]),
            text: is_default(TYPES[2]),
            requires_settings: false,
        })
    }

    pub fn set_default() -> AppResult<DefaultAppStatus> {
        let application = application().ok_or_else(|| {
            AppError::new(
                "not_installed",
                "Instale ou atualize o Entrelinhas para registrá-lo no menu de aplicativos.",
            )
        })?;
        for mime in TYPES {
            application.set_as_default_for_type(mime).map_err(|error| {
                AppError::new(
                    "association",
                    format!("O sistema não permitiu definir o padrão para {mime}: {error}"),
                )
            })?;
        }
        let result = status()?;
        if !result.markdown || !result.text {
            return Err(AppError::new(
                "association",
                "O sistema ainda não confirmou o Entrelinhas como padrão. Tente novamente nas configurações.",
            ));
        }
        Ok(result)
    }
}

#[cfg(windows)]
#[path = "windows_integration.rs"]
mod platform;

#[cfg(not(any(target_os = "linux", windows)))]
mod platform {
    use super::*;

    pub fn status() -> AppResult<DefaultAppStatus> {
        Ok(DefaultAppStatus {
            supported: false,
            registered: false,
            markdown: false,
            text: false,
            requires_settings: false,
        })
    }

    pub fn set_default() -> AppResult<DefaultAppStatus> {
        Err(AppError::new(
            "unsupported",
            "Escolha o Entrelinhas nas configurações de aplicativos padrão do sistema.",
        ))
    }
}

pub use platform::{set_default, status};

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::*;
    use std::process::Command;

    #[test]
    fn associations_use_only_the_explicitly_selected_profile() {
        // O GIO mantém caches globais: cada caso usa um processo e um perfil XDG
        // próprios. Nenhuma associação da conta do usuário é consultada ou alterada.
        for desktop_id in ["entrelinhas.desktop", "Entrelinhas.desktop", "missing"] {
            let directory = tempfile::tempdir().unwrap();
            let data = directory.path().join("data");
            let config = directory.path().join("config");
            let applications = data.join("applications");
            std::fs::create_dir_all(&applications).unwrap();
            std::fs::create_dir_all(&config).unwrap();
            if desktop_id != "missing" {
                std::fs::write(
                    applications.join(desktop_id),
                    include_str!("../resources/entrelinhas.desktop")
                        .replace("Exec=entrelinhas %F", "Exec=/bin/true %F"),
                )
                .unwrap();
            }
            let output = Command::new(std::env::current_exe().unwrap())
                .args([
                    "--exact",
                    "system_integration::tests::isolated_profile_helper",
                    "--nocapture",
                ])
                .env("ENTRELINHAS_ASSOCIATION_TEST", desktop_id)
                .env("XDG_DATA_HOME", &data)
                .env("XDG_CONFIG_HOME", &config)
                .env("XDG_DATA_DIRS", directory.path().join("system-data"))
                .env("XDG_CONFIG_DIRS", directory.path().join("system-config"))
                .output()
                .unwrap();
            assert!(
                output.status.success(),
                "{desktop_id}: {} {}",
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            );
        }
    }

    #[test]
    fn isolated_profile_helper() {
        let Ok(desktop_id) = std::env::var("ENTRELINHAS_ASSOCIATION_TEST") else {
            return;
        };
        let config = std::path::PathBuf::from(std::env::var_os("XDG_CONFIG_HOME").unwrap());
        let initial = status().unwrap();
        assert!(initial.supported);
        assert!(!initial.markdown && !initial.text);
        assert!(
            !config.join("mimeapps.list").exists(),
            "Consultar não define padrões."
        );
        if desktop_id == "missing" {
            assert!(!initial.registered);
            assert_eq!(set_default().unwrap_err().code, "not_installed");
            assert!(!config.join("mimeapps.list").exists());
        } else {
            assert!(initial.registered);
            let applied = set_default().unwrap();
            assert!(applied.markdown && applied.text);
            let stored = std::fs::read_to_string(config.join("mimeapps.list")).unwrap();
            for mime in ["text/markdown", "text/x-markdown", "text/plain"] {
                assert!(stored.contains(&format!("{mime}={desktop_id}")), "{stored}");
            }
        }
    }
}
