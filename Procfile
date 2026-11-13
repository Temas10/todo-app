# Render / Railway / Heroku / Fly.io
# The platform provides $PORT — uvicorn binds to it.
web: gunicorn app.main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000}

# Local development (alternative):
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
