use serde::Serialize;
use tauri::{LogicalSize, PhysicalPosition, Position, Size, WebviewWindow};

use crate::{
    error::{AppError, AppResult},
    settings::StoredPosition,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MovementResult {
    pub x: i32,
    pub y: i32,
    pub hit_left: bool,
    pub hit_right: bool,
    pub hit_top: bool,
    pub hit_bottom: bool,
}

pub fn initialize_window(
    window: &WebviewWindow,
    frame_width: f64,
    frame_height: f64,
    scale: f64,
    position: Option<StoredPosition>,
    always_on_top: bool,
) -> AppResult<()> {
    resize_window(window, frame_width, frame_height, scale)?;
    window.set_always_on_top(always_on_top)?;
    window.set_skip_taskbar(true)?;

    if let Some(position) = position {
        window.set_position(Position::Physical(PhysicalPosition::new(
            position.x, position.y,
        )))?;
    }
    clamp_to_current_monitor(window)?;
    window.show()?;
    Ok(())
}

pub fn resize_window(
    window: &WebviewWindow,
    frame_width: f64,
    frame_height: f64,
    scale: f64,
) -> AppResult<()> {
    if !frame_width.is_finite()
        || !frame_height.is_finite()
        || !scale.is_finite()
        || frame_width <= 0.0
        || frame_height <= 0.0
        || scale <= 0.0
    {
        return Err(AppError::State(
            "invalid frame dimensions or scale".to_owned(),
        ));
    }

    window.set_size(Size::Logical(LogicalSize::new(
        frame_width * scale,
        frame_height * scale,
    )))?;
    clamp_to_current_monitor(window)
}

pub fn move_by(window: &WebviewWindow, delta_x: f64, delta_y: f64) -> AppResult<MovementResult> {
    let current = window.outer_position()?;
    let size = window.outer_size()?;
    let monitor = window
        .current_monitor()?
        .or(window.primary_monitor()?)
        .ok_or_else(|| AppError::State("no monitor is available".to_owned()))?;
    let scale_factor = monitor.scale_factor();
    let work_area = monitor.work_area();

    let requested_x = current.x + (delta_x * scale_factor).round() as i32;
    let requested_y = current.y + (delta_y * scale_factor).round() as i32;

    let result = clamp_within_work_area(
        requested_x,
        requested_y,
        size.width as i32,
        size.height as i32,
        WorkArea::new(
            work_area.position.x,
            work_area.position.y,
            work_area.size.width as i32,
            work_area.size.height as i32,
        ),
    );

    window.set_position(Position::Physical(PhysicalPosition::new(
        result.x, result.y,
    )))?;

    Ok(result)
}

pub fn clamp_to_current_monitor(window: &WebviewWindow) -> AppResult<()> {
    let current = window.outer_position()?;
    let size = window.outer_size()?;
    let monitor = window
        .current_monitor()?
        .or(window.primary_monitor()?)
        .ok_or_else(|| AppError::State("no monitor is available".to_owned()))?;
    let work_area = monitor.work_area();

    let result = clamp_within_work_area(
        current.x,
        current.y,
        size.width as i32,
        size.height as i32,
        WorkArea::new(
            work_area.position.x,
            work_area.position.y,
            work_area.size.width as i32,
            work_area.size.height as i32,
        ),
    );

    if result.x != current.x || result.y != current.y {
        window.set_position(Position::Physical(PhysicalPosition::new(
            result.x, result.y,
        )))?;
    }
    Ok(())
}

#[derive(Debug, Clone, Copy)]
struct WorkArea {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

impl WorkArea {
    fn new(x: i32, y: i32, width: i32, height: i32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }
}

/// Pure work-area clamping shared by movement and monitor clamping. Returns the
/// clamped coordinates and which work-area edges were reached. A window larger
/// than the work area collapses to the work-area origin without panicking.
fn clamp_within_work_area(
    x: i32,
    y: i32,
    window_width: i32,
    window_height: i32,
    area: WorkArea,
) -> MovementResult {
    let min_x = area.x;
    let min_y = area.y;
    let max_x = (area.x + area.width - window_width).max(min_x);
    let max_y = (area.y + area.height - window_height).max(min_y);
    let clamped_x = x.clamp(min_x, max_x);
    let clamped_y = y.clamp(min_y, max_y);

    MovementResult {
        x: clamped_x,
        y: clamped_y,
        hit_left: clamped_x <= min_x,
        hit_right: clamped_x >= max_x,
        hit_top: clamped_y <= min_y,
        hit_bottom: clamped_y >= max_y,
    }
}

#[cfg(test)]
mod tests {
    use super::{clamp_within_work_area, WorkArea};

    // A 1920x1080 primary monitor with a 192x208 pet window.
    const AREA_W: i32 = 1920;
    const AREA_H: i32 = 1080;
    const WIN_W: i32 = 192;
    const WIN_H: i32 = 208;

    fn clamp(x: i32, y: i32) -> super::MovementResult {
        clamp_within_work_area(x, y, WIN_W, WIN_H, WorkArea::new(0, 0, AREA_W, AREA_H))
    }

    #[test]
    fn normal_position_is_not_modified() {
        let result = clamp(500, 400);
        assert_eq!((result.x, result.y), (500, 400));
        assert!(!result.hit_left && !result.hit_right);
        assert!(!result.hit_top && !result.hit_bottom);
    }

    #[test]
    fn left_edge_collision_is_clamped() {
        let result = clamp(-50, 400);
        assert_eq!(result.x, 0);
        assert!(result.hit_left);
        assert!(!result.hit_right);
    }

    #[test]
    fn right_edge_collision_is_clamped() {
        let result = clamp(5000, 400);
        assert_eq!(result.x, AREA_W - WIN_W); // 1728
        assert!(result.hit_right);
        assert!(!result.hit_left);
    }

    #[test]
    fn top_edge_is_limited_to_work_area() {
        let result = clamp(500, -50);
        assert_eq!(result.y, 0);
        assert!(result.hit_top);
        assert!(!result.hit_bottom);
    }

    #[test]
    fn bottom_edge_is_limited_to_work_area() {
        let result = clamp(500, 5000);
        assert_eq!(result.y, AREA_H - WIN_H); // 872
        assert!(result.hit_bottom);
        assert!(!result.hit_top);
    }

    #[test]
    fn offscreen_restored_position_is_pulled_back_in() {
        let result = clamp(-9999, -9999);
        assert_eq!((result.x, result.y), (0, 0));
        assert!(result.hit_left && result.hit_top);
    }

    #[test]
    fn window_larger_than_work_area_does_not_panic() {
        let result =
            clamp_within_work_area(500, 500, 2000, 2000, WorkArea::new(0, 0, AREA_W, AREA_H));
        assert_eq!((result.x, result.y), (0, 0));
    }

    #[test]
    fn secondary_monitor_origin_is_respected() {
        // Work area starting at (100, 50): a position above/left of it is clamped
        // to the monitor origin, not to (0, 0).
        let area = clamp_within_work_area(50, 30, 100, 100, WorkArea::new(100, 50, 800, 600));
        assert_eq!((area.x, area.y), (100, 50));
        assert!(area.hit_left && area.hit_top);

        let inside = clamp_within_work_area(300, 200, 100, 100, WorkArea::new(100, 50, 800, 600));
        assert_eq!((inside.x, inside.y), (300, 200));
        assert!(!inside.hit_left && !inside.hit_top);
    }
}
