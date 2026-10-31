#!/bin/sh
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-SQL
	CREATE DATABASE brightloop_test OWNER "$POSTGRES_USER";
SQL
