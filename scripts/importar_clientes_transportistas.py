import pandas as pd
import subprocess
import json
import os
import tempfile

SCRIPTS_DIR = r'D:\proyectos_opencode\projects\Maqui-Mary\scripts'
WEB_DIR = r'D:\proyectos_opencode\projects\Maqui-Mary\web'

def run_sql(sql, description=""):
    """Execute SQL via temp file"""
    if description:
        print(f"  {description}...", end=' ', flush=True)
    
    # Write to temp file
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='utf-8')
    tmp.write(sql)
    tmp.close()
    
    try:
        result = subprocess.run(
            ['npx.cmd', 'supabase', 'db', 'query', '--linked', f'--file={tmp.name}'],
            capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=WEB_DIR, timeout=60
        )
        if result.returncode != 0:
            print(f"ERROR: {result.stderr[:200]}")
            return None
        try:
            data = json.loads(result.stdout) if result.stdout.strip() else []
            print(f"OK ({len(data) if isinstance(data, list) else 'done'})")
            return data
        except:
            print(f"OK")
            return result.stdout
    finally:
        os.unlink(tmp.name)

def run_sql_direct(sql, description=""):
    """Execute SQL as direct argument (for simple statements)"""
    if description:
        print(f"  {description}...", end=' ', flush=True)
    result = subprocess.run(
        ['npx.cmd', 'supabase', 'db', 'query', '--linked', sql],
        capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=WEB_DIR, timeout=60
    )
    if result.returncode != 0:
        print(f"ERROR: {result.stderr[:200]}")
        return None
    try:
        data = json.loads(result.stdout) if result.stdout.strip() else []
        print(f"OK ({len(data) if isinstance(data, list) else 'done'})")
        return data
    except:
        print(f"OK")
        return result.stdout

# ============================================================
# 1. DELETE existing data (SOLO clientes y transportistas publicos)
# ============================================================
print("PASO 1: Eliminando datos existentes...")
run_sql("DELETE FROM clientes;", "clientes")
run_sql("DELETE FROM transportistas WHERE modalidad = 'publico';", "transportistas publicos")
run_sql_direct("ALTER SEQUENCE transportistas_id_seq RESTART WITH 1;", "reset transportistas seq")
run_sql_direct("ALTER SEQUENCE clientes_id_seq RESTART WITH 1;", "reset clientes seq")

# ============================================================
# 2. IMPORT CLIENTES
# ============================================================
print("\nPASO 2: Importando clientes...")

df = pd.read_excel(f'{SCRIPTS_DIR}\\base_clientes.xlsx', engine='openpyxl', dtype=str)
df = df.fillna('')

all_values = []
for _, row in df.iterrows():
    name = row['RAZON_SOCIAL'].strip().replace("'", "''")
    ruc = str(int(float(row['RUC_SUNAT']))).strip()
    address = row['DIRECCION_FISCAL'].strip()
    if address == '-':
        address = ''
    address = address.replace("'", "''")
    
    dni_sql = 'NULL'
    if ruc.startswith('10') and len(ruc) == 11:
        dni_sql = f"'{ruc[2:]}'"
    
    all_values.append(f"('{name}', '{ruc}', '6', '{address}', {dni_sql}, '', NOW(), NOW())")

# Insert all at once
sql = "INSERT INTO clientes (name, num_documento, tipo_documento, address, dni, notas, created_at, updated_at) VALUES\n" + ",\n".join(all_values) + ";"
run_sql(sql, f"{len(all_values)} clientes")
run_sql_direct("SELECT COUNT(*) FROM clientes;", "verificar")

# ============================================================
# 3. IMPORT TRANSPORTISTAS PUBLICOS
# ============================================================
print("\nPASO 3: Importando transportistas públicos...")

df = pd.read_excel(f'{SCRIPTS_DIR}\\base_tranporstistas_publicos.xlsx', engine='openpyxl', dtype=str)
df = df.fillna('')

def get_mtc(codigos_str):
    if not codigos_str or codigos_str.strip() in ('', '-', 'SIN REGISTRO MTC'):
        return '', ''
    codes = [c.strip() for c in codigos_str.split('|')]
    all_codes = ' | '.join(codes)
    cng = [c for c in codes if 'CNG' in c]
    preferred = cng[0] if cng else codes[0]
    return preferred, all_codes

all_values = []
for _, row in df.iterrows():
    razon = row['RAZON_SOCIAL'].strip().replace("'", "''")
    ruc = str(int(float(row['RUC_SUNAT']))).strip()
    tipo = row.get('TIPO_CONTRIBUYENTE', '').strip()
    address = row['DIRECCION_FISCAL'].strip()
    if address == '-':
        address = ''
    address = address.replace("'", "''")
    
    pref_mtc, all_mtc = get_mtc(row.get('CODIGOS_MTC', '').strip())
    pref_mtc = pref_mtc.replace("'", "''")
    all_mtc = all_mtc.replace("'", "''")
    
    if tipo == 'PERSONA NATURAL CON NEGOCIO':
        parts = razon.split()
        if len(parts) >= 4:
            apellidos = ' '.join(parts[:2])
            nombres = ' '.join(parts[2:])
        elif len(parts) == 3:
            apellidos = ' '.join(parts[:2])
            nombres = parts[2]
        elif len(parts) == 2:
            apellidos = parts[0]
            nombres = parts[1]
        else:
            apellidos = '-'
            nombres = razon
        
        dni_sql = 'NULL'
        if ruc.startswith('10') and len(ruc) == 11:
            dni_sql = f"'{ruc[2:]}'"
    else:
        nombres = razon
        apellidos = '-'
        dni_sql = 'NULL'
    
    all_values.append(
        f"('{nombres}', '{apellidos}', {dni_sql}, '', '', true, "
        f"'publico', '{ruc}', '{pref_mtc}', '{address}', '{all_mtc}', NOW(), NOW())"
    )

sql = ("INSERT INTO transportistas (nombres, apellidos, dni, licencia_conducir, "
       "numero_placa, activo, modalidad, ruc, numero_registro_mtc, direccion, codigos_mtc, created_at, updated_at) VALUES\n") + ",\n".join(all_values) + ";"
run_sql(sql, f"{len(all_values)} transportistas publicos")
run_sql_direct("SELECT id, nombres, apellidos, ruc, direccion, numero_registro_mtc, codigos_mtc FROM transportistas ORDER BY id;", "ver datos")

print("\n¡IMPORTACIÓN COMPLETADA!")
