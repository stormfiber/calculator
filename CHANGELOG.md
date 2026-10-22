# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-10-22

### Added

* Native Android app built with Capacitor (`com.stormfiber.calculator`), published
  on GitHub Releases and F-Droid
* Font Awesome is bundled with the app, so the calculator works completely offline
* Launcher icon, splash screens and F-Droid/store graphics generated from a single
  brand definition (`tools/`)
* GitHub Actions workflows for continuous integration and for building signed
  release APKs
* MIT license file

### Changed

* New user interface: the app is drawn edge to edge, the header was removed and
  the keypad now uses the standard calculator layout with big, touch friendly keys
* The app keeps exactly the same size in every mode (basic, scientific, history
  and settings) and no longer needs to scroll
* The result shrinks automatically when it gets long
* Long press AC clears the whole calculation
* The app is drawn behind the status bar and the gesture bar and adapts to
  notches and rounded corners

* Web assets are now built with relative paths so that the same build works on
  GitHub Pages and inside the Android WebView
* Source maps are no longer included in the Android build
