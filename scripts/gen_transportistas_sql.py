import pandas as pd

SCRIPTS_DIR = r'D:\proyectos_opencode\projects\Maqui-Mary\scripts'

df = pd.read_excel(f'{SCRIPTS_DIR}\\base_tranporstistas_publicos.xlsx', engine='openpyxl', dtype=str)
df = df.fillna('')

lines = ['INSERT INTO transportistas (nombres, apellidos, dni, licencia_conducir, numero_placa, activo, modalidad, ruc, numero_registro_mtc, direccion, codigos_mtc, created_at, updated_at) VALUES']
values = []

for _, row in df.iterrows():
    razon = row['RAZON_SOCIAL'].strip()
    # Limpiar caracteres especiales problemáticos
    razon = razon.replace('\u201c', '').replace('\u201d', '').replace('\u2018', '').replace('\u2019', '')
    razon = razon.replace("'", "''")
    ruc = str(int(float(row['RUC_SUNAT']))).strip()
    tipo = row.get('TIPO_CONTRIBUYENTE', '').strip()
    address = row['DIRECCION_FISCAL'].strip()
    if address == '-':
        address = ''
    address = address.replace("'", "''")
    
    codigos = row.get('CODIGOS_MTC', '').strip()
    if not codigos or codigos in ('', '-', 'SIN REGISTRO MTC'):
        pref_mtc, all_mtc = '', ''
    else:
        codes = [c.strip() for c in codigos.split('|')]
        all_mtc = ' | '.join(codes)
        cng = [c for c in codes if 'CNG' in c]
        pref_mtc = cng[0] if cng else codes[0]
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
            dni_val = ruc[2:10]  # 8 dígitos del DNI
            dni_sql = f"'{dni_val}'"
    else:
        nombres = razon
        apellidos = '-'
        dni_sql = 'NULL'
    
    values.append(f"('{nombres}', '{apellidos}', {dni_sql}, '', '', true, 'publico', '{ruc}', '{pref_mtc}', '{address}', '{all_mtc}', NOW(), NOW())")

sql = ',\n'.join(values) + ';'
lines.append(sql)

output_path = f'{SCRIPTS_DIR}\\insert_transportistas.sql'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f'SQL generado: {output_path}')
print(f'Total registros: {len(values)}')
