-- Configuración empresa por defecto
INSERT INTO configuracion (id, company_name, ruc, address, phone, series, next_number)
VALUES (1, 'ES PONJAS MAQUI MARY', '10456789012', 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO', '(51) 949 446 676', 'F001', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sunat_config (id, ruc, razon_social, nombre_comercial, address, provincia, departamento, distrito, ubigeo, series_factura, series_boleta)
VALUES (1, '10456789012', 'ES PONJAS MAQUI MARY', 'MAQUI MARY', 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO', 'LIMA', 'LIMA', 'LURIGANCHO', '150103', 'F001', 'B001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sunat_config (id, series_guia, next_number_guia, apisunat_environment)
VALUES (1, 'T001', 1, 'sandbox')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_config (id, settings)
VALUES (1, '{
  "cintillo_timer_minutos": 5,
  "audio_bg_volumen": 0.025,
  "audio_bg_activo": true,
  "cintillo_messages": [
    {"icon": "🔥", "text": "El más vendido: Mix x10 Esponjas — desde S/ 12.00"},
    {"icon": "🇵🇪", "text": "Hecho en Perú · Fabricación propia"},
    {"icon": "⭐", "text": "5.0 estrellas · Más de 12,800 clientes"}
  ]
}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO zonas_delivery (nombre, distancia_min, distancia_max, tarifa, tiempo_estimado) VALUES
  ('Recojo en tienda',     0,    2.5,  0.00, 'Recojo en almacén — sin costo'),
  ('Zona 1 — Muy cercano', 2.5,  6.0,  7.00, 'Mismo día'),
  ('Zona 2 — Cercano',     6.0, 10.5, 12.00, 'Mismo día'),
  ('Zona 3 — Este Lima',  10.5, 14.5, 17.00, '1 día hábil'),
  ('Zona 4 — Centro Lima',14.5, 18.5, 22.00, '1 día hábil'),
  ('Zona 5 — Lima Norte/Moderna', 18.5, 23.5, 28.00, '1-2 días hábiles'),
  ('Zona 6 — Lima Sur/Callao',   23.5, 30.0, 33.00, '2 días hábiles'),
  ('Zona 7 — Periferia',  30.0, 37.5, 40.00, '2-3 días hábiles'),
  ('Zona 8 — Sur lejano', 37.5, NULL, 48.00, '3 días hábiles')
ON CONFLICT DO NOTHING;

INSERT INTO productos (name, description, price, category, color_info) VALUES
  ('Esponja Multiuso Amarilla', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Amarillo'),
  ('Esponja Multiuso Verde', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Verde'),
  ('Esponja Multiuso Roja', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Rojo'),
  ('Esponja Multiuso Azul', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Azul'),
  ('Esponja Multiuso Celeste', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Celeste'),
  ('Esponja Multiuso Naranja', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Naranja'),
  ('Esponja Multiuso Rosada', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Rosado'),
  ('Esponja Multiuso Blanca', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Blanco'),
  ('Esponja de Acero Fino', 'Fibra de acero para limpieza profunda', 2.00, 'Acero', 'Gris'),
  ('Esponja de Acero Grueso', 'Fibra de acero resistente para superficies duras', 2.50, 'Acero', 'Gris'),
  ('Esponja Doble Uso Amarilla', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Amarillo'),
  ('Esponja Doble Uso Verde', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Verde'),
  ('Esponja Doble Uso Roja', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Rojo'),
  ('Esponja Doble Uso Azul', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Azul'),
  ('Mix x10 Esponjas Colores', 'Paquete variado de 10 esponjas multiuso', 12.00, 'Paquetes', 'Variado'),
  ('Pack x6 Doble Uso', 'Pack de 6 esponjas doble uso variadas', 13.00, 'Paquetes', 'Variado'),
  ('Pack x12 Esponjas Acero', 'Pack de 12 esponjas de acero', 20.00, 'Paquetes', 'Gris')
ON CONFLICT DO NOTHING;
