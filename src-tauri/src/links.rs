use crate::models::{AppError, AppResult};

fn validated(value: &str) -> AppResult<tauri::Url> {
    let invalid = || AppError::new("link", "Endereço de link inválido.");
    if value
        .chars()
        .any(|c| c.is_whitespace() || c.is_control() || c == '\\')
    {
        return Err(invalid());
    }
    let url = tauri::Url::parse(value).map_err(|_| invalid())?;
    if !url.username().is_empty() || url.password().is_some() {
        return Err(invalid());
    }
    match url.scheme() {
        "http" | "https" if url.host_str().is_some() => Ok(url),
        "mailto"
            if url
                .path()
                .split_once('@')
                .is_some_and(|(a, b)| !a.is_empty() && !b.is_empty()) =>
        {
            Ok(url)
        }
        _ => Err(invalid()),
    }
}

#[tauri::command]
pub async fn open_link(href: String) -> AppResult<()> {
    let url = validated(&href)?;
    crate::blocking(move || launch(url.as_str())).await
}

#[cfg(target_os = "linux")]
fn launch(href: &str) -> AppResult<()> {
    gio::AppInfo::launch_default_for_uri(href, None::<&gio::AppLaunchContext>)
        .map_err(|_| AppError::new("link", "Não foi possível abrir o link no navegador padrão."))
}

#[cfg(windows)]
fn launch(href: &str) -> AppResult<()> {
    use std::ptr::{null, null_mut};
    use windows_sys::Win32::UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL};
    let verb: Vec<u16> = "open\0".encode_utf16().collect();
    let address: Vec<u16> = href.encode_utf16().chain(Some(0)).collect();
    let result = unsafe {
        ShellExecuteW(
            null_mut(),
            verb.as_ptr(),
            address.as_ptr(),
            null(),
            null(),
            SW_SHOWNORMAL,
        )
    };
    if result as isize <= 32 {
        return Err(AppError::new(
            "link",
            "Não foi possível abrir o link no navegador padrão.",
        ));
    }
    Ok(())
}

#[cfg(not(any(windows, target_os = "linux")))]
fn launch(_href: &str) -> AppResult<()> {
    Err(AppError::new(
        "link",
        "Não foi possível abrir o link no navegador padrão.",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opens_only_web_and_email_without_embedded_credentials() {
        for value in [
            "https://example.com/path?q=1#part",
            "http://localhost:3000",
            "mailto:davi@example.com",
        ] {
            assert!(validated(value).is_ok(), "{value}");
        }
        for value in [
            "javascript:alert(1)",
            "file:///tmp/a",
            "data:text/html,test",
            "ms-settings:defaultapps",
            "https://user:pass@example.com",
            "https://exa\nmple.com",
            "https://example.com\\evil",
            "mailto:",
            "mailto:@example.com",
            "example.com",
            "",
        ] {
            assert!(validated(value).is_err(), "{value}");
        }
    }
}
