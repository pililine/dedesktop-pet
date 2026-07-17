// Hide the console window on Windows release builds. Without this attribute
// the app links as a console program, so launching the installed exe opens a
// blank black terminal window alongside the pet.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    desktop_pet_lib::run();
}
