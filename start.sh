#!/bin/bash
cd backend/portal_erp_jobs_api
pip install -r requirements.txt
gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 src.main:app

