use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::error::{AppError, AppResult};

/// Pet shown on a fresh install (and whenever the stored id is unusable).
/// Wangdulan is the flagship pet; "default" (niuniu) stays available via
/// settings.json for users who explicitly select it.
pub const DEFAULT_PET: &str = "wangdulan";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredPosition {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct AppSettings {
    pub position: Option<StoredPosition>,
    pub scale: f64,
    pub always_on_top: bool,
    pub auto_move: bool,
    pub autostart: bool,
    pub selected_pet: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            position: None,
            scale: 1.0,
            always_on_top: true,
            auto_move: true,
            autostart: false,
            selected_pet: DEFAULT_PET.to_owned(),
        }
    }
}

pub struct SettingsState {
    path: PathBuf,
    inner: Mutex<AppSettings>,
}

impl SettingsState {
    pub fn load(app: &AppHandle) -> AppResult<Self> {
        let config_dir = app.path().app_config_dir()?;
        let path = config_dir.join("settings.json");
        let settings = load_settings_file(&path)?;

        Ok(Self {
            path,
            inner: Mutex::new(settings),
        })
    }

    pub fn snapshot(&self) -> AppResult<AppSettings> {
        self.inner
            .lock()
            .map(|settings| settings.clone())
            .map_err(|_| AppError::State("settings mutex is poisoned".to_owned()))
    }

    pub fn update<F>(&self, update: F) -> AppResult<AppSettings>
    where
        F: FnOnce(&mut AppSettings),
    {
        self.update_if_changed(|settings| {
            update(settings);
            true
        })
    }

    /// Applies `update` and only writes the settings file when the closure
    /// reports an actual change, avoiding redundant disk writes (e.g. when the
    /// pet returns to idle without having moved).
    pub fn update_if_changed<F>(&self, update: F) -> AppResult<AppSettings>
    where
        F: FnOnce(&mut AppSettings) -> bool,
    {
        let (settings, changed) = {
            let mut guard = self
                .inner
                .lock()
                .map_err(|_| AppError::State("settings mutex is poisoned".to_owned()))?;
            let changed = update(&mut guard);
            (guard.clone(), changed)
        };
        if changed {
            save_settings_file(&self.path, &settings)?;
        }
        Ok(settings)
    }
}

fn load_settings_file(path: &Path) -> AppResult<AppSettings> {
    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let contents = fs::read_to_string(path)?;
    let mut settings: AppSettings = serde_json::from_str(&contents)?;
    sanitize(&mut settings);
    Ok(settings)
}

fn save_settings_file(path: &Path, settings: &AppSettings) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let contents = serde_json::to_string_pretty(settings)?;
    fs::write(path, contents)?;
    Ok(())
}

fn sanitize(settings: &mut AppSettings) {
    const VALID_SCALES: [f64; 5] = [0.5, 0.75, 1.0, 1.25, 1.5];
    if !VALID_SCALES
        .iter()
        .any(|candidate| (settings.scale - candidate).abs() < f64::EPSILON)
    {
        settings.scale = 1.0;
    }
    // Legacy migration: builds up to 0.2.0 hard-coded "default" and offered no
    // pet chooser, so a stored "default" is an implicit leftover, not a user
    // decision. Uninstalling does not clear the config dir, so without this
    // rewrite upgraded installs would keep opening the old pet forever.
    if settings.selected_pet.trim().is_empty() || settings.selected_pet == "default" {
        settings.selected_pet = DEFAULT_PET.to_owned();
    }
}

#[cfg(test)]
mod tests {
    use super::{sanitize, AppSettings};

    #[test]
    fn invalid_scale_is_reset() {
        let mut settings = AppSettings {
            scale: 9.0,
            ..AppSettings::default()
        };
        sanitize(&mut settings);
        assert_eq!(settings.scale, 1.0);
    }

    #[test]
    fn legacy_default_pet_migrates_to_flagship() {
        let mut settings = AppSettings {
            selected_pet: "default".to_owned(),
            ..AppSettings::default()
        };
        sanitize(&mut settings);
        assert_eq!(settings.selected_pet, super::DEFAULT_PET);
    }

    #[test]
    fn explicit_other_pet_is_kept() {
        let mut settings = AppSettings {
            selected_pet: "some-future-pet".to_owned(),
            ..AppSettings::default()
        };
        sanitize(&mut settings);
        assert_eq!(settings.selected_pet, "some-future-pet");
    }
}
