-- Agregar columna codigo a clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo text;

-- Agregar columna codigo a transportistas
ALTER TABLE transportistas ADD COLUMN IF NOT EXISTS codigo text;

-- Agregar columna codigo a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS codigo text;

-- Actualizar clientes con codigos secuenciales
UPDATE clientes SET codigo = 'CL-' || LPAD(id::text, 5, '0');

-- Actualizar transportistas con codigos secuenciales (ordenados por id)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn
  FROM transportistas
)
UPDATE transportistas t
SET codigo = 'TR-' || LPAD(n.rn::text, 5, '0')
FROM numbered n
WHERE t.id = n.id;

-- Actualizar profiles con codigos secuenciales (ordenados por created_at)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM profiles
)
UPDATE profiles p
SET codigo = 'US-' || LPAD(n.rn::text, 5, '0')
FROM numbered n
WHERE p.id = n.id;

-- Verificar resultados
SELECT 'clientes' as tabla, COUNT(*) as total FROM clientes WHERE codigo IS NOT NULL
UNION ALL
SELECT 'transportistas', COUNT(*) FROM transportistas WHERE codigo IS NOT NULL
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles WHERE codigo IS NOT NULL;
