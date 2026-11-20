"""Create a private, restorable copy of the local MySQL database and business files.

Stop the main application first so SQL, hashes and files describe the same moment.
No credentials, SQL dumps or uploads belong in the PUBLIC source repository/build image.
Use a separately access-controlled private repository for an authorized data snapshot.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import os
import re
import secrets
import subprocess
import tarfile
import traceback
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
MYSQL = ROOT / '.tools/mysql84/mysql-8.4.13-winx64/bin'
CONFIG = ROOT / '.tools/mysql84/client.ini'
SOURCE = 'synera_local'
SESSION_TABLES = {'refresh_token', 'otp_challenge', 'password_reset_token'}
HIDDEN = getattr(subprocess, 'CREATE_NO_WINDOW', 0)


def run_client(database, query):
    return subprocess.run(
        [str(MYSQL / ('mysql.exe' if os.name == 'nt' else 'mysql')), '--defaults-extra-file=' + str(CONFIG),
         '--default-character-set=utf8mb4', '--batch', '--binary-as-hex',
         '--database=' + database],
        input=query.encode('utf-8'), capture_output=True, check=True, creationflags=HIDDEN,
    ).stdout


def metadata(database):
    raw = run_client(database, "SELECT TABLE_NAME FROM information_schema.tables "
                     "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;")
    return raw.decode('utf-8').splitlines()[1:]


def fingerprints(database, tables):
    result = {}
    for table in tables:
        if not re.fullmatch(r'[a-zA-Z0-9_]+', table):
            raise ValueError('Invalid table name')
        keys = run_client(database, f"SHOW INDEX FROM `{table}` WHERE Key_name='PRIMARY';")
        primary = [line.split('\t')[4] for line in keys.decode('utf-8').splitlines()[1:]]
        if not primary:
            columns = run_client(database, f'SHOW COLUMNS FROM `{table}`;')
            primary = [line.split('\t')[0] for line in columns.decode('utf-8').splitlines()[1:]]
        ordering = ','.join('`' + key + '`' for key in primary)
        rows = run_client(database, "SET time_zone='+00:00'; "
                          + f'SELECT * FROM `{table}` ORDER BY {ordering};')
        count = int(run_client(database, f'SELECT COUNT(*) FROM `{table}`;').splitlines()[-1])
        # Public servers start new login/OTP sessions; existing session hashes are not copied.
        if table in SESSION_TABLES:
            rows = b''
            count = 0
        result[table] = {'rows': count, 'sha256': hashlib.sha256(rows).hexdigest()}
    return result


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def export(folder, verify):
    try:
        with urllib.request.urlopen('http://127.0.0.1:8080/actuator/health', timeout=2):
            raise RuntimeError('Stop the owned main runtime before taking the transfer snapshot.')
    except (OSError, urllib.error.URLError):
        pass
    folder.mkdir(parents=True, exist_ok=False)
    sql = folder / 'database.sql'
    base = [str(MYSQL / ('mysqldump.exe' if os.name == 'nt' else 'mysqldump')), '--defaults-extra-file=' + str(CONFIG),
            '--default-character-set=utf8mb4', '--single-transaction', '--hex-blob',
            '--set-gtid-purged=OFF', '--no-tablespaces', '--skip-add-drop-table', '--skip-dump-date']
    with sql.open('wb') as output:
        subprocess.run(base + ['--routines', '--events', '--triggers']
                       + ['--ignore-table=' + SOURCE + '.' + t for t in sorted(SESSION_TABLES)]
                       + [SOURCE], stdout=output, stderr=subprocess.PIPE, check=True, creationflags=HIDDEN)
        subprocess.run(base + ['--no-data', '--skip-triggers', SOURCE] + sorted(SESSION_TABLES),
                       stdout=output, stderr=subprocess.PIPE, check=True, creationflags=HIDDEN)
    # Keep imported triggers, but bind their definer to the destination import account.
    # Only rewrite DDL lines; product/order text in INSERT statements stays byte-for-byte intact.
    lines = sql.read_text(encoding='utf-8').splitlines(keepends=True)
    for i, line in enumerate(lines):
        if line.startswith('/*!50003 CREATE') or line.startswith('/*!50106 CREATE'):
            lines[i] = re.sub(r'/\*!\d+\s+DEFINER=`[^`]*`@`[^`]*`\s*\*/', '', line)
        elif line.startswith('CREATE DEFINER='):
            lines[i] = re.sub(r'^CREATE DEFINER=`[^`]*`@`[^`]*`', 'CREATE', line)
    sql.write_text(''.join(lines), encoding='utf-8', newline='\n')
    archive = folder / 'files.tar.gz'
    files = []
    with tarfile.open(archive, 'w:gz') as output:
        for name in ['uploads', 'exports']:
            directory = ROOT / 'backend/.data' / name
            if not directory.exists():
                continue
            for path in sorted(directory.rglob('*')):
                if path.is_symlink():
                    raise RuntimeError('Uploaded-file snapshot must not follow symlinks')
                if path.is_file():
                    target = '.data/' + name + '/' + path.relative_to(directory).as_posix()
                    output.add(path, arcname=target, recursive=False)
                    files.append({'path': target, 'bytes': path.stat().st_size, 'sha256': digest(path)})
    tables = metadata(SOURCE)
    manifest = {'createdAtUtc': datetime.now(timezone.utc).isoformat(), 'database': SOURCE,
                'tables': fingerprints(SOURCE, tables), 'freshSessionTables': sorted(SESSION_TABLES),
                'files': files, 'sqlSha256': digest(sql), 'filesSha256': digest(archive),
                'schemaVersion': 121, 'cloudImported': False}
    if verify:
        destination = 'synera_deploy_verify_' + secrets.token_hex(6)
        run_client(SOURCE, f'CREATE DATABASE `{destination}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;')
        with sql.open('rb') as input_file:
            subprocess.run([str(MYSQL / ('mysql.exe' if os.name == 'nt' else 'mysql')), '--defaults-extra-file=' + str(CONFIG),
                            '--default-character-set=utf8mb4', '--database=' + destination],
                           stdin=input_file, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                           check=True, creationflags=HIDDEN)
        if metadata(destination) != tables:
            raise RuntimeError('Restored schema has different table names')
        restored = fingerprints(destination, tables)
        if restored != manifest['tables']:
            raise RuntimeError('Restored table contents differ: ' + ', '.join(
                key for key in restored if restored[key] != manifest['tables'][key]))
        count_query = "SELECT COUNT(*) FROM information_schema.triggers WHERE TRIGGER_SCHEMA=DATABASE();"
        assert run_client(SOURCE, count_query) == run_client(destination, count_query)
        manifest['localRestoreVerified'] = {'database': destination, 'tables': len(tables),
                                          'tableContentHashesMatch': True, 'triggerCountMatches': True}
    (folder / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'bundle': str(folder.relative_to(ROOT)), 'tables': len(tables),
                      'rows': sum(t['rows'] for t in manifest['tables'].values()),
                      'files': len(files), 'localRestoreVerified': bool(verify), 'cloudImported': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify-local-restore', action='store_true')
    args = parser.parse_args()
    target = ROOT / 'artifacts/deploy-private' / datetime.now().strftime('%Y%m%d-%H%M%S')
    try:
        export(target, args.verify_local_restore)
    except Exception as error:
        target.mkdir(parents=True, exist_ok=True)
        detail = traceback.format_exc()
        if isinstance(error, subprocess.CalledProcessError) and error.stderr:
            detail += '\n' + error.stderr.decode('utf-8', errors='replace')
        (target / 'error.txt').write_text(detail, encoding='utf-8')
        raise
