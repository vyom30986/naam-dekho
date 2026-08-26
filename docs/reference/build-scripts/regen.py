"""Regenerate missing files using write-then-rename to work around orphan inodes."""
import os
import builtins
import runpy

_orig_open = builtins.open
def safe_open(file, mode="r", *args, **kwargs):
    if "w" in mode or "a" in mode or "x" in mode:
        path = str(file)
        if os.path.isabs(path):
            d, f = os.path.split(path)
        else:
            d, f = os.path.split(os.path.abspath(path))
        tmp = os.path.join(d, "_tmp_" + f)
        # Open tmp file, wrap to rename on close
        handle = _orig_open(tmp, mode, *args, **kwargs)
        orig_close = handle.close
        def _close():
            orig_close()
            try:
                os.rename(tmp, path)
            except FileNotFoundError:
                pass  # path didn't exist yet — rename target gone is fine
        handle.close = _close
        # Also wrap __exit__ for context-manager use
        if hasattr(handle, '__exit__'):
            orig_exit = handle.__exit__
            def _exit(exc_type, exc_val, exc_tb):
                r = orig_exit(exc_type, exc_val, exc_tb)
                try:
                    os.rename(tmp, path)
                except FileNotFoundError:
                    pass
                return r
            handle.__exit__ = _exit
        return handle
    return _orig_open(file, mode, *args, **kwargs)

builtins.open = safe_open

# Now run each build script
for script in ["build_policy_pages.py", "build_xlsx.py"]:
    print(f"\n=== Running {script} ===")
    try:
        runpy.run_path(script, run_name="__main__")
    except SystemExit:
        pass
    except Exception as e:
        print(f"ERROR: {e}")

