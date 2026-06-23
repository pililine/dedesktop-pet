mod commands;
mod error;
mod settings;
mod tray;
mod window_ops;

use settings::SettingsState;
use tauri::{Emitter, Manager};
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let settings_state = SettingsState::load(app.handle())?;
            let settings = settings_state.snapshot()?;
            app.manage(settings_state);

            let tray_state = tray::build(app.handle(), &settings)?;
            app.manage(tray_state);
            tray::apply_startup_settings(app.handle(), &settings);

            Ok(())
        })
        .on_menu_event(|app, event| {
            if let Err(error) = tray::handle_menu_action(app, event.id().as_ref()) {
                let message = error.to_string();
                eprintln!("Menu action failed: {message}");
                let _ = app.emit("pet://error", message);
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::initialize_pet_window,
            commands::set_pet_scale,
            commands::move_pet_window,
            commands::start_dragging,
            commands::persist_window_position,
            commands::show_pet_menu,
            commands::apply_menu_action,
            commands::refresh_settings,
        ])
        .build(tauri::generate_context!());

    match app {
        Ok(app) => app.run(|_app, _event| {}),
        Err(error) => {
            eprintln!("Desktop Pet failed to start: {error}");
        }
    }
}
