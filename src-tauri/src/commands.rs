use tauri::{AppHandle, Manager, State, WebviewWindow, Window};

use crate::{
    settings::{AppSettings, SettingsState, StoredPosition},
    tray::{self, TrayMenuState},
    window_ops::{self, MovementResult},
};

#[tauri::command]
pub fn get_settings(state: State<'_, SettingsState>) -> Result<AppSettings, String> {
    state.snapshot().map_err(String::from)
}

#[tauri::command]
pub fn initialize_pet_window(
    window: WebviewWindow,
    state: State<'_, SettingsState>,
    frame_width: f64,
    frame_height: f64,
    scale: f64,
) -> Result<(), String> {
    let settings = state.snapshot().map_err(String::from)?;
    window_ops::initialize_window(
        &window,
        frame_width,
        frame_height,
        scale,
        settings.position,
        settings.always_on_top,
    )
    .map_err(String::from)
}

#[tauri::command]
pub fn set_pet_scale(
    app: AppHandle,
    window: WebviewWindow,
    state: State<'_, SettingsState>,
    scale: f64,
    frame_width: f64,
    frame_height: f64,
) -> Result<(), String> {
    const VALID_SCALES: [f64; 5] = [0.5, 0.75, 1.0, 1.25, 1.5];
    if !VALID_SCALES
        .iter()
        .any(|candidate| (scale - candidate).abs() < f64::EPSILON)
    {
        return Err("scale must be one of 0.5, 0.75, 1, 1.25, 1.5".to_owned());
    }

    window_ops::resize_window(&window, frame_width, frame_height, scale).map_err(String::from)?;
    let settings = state
        .update(|settings| settings.scale = scale)
        .map_err(String::from)?;
    tray::sync_menu(&app, &settings).map_err(String::from)
}

#[tauri::command]
pub fn move_pet_window(
    window: WebviewWindow,
    delta_x: f64,
    delta_y: f64,
) -> Result<MovementResult, String> {
    window_ops::move_by(&window, delta_x, delta_y).map_err(String::from)
}

#[tauri::command]
pub fn start_dragging(window: WebviewWindow) -> Result<(), String> {
    window.start_dragging().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn persist_window_position(
    window: WebviewWindow,
    state: State<'_, SettingsState>,
) -> Result<(), String> {
    let position = window.outer_position().map_err(|error| error.to_string())?;
    let next = StoredPosition {
        x: position.x,
        y: position.y,
    };
    state
        .update_if_changed(|settings| {
            if settings.position == Some(next) {
                return false;
            }
            settings.position = Some(next);
            true
        })
        .map(|_| ())
        .map_err(String::from)
}

#[tauri::command]
pub fn show_pet_menu(window: Window, menu: State<'_, TrayMenuState>) -> Result<(), String> {
    menu.popup(window).map_err(String::from)
}

#[tauri::command]
pub fn apply_menu_action(app: AppHandle, action: String) -> Result<(), String> {
    tray::handle_menu_action(&app, &action).map_err(String::from)
}

#[tauri::command]
pub fn refresh_settings(app: AppHandle) -> Result<AppSettings, String> {
    app.state::<SettingsState>()
        .snapshot()
        .map_err(String::from)
}
