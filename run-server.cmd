@echo off
set PORT=8000
pushd "%~dp0"
echo Starting local server on http://localhost:%PORT% ...
echo Press Ctrl+C to stop.
python -m http.server %PORT%
popd
