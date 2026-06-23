use tauri::{
    menu::{CheckMenuItem, ContextMenu, Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, Window, Wry,
};
use tauri_plugin_autostart::ManagerExt;

use crate::{
    error::{AppError, AppResult},
    settings::{AppSettings, SettingsState},
    window_ops,
};

const SCALES: [f64; 5] = [0.5, 0.75, 1.0, 1.25, 1.5];

pub struct TrayMenuState {
    menu: Menu<Wry>,
    always_on_top: CheckMenuItem<Wry>,
    auto_move: CheckMenuItem<Wry>,
    autostart: CheckMenuItem<Wry>,
    scales: Vec<(f64, CheckMenuItem<Wry>)>,
}

impl TrayMenuState {
    pub fn sync(&self, settings: &AppSettings) -> AppResult<()> {
        self.always_on_top
            .set_checked(settings.always_on_top)
            .map_err(AppError::from)?;
        self.auto_move
            .set_checked(settings.auto_move)
            .map_err(AppError::from)?;
        self.autostart
            .set_checked(settings.autostart)
            .map_err(AppError::from)?;
        for (scale, item) in &self.scales {
            item.set_checked((settings.scale - scale).abs() < f64::EPSILON)
                .map_err(AppError::from)?;
        }
        Ok(())
    }

    pub fn popup(&self, window: Window<Wry>) -> AppResult<()> {
        self.menu.popup(window).map_err(AppError::from)
    }
}

pub fn build(app: &AppHandle, settings: &AppSettings) -> AppResult<TrayMenuState> {
    let show = MenuItem::with_id(app, "show", "显示宠物", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "隐藏宠物", true, None::<&str>)?;
    let always_on_top = CheckMenuItem::with_id(
        app,
        "toggle_always_on_top",
        "始终置顶",
        true,
        settings.always_on_top,
        None::<&str>,
    )?;
    let auto_move = CheckMenuItem::with_id(
        app,
        "toggle_auto_move",
        "自动移动",
        true,
        settings.auto_move,
        None::<&str>,
    )?;
    let autostart = CheckMenuItem::with_id(
        app,
        "toggle_autostart",
        "开机启动",
        true,
        settings.autostart,
        None::<&str>,
    )?;

    let mut scale_items = Vec::new();
    for scale in SCALES {
        let label = format!("{}%", (scale * 100.0) as i32);
        let id = format!("scale_{}", (scale * 100.0) as i32);
        let item = CheckMenuItem::with_id(
            app,
            id,
            label,
            true,
            (settings.scale - scale).abs() < f64::EPSILON,
            None::<&str>,
        )?;
        scale_items.push((scale, item));
    }

    let scale_refs = scale_items
        .iter()
        .map(|(_, item)| item as &dyn tauri::menu::IsMenuItem<Wry>)
        .collect::<Vec<_>>();
    let size_menu = Submenu::with_items(app, "宠物大小", true, &scale_refs)?;
    let reload = MenuItem::with_id(app, "reload", "重新加载宠物", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let separator_one = PredefinedMenuItem::separator(app)?;
    let separator_two = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &show,
            &hide,
            &separator_one,
            &always_on_top,
            &auto_move,
            &size_menu,
            &autostart,
            &separator_two,
            &reload,
            &quit,
        ],
    )?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| AppError::State("application icon is unavailable".to_owned()))?;
    TrayIconBuilder::with_id("desktop-pet-tray")
        .icon(icon)
        .tooltip("Desktop Pet")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .build(app)?;

    Ok(TrayMenuState {
        menu,
        always_on_top,
        auto_move,
        autostart,
        scales: scale_items,
    })
}

pub fn handle_menu_action(app: &AppHandle, id: &str) -> AppResult<()> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| AppError::State("main window is unavailable".to_owned()))?;
    let state = app.state::<SettingsState>();

    match id {
        "show" => {
            window.show()?;
            app.emit("pet://visibility-changed", true)?;
        }
        "hide" => {
            window.hide()?;
            app.emit("pet://visibility-changed", false)?;
        }
        "toggle_always_on_top" => {
            let settings = state.update(|settings| {
                settings.always_on_top = !settings.always_on_top;
            })?;
            window.set_always_on_top(settings.always_on_top)?;
            sync_menu(app, &settings)?;
        }
        "toggle_auto_move" => {
            let settings = state.update(|settings| {
                settings.auto_move = !settings.auto_move;
            })?;
            sync_menu(app, &settings)?;
            app.emit("pet://settings-changed", &settings)?;
        }
        "toggle_autostart" => {
            let desired = !state.snapshot()?.autostart;
            // Only persist the new value after the OS operation actually
            // succeeds; on failure restore the menu to the real state and
            // surface the error instead of silently desyncing the checkbox.
            if let Err(error) = set_autostart(app, desired) {
                let settings = state.snapshot()?;
                sync_menu(app, &settings)?;
                return Err(error);
            }
            let settings = state.update(|settings| {
                settings.autostart = desired;
            })?;
            sync_menu(app, &settings)?;
        }
        "reload" => {
            app.emit("pet://reload", ())?;
        }
        "quit" => app.exit(0),
        value if value.starts_with("scale_") => {
            let percent = value
                .trim_start_matches("scale_")
                .parse::<f64>()
                .map_err(|_| AppError::State(format!("invalid scale menu id: {value}")))?;
            let scale = percent / 100.0;
            let settings = state.update(|settings| {
                settings.scale = scale;
            })?;
            sync_menu(app, &settings)?;
            app.emit("pet://scale-changed", scale)?;
        }
        _ => {}
    }

    Ok(())
}

pub fn sync_menu(app: &AppHandle, settings: &AppSettings) -> AppResult<()> {
    app.state::<TrayMenuState>().sync(settings)
}

pub fn set_autostart(app: &AppHandle, enabled: bool) -> AppResult<()> {
    let manager = app.autolaunch();
    let result = if enabled {
        manager.enable()
    } else {
        manager.disable()
    };
    result.map_err(|error| AppError::Autostart(error.to_string()))
}

pub fn apply_startup_settings(app: &AppHandle, settings: &AppSettings) {
    // Trust the OS over the cache: if the real autostart state differs from the
    // stored value (e.g. the user toggled it in system settings), reconcile both
    // the cached setting and the tray checkbox to match reality.
    match app.autolaunch().is_enabled() {
        Ok(real_enabled) if real_enabled != settings.autostart => {
            match app
                .state::<SettingsState>()
                .update(|settings| settings.autostart = real_enabled)
            {
                Ok(updated) => {
                    if let Err(error) = sync_menu(app, &updated) {
                        eprintln!("Could not sync reconciled autostart menu: {error}");
                    }
                }
                Err(error) => eprintln!("Could not reconcile autostart setting: {error}"),
            }
        }
        Ok(_) => {}
        Err(error) => eprintln!("Could not read autostart state: {error}"),
    }

    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.set_always_on_top(settings.always_on_top) {
            eprintln!("Could not apply always-on-top setting: {error}");
        }
        if let Some(position) = settings.position {
            if let Err(error) =
                window.set_position(tauri::PhysicalPosition::new(position.x, position.y))
            {
                eprintln!("Could not restore window position: {error}");
            }
        }
        if let Err(error) = window_ops::clamp_to_current_monitor(&window) {
            eprintln!("Could not clamp restored window position: {error}");
        }
    }
}
