"""Restore an authorized local-data bundle into an EMPTY local MySQL database.

Never drops/replaces tables or existing uploaded files. SQL and business files belong
in an access-controlled private data repository, not the public source repository.
"""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import importlib.util
import json
import os
import re
import shutil
import socket
import subprocess
import tarfile


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--project', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--database', default='synera_local', help='Must be new or empty; defaults to the local application database.')
    parser.add_argument('--config', type=Path, help='MySQL client defaults file; never pass a password on the command line.')
    parser.add_argument('--mysql-bin', type=Path, help='Directory containing the MySQL client executable.')
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    bundle, project = args.bundle.resolve(), args.project.resolve()
    if not (project / 'backend/pom.xml').is_file():
        raise RuntimeError('Project must point to the SYNERA source root.')
    if not re.fullmatch(r'[a-zA-Z][a-zA-Z0-9_]{0,63}', args.database) or args.database.lower() in {'mysql', 'sys', 'information_schema', 'performance_schema'}:
        raise RuntimeError('Unsafe database name.')
    manifest = json.loads((bundle / 'manifest.json').read_text(encoding='utf-8-sig'))
    sql, archive = bundle / 'database.sql', bundle / 'files.tar.gz'
    if digest(sql) != manifest['sqlSha256'] or digest(archive) != manifest['filesSha256']:
        raise RuntimeError('Bundle hash mismatch. No data was changed.')
    file_map = {f['path']: f for f in manifest['files']}
    if len(file_map) != len(manifest['files']):
        raise RuntimeError('Duplicate file path in manifest.')
    with tarfile.open(archive, 'r:gz') as tar:
        members = tar.getmembers()
        names = [member.name for member in members]
        if len(set(names)) != len(names) or set(names) != set(file_map):
            raise RuntimeError('Archive files differ from manifest.')
        for member in members:
            parts = PurePosixPath(member.name).parts
            if not member.isfile() or len(parts) < 3 or parts[0] != '.data' or parts[1] not in {'uploads', 'exports'} or '..' in parts or '\\' in member.name or ':' in member.name:
                raise RuntimeError('Unsafe archive path or file type.')
            expected = file_map[member.name]
            if member.size != expected['bytes']:
                raise RuntimeError('Archive size mismatch.')
            content = tar.extractfile(member)
            if content is None or hashlib.sha256(content.read()).hexdigest() != expected['sha256']:
                raise RuntimeError('Archive content hash mismatch.')
    # This exporter never needs cross-database DDL or saved authentication sessions.
    for line in sql.read_text(encoding='utf-8').splitlines():
        if re.match(r'\s*(CREATE\s+DATABASE|DROP\s+DATABASE|USE\s+)', line, re.I):
            raise RuntimeError('Cross-database SQL is not accepted.')
        if re.match(r'\s*INSERT\s+INTO\s+`?(refresh_token|otp_challenge|password_reset_token)`?\s', line, re.I):
            raise RuntimeError('Saved session/OTP/reset tokens are not accepted.')
    if args.check_only:
        print(f'Bundle verified: {len(manifest["tables"])} tables, {len(file_map)} business files. No changes made.')
        return
    if args.database == 'synera_local':
        try:
            with socket.create_connection(('127.0.0.1', 8080), timeout=1):
                raise RuntimeError('Stop the local application before restoring. No data was changed.')
        except (ConnectionRefusedError, TimeoutError, OSError):
            pass
    for directory in ['uploads', 'exports']:
        target = project / 'backend/.data' / directory
        if target.is_symlink() or (hasattr(target, 'is_junction') and target.is_junction()):
            raise RuntimeError('Business-file destination must not be a link.')
        if target.exists() and any(target.rglob('*')):
            raise RuntimeError('Existing uploads/exports found. Restore only into a new project.')
    config = (args.config or project / '.tools/mysql84/client.ini').resolve()
    mysql_bin = args.mysql_bin
    if mysql_bin is None:
        candidates = sorted((project / '.tools/mysql84').glob('mysql-8.4*-winx64/bin'))
        mysql_bin = candidates[-1] if candidates else None
    client = str(mysql_bin / ('mysql.exe' if os.name == 'nt' else 'mysql')) if mysql_bin else shutil.which('mysql')
    if not client or not config.is_file():
        raise RuntimeError('Initialize the local MySQL tools and client config first; see docs/LOCAL-DATA.md.')
    spec = importlib.util.spec_from_file_location('synera_data_transfer', Path(__file__).with_name('prepare-shared-test.py'))
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    helper.MYSQL = Path(client).parent
    helper.CONFIG = config
    hidden = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
    command = [client, '--defaults-extra-file=' + str(config), '--default-character-set=utf8mb4', '--batch', '--binary-as-hex']
    def query(text):
        result = subprocess.run(command, input=text.encode(), capture_output=True, creationflags=hidden)
        if result.returncode:
            raise RuntimeError('MySQL preflight failed. No table was replaced.')
        return result.stdout
    count = int(query("SELECT COUNT(*) FROM information_schema.tables WHERE TABLE_SCHEMA='" + args.database + "';").splitlines()[-1])
    if count:
        raise RuntimeError('Target database is not empty. Refusing to overwrite existing data.')
    data_root = project / 'backend/.data'
    if data_root.is_symlink() or (hasattr(data_root, 'is_junction') and data_root.is_junction()):
        raise RuntimeError('Data destination must not be a link.')
    query('CREATE DATABASE IF NOT EXISTS `' + args.database + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;')
    with sql.open('rb') as stream:
        result = subprocess.run(command + ['--database=' + args.database], stdin=stream, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, creationflags=hidden)
    if result.returncode:
        data_root.mkdir(parents=True, exist_ok=True)
        (data_root / 'restore-error.log').write_bytes(result.stderr)
        raise RuntimeError('Import failed. No cleanup/drop was performed; inspect backend/.data/restore-error.log. Use a new empty database for another attempt.')
    if helper.metadata(args.database) != sorted(manifest['tables']):
        raise RuntimeError('Restored table list differs from manifest.')
    if helper.fingerprints(args.database, sorted(manifest['tables'])) != manifest['tables']:
        raise RuntimeError('Restored database content differs from snapshot.')
    with tarfile.open(archive, 'r:gz') as tar:
        for member in tar.getmembers():
            target = project / 'backend' / member.name
            if not target.resolve().is_relative_to(data_root.resolve()):
                raise RuntimeError('File destination escaped the data directory.')
            if target.exists():
                raise RuntimeError('A destination file already exists; refusing overwrite.')
            target.parent.mkdir(parents=True, exist_ok=True)
            with tar.extractfile(member) as source, target.open('xb') as dest:
                shutil.copyfileobj(source, dest)
            if digest(target) != file_map[member.name]['sha256']:
                raise RuntimeError('Restored file hash differs from manifest.')
    print(f'Restored and verified {len(manifest["tables"])} tables and {len(file_map)} business files. Existing databases were not replaced; sessions/OTP/reset tokens remain empty.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, KeyError, ValueError) as error:
        raise SystemExit(str(error))
