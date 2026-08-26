"""Run build_xlsx.py with Workbook.save patched to write-then-rename."""
import os
import runpy
from openpyxl import Workbook

_orig_save = Workbook.save
def safe_save(self, filename):
    path = str(filename)
    if os.path.isabs(path):
        d, f = os.path.split(path)
    else:
        d, f = os.path.split(os.path.abspath(path))
    tmp = os.path.join(d, "_tmp_" + f)
    _orig_save(self, tmp)
    os.rename(tmp, path)

Workbook.save = safe_save
runpy.run_path("build_xlsx.py", run_name="__main__")
