#!/bin/bash
set -e
cd backend/portal_erp_jobs_api
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
exec gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 src.main:app

