"""Windows-specific input hooks — active window, keyboard, and mouse monitoring.

Uses win32gui for window tracking, pynput for keyboard/mouse pattern
detection, and psutil for process info.  Never captures raw keystrokes —
only aggregate metrics (rate, backspace ratio, inter-key intervals).
"""

from __future__ import annotations

import logging
import threading
from typing import Callable

logger = logging.getLogger(__name__)


def get_active_window() -> tuple[str, str]:
    """Return (app_name, window_title) of the foreground window.

    Returns ("", "") if detection fails.
    """
    try:
        import win32gui
        import win32process
        import psutil

        hwnd = win32gui.GetForegroundWindow()
        if not hwnd:
            return "", ""

        window_title = win32gui.GetWindowText(hwnd)
        _, pid = win32process.GetWindowThreadProcessId(hwnd)

        try:
            process = psutil.Process(pid)
            app_name = process.name().replace(".exe", "")
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            app_name = ""

        return app_name, window_title
    except Exception:
        logger.debug("Failed to get active window", exc_info=True)
        return "", ""


class KeyboardMonitor:
    """Monitors keyboard patterns without logging actual keystrokes.

    Calls on_keystroke(is_backspace: bool) for each key event.
    """

    def __init__(self, on_keystroke: Callable[[bool], None]) -> None:
        self._on_keystroke = on_keystroke
        self._listener = None
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        try:
            from pynput import keyboard

            def on_press(key):
                try:
                    is_backspace = key == keyboard.Key.backspace
                    self._on_keystroke(is_backspace)
                except Exception:
                    pass

            self._listener = keyboard.Listener(on_press=on_press)
            self._listener.daemon = True
            self._listener.start()
            logger.info("Keyboard monitor started")
        except ImportError:
            logger.warning("pynput not available — keyboard monitoring disabled")
        except Exception:
            logger.exception("Failed to start keyboard monitor")

    def stop(self) -> None:
        if self._listener:
            self._listener.stop()
            self._listener = None
            logger.info("Keyboard monitor stopped")


class MouseMonitor:
    """Monitors mouse patterns (clicks and scrolls, not position).

    Calls on_click() and on_scroll() for respective events.
    """

    def __init__(
        self,
        on_click: Callable[[], None],
        on_scroll: Callable[[], None],
    ) -> None:
        self._on_click = on_click
        self._on_scroll = on_scroll
        self._listener = None

    def start(self) -> None:
        try:
            from pynput import mouse

            def on_click(x, y, button, pressed):
                if pressed:
                    try:
                        self._on_click()
                    except Exception:
                        pass

            def on_scroll(x, y, dx, dy):
                try:
                    self._on_scroll()
                except Exception:
                    pass

            self._listener = mouse.Listener(on_click=on_click, on_scroll=on_scroll)
            self._listener.daemon = True
            self._listener.start()
            logger.info("Mouse monitor started")
        except ImportError:
            logger.warning("pynput not available — mouse monitoring disabled")
        except Exception:
            logger.exception("Failed to start mouse monitor")

    def stop(self) -> None:
        if self._listener:
            self._listener.stop()
            self._listener = None
            logger.info("Mouse monitor stopped")
